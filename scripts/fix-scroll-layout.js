import { readFileSync, writeFileSync } from 'node:fs';

const path = 'index.html';
let html = readFileSync(path, 'utf8');

function ensureReplace(before, after, label) {
  if (html.includes(after)) return;
  if (!html.includes(before)) {
    throw new Error(`scroll layout patch target not found: ${label}`);
  }
  html = html.replace(before, after);
}

ensureReplace(
`  body.app-mode{height:100%;background:var(--bg);overflow:hidden}
  button{font-family:inherit;cursor:pointer;border:none;background:none}
  input,textarea{font-family:inherit}
  .app-shell{height:100%;min-height:100%}`,
`  body.app-mode{height:100%;height:100dvh;min-height:100%;background:var(--bg);overflow:hidden}
  button{font-family:inherit;cursor:pointer;border:none;background:none}
  input,textarea{font-family:inherit}
  .app-shell{height:100%;height:100dvh;min-height:0;display:flex;flex-direction:column}`,
  'app viewport shell'
);

ensureReplace(
`  header{height:60px;background:var(--card);border-bottom:1px solid var(--line);display:flex;align-items:center;padding:0 64px 0 20px;gap:14px}`,
`  header{height:60px;flex:0 0 60px;background:var(--card);border-bottom:1px solid var(--line);display:flex;align-items:center;padding:0 64px 0 20px;gap:14px}`,
  'app header height'
);

ensureReplace(
`  .site-footer{height:var(--footer-h);display:flex;align-items:center;justify-content:center;gap:8px;padding:0 12px;border-top:1px solid #eef1f4;background:rgba(255,255,255,.92);color:#9aa4b2;font-size:10px;line-height:1.35;white-space:nowrap;overflow:hidden}`,
`  .site-footer{height:var(--footer-h);flex:0 0 var(--footer-h);display:flex;align-items:center;justify-content:center;gap:8px;padding:0 12px;border-top:1px solid #eef1f4;background:rgba(255,255,255,.92);color:#9aa4b2;font-size:10px;line-height:1.35;white-space:nowrap;overflow:hidden}`,
  'app footer height'
);

ensureReplace(
`    .main{flex-direction:column;height:calc(100% - 60px - 46px - var(--footer-h))}`,
`    .main{flex-direction:column;height:auto;min-height:0}`,
  'mobile main height'
);

ensureReplace(
`  .main{display:flex;height:calc(100% - 60px - var(--footer-h));min-height:0}`,
`  .main{display:flex;flex:1 1 auto;height:auto;min-height:0}`,
  'main flex height'
);

writeFileSync(path, html);
console.log('Patched app scroll layout');
