#!/usr/bin/env node
// ────────────────────────────────────────────────────────────
// Neutralino 바이너리 다운로드 + 추출
// 사용법: npm run setup | Vercel 빌드에서도 자동 실행
// ────────────────────────────────────────────────────────────

import { mkdirSync, existsSync, statSync, writeFileSync, chmodSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';
import { unzipSync } from 'fflate';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'runtimes');
const VERSION = 'v6.8.0';
const ZIP_URL = `https://github.com/neutralinojs/neutralinojs/releases/download/${VERSION}/neutralinojs-${VERSION}.zip`;

const NEEDED = [
  'neutralino-win_x64.exe',
  'neutralino-mac_arm64',
  'neutralino-mac_x64',
  'neutralino-linux_x64',
];
const MIN_SIZE = 1024 * 1024; // 1MB — placeholder 파일은 9바이트

function downloadToBuffer(url, redirects = 0) {
  if (redirects > 10) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'mallo-setup/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadToBuffer(res.headers.location, redirects + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} — ${url}`));
        return;
      }
      const chunks = [];
      let received = 0;
      const total = parseInt(res.headers['content-length'] || '0', 10);
      res.on('data', (chunk) => {
        chunks.push(chunk);
        received += chunk.length;
        if (total && process.stdout.isTTY) {
          const pct = Math.round(received / total * 100);
          process.stdout.write(`\r  ${(received/1024/1024).toFixed(1)}/${(total/1024/1024).toFixed(1)} MB (${pct}%)`);
        }
      });
      res.on('end', () => {
        if (process.stdout.isTTY) process.stdout.write('\n');
        resolve(Buffer.concat(chunks));
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function main() {
  console.log(`\n🚀 Neutralino ${VERSION} 바이너리 설치`);
  console.log(`📁 저장 위치: ${OUT_DIR}\n`);
  mkdirSync(OUT_DIR, { recursive: true });

  const allReal = NEEDED.every(f => {
    const p = join(OUT_DIR, f);
    return existsSync(p) && statSync(p).size >= MIN_SIZE;
  });
  if (allReal) { console.log('✅ 바이너리 이미 설치됨 — 건너뜀\n'); return; }

  console.log(`⬇  ZIP 다운로드: neutralinojs-${VERSION}.zip`);
  let zipBuf;
  try {
    zipBuf = await downloadToBuffer(ZIP_URL);
    console.log(`   ✅ ${(zipBuf.length/1024/1024).toFixed(1)} MB\n`);
  } catch(e) { console.error('❌ 다운로드 실패:', e.message); process.exit(1); }

  console.log('📦 압축 해제...');
  let unzipped;
  try { unzipped = unzipSync(new Uint8Array(zipBuf)); }
  catch(e) { console.error('❌ ZIP 파싱 실패:', e.message); process.exit(1); }

  let saved = 0;
  for (const name of NEEDED) {
    const data = unzipped[name]
      ?? Object.entries(unzipped).find(([k]) => k === name || k.endsWith('/'+name))?.[1];
    if (data) {
      const dest = join(OUT_DIR, name);
      writeFileSync(dest, Buffer.from(data));
      if (!name.endsWith('.exe')) try { chmodSync(dest, 0o755); } catch {}
      console.log(`  ✅ ${name} (${(data.length/1024/1024).toFixed(1)} MB)`);
      saved++;
    } else {
      console.warn(`  ⚠  ${name} — ZIP 내에 없음`);
      console.warn(`     사용 가능한 파일: ${Object.keys(unzipped).join(', ')}`);
    }
  }
  console.log();
  if (saved < NEEDED.length) { process.exitCode = 1; return; }
  console.log('✅ 완료!\n');
}

main().catch(e => { console.error(e); process.exit(1); });
