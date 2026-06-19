// POST /api/download — 생성된 HTML → OS별 Neutralino 네이티브 앱 ZIP 패키지
// 요청: { html: string, title: string, os: "windows"|"mac-arm"|"mac-x64"|"linux" }
// 응답: application/zip (바이너리 + resources.neu + config)
//
// 추가 비용 없음: 바이너리는 Vercel 정적 파일(/runtimes/)에서 로드,
// ZIP 조립은 Edge Function에서 처리 (기존 Vercel 무료 플랜 범위 내)

import { zipSync, strToU8 } from 'fflate';
import { json, getUser } from './_lib.js';

export const config = { runtime: 'edge' };

const NEUTRALINO_VERSION = 'v6.8.0';

const BINARY_INFO = {
  windows:  { file: 'neutralino-win_x64.exe', exeName: 'app.exe'  },
  'mac-arm':{ file: 'neutralino-mac_arm64',   exeName: 'app'      },
  'mac-x64':{ file: 'neutralino-mac_x64',     exeName: 'app'      },
  linux:    { file: 'neutralino-linux_x64',   exeName: 'app'      },
};

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: '허용되지 않은 요청이에요' }, 405);

  const user = await getUser(req);
  if (!user) return json({ error: '로그인이 필요해요' }, 401);

  let body;
  try { body = await req.json(); } catch { return json({ error: '요청 형식이 잘못됐어요' }, 400); }

  const { html, title = '내 도구', os = 'windows' } = body || {};
  if (!html || typeof html !== 'string') return json({ error: 'HTML 내용이 없어요' }, 400);

  const info = BINARY_INFO[os];
  if (!info) return json({ error: '지원하지 않는 OS예요' }, 400);

  const host = req.headers.get('host') || '';
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  const binaryUrl = `${proto}://${host}/runtimes/${info.file}`;

  let binBytes;
  try {
    const bRes = await fetch(binaryUrl);
    if (!bRes.ok) {
      return json({
        error: `런타임 파일을 찾을 수 없어요 (${info.file}). GitHub에 올린 뒤 Vercel 재배포가 필요해요.`,
        hint: 'npm run setup 후 git push 하세요',
      }, 500);
    }
    binBytes = new Uint8Array(await bRes.arrayBuffer());
  } catch (e) {
    return json({ error: '런타임 로드 중 오류가 났어요' }, 500);
  }

  const resourcesNeu = zipSync({ 'index.html': strToU8(html) });

  const safeTitle = String(title || '내 도구').replace(/[<>"'&]/g, '').slice(0, 60) || '내 도구';
  const configJson = JSON.stringify({
    applicationId: 'app.mallo.tool',
    version: '1.0.0',
    defaultMode: 'window',
    documentRoot: '/',
    url: '/index.html',
    enableServer: true,
    enableNativeAPI: false,
    nativeBlockList: ['*'],
    logging: { enabled: false },
    window: { title: safeTitle, width: 1280, height: 800, resizable: true },
    modes: { window: { title: safeTitle, width: 1280, height: 800, resizable: true } },
    cli: { binaryName: 'app', resourcesPath: '/', defaultMode: 'window' },
  }, null, 2);

  const { exeName } = info;
  const readme = os === 'windows'
    ? ['[말로 앱 실행 방법 — Windows]', '', '1. 이 폴더를 원하는 곳에 놓으세요.', `2. "${exeName}" 을 더블클릭하세요.`, '3. "Windows의 PC 보호" 경고 → 추가 정보 → 그래도 실행.', '', `※ 세 파일(${exeName}, resources.neu, neutralino.config.json)이 같은 폴더에 있어야 합니다.`, '', `Neutralino Runtime: ${NEUTRALINO_VERSION}`, '만든 곳: 말로(mallo.app)'].join('\n')
    : os.startsWith('mac')
    ? ['[말로 앱 실행 방법 — macOS]', '', '1. 이 폴더를 원하는 곳에 놓으세요.', `2. chmod +x ${exeName} && ./${exeName}`, '   또는 Finder에서 우클릭 → 열기.', '', `※ 세 파일(${exeName}, resources.neu, neutralino.config.json)이 같은 폴더에 있어야 합니다.`, `Neutralino Runtime: ${NEUTRALINO_VERSION}`, '만든 곳: 말로(mallo.app)'].join('\n')
    : ['[말로 앱 실행 방법 — Linux]', '', `chmod +x ${exeName} && ./${exeName}`, '', '※ WebKitGTK 필요: sudo apt install libwebkit2gtk-4.0-37', `Neutralino Runtime: ${NEUTRALINO_VERSION}`, '만든 곳: 말로(mallo.app)'].join('\n');

  const zipOut = zipSync({
    [exeName]:                 [binBytes,        { level: 0 }],
    'resources.neu':           [resourcesNeu,    { level: 0 }],
    'neutralino.config.json':  strToU8(configJson),
    '실행방법.txt':             strToU8(readme),
  });

  const safeName = safeTitle.replace(/\s+/g, '-').replace(/[^\w가-힣-]/g, '') || 'app';
  const filename = `말로-${safeName}-${os}.zip`;

  return new Response(zipOut, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': String(zipOut.byteLength),
      'Cache-Control': 'no-store',
    },
  });
}
