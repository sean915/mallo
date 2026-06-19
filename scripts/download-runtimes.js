#!/usr/bin/env node
// ────────────────────────────────────────────────────────────
// 한 번만 실행: Neutralino 바이너리를 /runtimes/ 폴더에 저장
//   npm run setup
// ────────────────────────────────────────────────────────────

import { createWriteStream, mkdirSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = join(__dirname, '..', 'runtimes');
const VERSION   = 'v6.8.0';

const BINARIES = [
  'neutralino-win_x64.exe',
  'neutralino-mac_arm64',
  'neutralino-mac_x64',
  'neutralino-linux_x64',
];

function download(url, dest, redirects = 0) {
  if (redirects > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'mallo-setup/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, dest, redirects + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} — ${url}`));
        return;
      }
      const file = createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function fmtMB(bytes) { return (bytes / 1024 / 1024).toFixed(1) + ' MB'; }

async function main() {
  console.log('\n🚀 Neutralino ' + VERSION + ' 바이너리 다운로드');
  console.log('📁 저장 위치: ' + OUT_DIR + '\n');

  mkdirSync(OUT_DIR, { recursive: true });

  for (const bin of BINARIES) {
    const dest = join(OUT_DIR, bin);
    if (existsSync(dest)) {
      const size = statSync(dest).size;
      console.log('⏩ ' + bin + ' — 이미 있음 (' + fmtMB(size) + '), 건너뜀');
      continue;
    }
    const url = 'https://github.com/neutralinojs/neutralinojs/releases/download/' + VERSION + '/' + bin;
    process.stdout.write('⬇  ' + bin + ' 다운로드 중...');
    try {
      await download(url, dest);
      const size = statSync(dest).size;
      console.log(' ✅ (' + fmtMB(size) + ')');
    } catch (e) {
      console.log(' ❌ 실패: ' + e.message);
      process.exitCode = 1;
    }
  }

  if (!process.exitCode) {
    console.log('\n✅ 완료! 다음 단계:');
    console.log('  git add runtimes/');
    console.log('  git commit -m "feat: Neutralino 런타임 바이너리 추가"');
    console.log('  git push');
  } else {
    console.log('\n❌ 실패. 인터넷 연결 확인 후 다시 실행하세요.');
  }
}

main();
