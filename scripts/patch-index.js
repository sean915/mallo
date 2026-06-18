import { readFileSync, writeFileSync } from 'node:fs';

const path = 'index.html';
let html = readFileSync(path, 'utf8');

function replaceOnce(before, after, label) {
  if (!html.includes(before)) {
    throw new Error(`patch target not found: ${label}`);
  }
  html = html.replace(before, after);
}

replaceOnce(
`window.addEventListener('message', (e)=>{
  const d = e.data;
  if(d && d.__mallo === 'ai'){ handleAiRequest(e.source, d.id, d.prompt); return; }
  if(!(d && d.__mallo === 'data' && d.data)) return;
`,
`window.addEventListener('message', (e)=>{
  const allowedSources = [
    $('frame') && $('frame').contentWindow,
    $('vframe') && $('vframe').contentWindow,
  ].filter(Boolean);
  if(!allowedSources.includes(e.source)) return;
  const d = e.data;
  if(d && d.__mallo === 'ai'){ handleAiRequest(e.source, d.id, d.prompt); return; }
  if(!(d && d.__mallo === 'data' && d.data)) return;
`,
  'message source validation'
);

replaceOnce(
`  // 데이터 seed: 소유자=클라우드, 그 외=내 기기 로컬
  let seed = data.data || {};
  if(!isOwner){ try{ const loc = localStorage.getItem('mallo_tool_' + tid); if(loc) seed = JSON.parse(loc); }catch(e){} }
`,
`  // 데이터 seed: 소유자=클라우드, 그 외=내 기기 로컬
  let seed = isOwner ? (data.data || {}) : {};
  if(!isOwner){ try{ const loc = localStorage.getItem('mallo_tool_' + tid); if(loc) seed = JSON.parse(loc); }catch(e){} }
`,
  'shared viewer seed'
);

writeFileSync(path, html);
console.log('Patched index.html security guards');
