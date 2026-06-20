// api/download.js — Neutralino 네이티브 앱 패키저
import { zipSync, strToU8 } from 'fflate';
import { getUser } from './_lib.js';

export const config = { runtime: 'edge' };

const NEUTRALINO_VERSION = 'v6.8.0';

const BINARY_INFO = {
  windows:   { file: 'neutralino-win_x64.exe',  exeName: 'app.exe' },
  'mac-arm': { file: 'neutralino-mac_arm64',     exeName: 'app'     },
  'mac-x64': { file: 'neutralino-mac_x64',       exeName: 'app'     },
  linux:     { file: 'neutralino-linux_x64',     exeName: 'app'     },
};

export default async function handler(req) {
  if (req.method !== 'POST')
    return new Response('Method not allowed', { status: 405 });

  const user = await getUser(req);
  if (!user)
    return new Response(JSON.stringify({ error: '로그인이 필요해요' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } });

  let html, title, os;
  try { ({ html, title, os } = await req.json()); }
  catch { return new Response(JSON.stringify({ error: '잘못된 요청' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }); }

  // OS 별칭 정규화 — 프론트엔드/캐시된 구버전 호환 (win→windows, mac→mac-arm 기본)
  const OS_ALIASES = {
    win: 'windows', windows: 'windows',
    mac: 'mac-arm', 'mac-arm': 'mac-arm', 'mac-x64': 'mac-x64', 'mac-intel': 'mac-x64',
    linux: 'linux',
  };
  os = OS_ALIASES[os] || os;

  if (!html)
    return new Response(JSON.stringify({ error: '앱 코드가 없어요' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } });
  if (!BINARY_INFO[os])
    return new Response(JSON.stringify({ error: '지원하지 않는 OS' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } });

  const info = BINARY_INFO[os];

  // 바이너리 가져오기
  const host = req.headers.get('host') || 'mallo-alpha.vercel.app';
  const binaryRes = await fetch(`https://${host}/runtimes/${info.file}`);
  if (!binaryRes.ok)
    return new Response(JSON.stringify({
      error: `런타임 파일을 찾을 수 없어요 (${info.file}). GitHub에 올린 뒤 Vercel 재배포가 필요해요.`
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  const binBytes = new Uint8Array(await binaryRes.arrayBuffer());
  const exeName  = info.exeName;
  const safeTitle = (title || '내 도구').replace(/[<>:"/\\|?*]/g, '_').substring(0, 30);

  // Neutralino 설정 — resources/ 폴더 방식 (resources.neu 불필요)
  const configJson = JSON.stringify({
    applicationId: 'kr.mallo.app',
    version: '1.0.0',
    defaultMode: 'window',
    documentRoot: '/',
    url: '/',
    enableServer: true,
    enableNativeAPI: true,
    modes: {
      window: {
        title: safeTitle,
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        center: true,
        fullScreen: false,
        alwaysOnTop: false,
        enableInspector: false,
      }
    },
    cli: {
      binaryVersion: NEUTRALINO_VERSION.replace('v', ''),
      clientVersion: '5.5.0',
      resourcesPath: '/resources/',
    },
    globalVariables: {}
  }, null, 2);

  const osLabel = {
    windows:   'Windows',
    'mac-arm': 'Mac-AppleSilicon',
    'mac-x64': 'Mac-Intel',
    linux:     'Linux',
  }[os];

  const macNote = (os === 'mac-arm' || os === 'mac-x64')
    ? '\n  ⚠  처음 실행 시: 우클릭 → "열기" 선택 (보안 경고 우회)'
    : os === 'linux'
    ? '\n  chmod +x ' + exeName + ' 으로 실행 권한 부여 후 ./app 으로 실행'
    : '';

  const readme = `말로 네이티브 앱 — ${safeTitle}

📂 이 폴더 안의 파일
  ${exeName}               ← 실행파일 (더블클릭)${macNote}
  resources/index.html     ← 앱 소스 (수정 가능)
  neutralino.config.json   ← 설정 (건드리지 마세요)

▶ 실행 방법
  ${exeName} 파일을 더블클릭하면 바로 실행됩니다.

Powered by 말로 (mallo-alpha.vercel.app) & Neutralino.js ${NEUTRALINO_VERSION}
`;

  // ZIP 조립: 바이너리 + resources/index.html (파일시스템 모드)
  const zipOut = zipSync({
    [exeName]:                  [binBytes,            { level: 0 }],
    'resources/index.html':     [strToU8(html),       { level: 6 }],
    'neutralino.config.json':   [strToU8(configJson), { level: 9 }],
    '실행방법.txt':              [strToU8(readme),     { level: 9 }],
  });

  const filename = encodeURIComponent(`말로-${safeTitle}-${osLabel}.zip`);
  return new Response(zipOut, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
