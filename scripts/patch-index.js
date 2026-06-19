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

replaceOnce(
`async function shareTool(id){
  try{ await S.supabase.from('tools').update({ shared: true }).eq('id', id); }catch(e){}
  const link = location.origin + '/?t=' + id;
  try{ await navigator.clipboard.writeText(link); toast('공유 링크를 복사했어요! 붙여넣어 보내세요 🔗'); }
  catch(e){ prompt('이 링크를 복사해 공유하세요:', link); }
}
`,
`async function shareTool(id){
  let shareId = null;
  try{
    const { data: tool, error: loadError } = await S.supabase.from('tools').select('title,html').eq('id', id).single();
    if(loadError || !tool) throw loadError || new Error();
    const { data: copy, error: copyError } = await S.supabase.from('tools')
      .insert({ user_id: S.session.user.id, title: tool.title || '내 도구', html: tool.html || '', data: {}, shared: true })
      .select('id')
      .single();
    if(copyError || !copy) throw copyError || new Error();
    shareId = copy.id;
  }catch(e){ toast('공유 링크를 만들지 못했어요'); return; }
  const link = location.origin + '/?t=' + shareId;
  try{ await navigator.clipboard.writeText(link); toast('공유 링크를 복사했어요! 붙여넣어 보내세요 🔗'); }
  catch(e){ prompt('이 링크를 복사해 공유하세요:', link); }
}
`,
  'sanitized share copy'
);

replaceOnce(
`const payConfigured = ()=> !!(S.cfg && S.cfg.payStoreId && S.cfg.payChannelKey);`,
`const payConfigured = ()=> !!(S.cfg && S.cfg.payReady && S.cfg.payStoreId && S.cfg.payChannelKey);`,
  'payment readiness check'
);

writeFileSync(path, html);
console.log('Patched index.html security guards and payment readiness');
