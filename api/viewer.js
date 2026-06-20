// GET /?t=<toolId> rewrite target — shared tool viewer without owner-saved data.
import { env } from './_lib.js';

export const config = { runtime: 'edge' };

const notFoundHtml = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>도구를 찾을 수 없어요 · 말로</title></head>
<body style="font-family:Pretendard,-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;display:flex;height:100vh;align-items:center;justify-content:center;text-align:center;color:#6b7684;padding:24px;margin:0;box-sizing:border-box">
  <div>도구를 찾을 수 없어요.<br>링크가 만료됐거나 비공개 도구일 수 있어요.</div>
</body></html>`;

const page = (tool) => {
  const toolId = JSON.stringify(tool.id || '').replace(/</g, '\\u003c');
  const title = JSON.stringify(tool.title || '내 도구').replace(/</g, '\\u003c');
  const html = JSON.stringify(tool.html || '').replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(tool.title || '내 도구')} · 말로</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="manifest" href="/api/manifest?t=${encodeURIComponent(tool.id || '')}&name=${encodeURIComponent(tool.title || '내 도구')}">
<style>
  *{box-sizing:border-box}html,body{height:100%;margin:0}body{font-family:Pretendard,-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#191f28;background:#fff;overflow:hidden}
  .viewer{height:100%;display:flex;flex-direction:column}.vbar{height:50px;flex-shrink:0;display:flex;align-items:center;gap:8px;padding:0 12px;border-bottom:1px solid #e5e8eb;background:#fff}
  .vlogo{font-size:16px;font-weight:800}.vlogo b{color:#3182f6}.vtitle{flex:1;font-size:14px;font-weight:700;color:#6b7684;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .vbtn{font:700 13px/1 Pretendard,-apple-system,sans-serif;padding:8px 12px;border-radius:10px;border:0;white-space:nowrap;cursor:pointer;text-decoration:none}.vbtn.prim{background:#3182f6;color:#fff}.vbtn.ghost{color:#6b7684;background:#f2f4f6}
  iframe{flex:1;width:100%;border:0;background:#fff}
</style>
</head>
<body>
<div class="viewer">
  <div class="vbar">
    <div class="vlogo">말<b>로</b></div>
    <div class="vtitle" id="title"></div>
    <a class="vbtn ghost" href="/">편집</a>
    <a class="vbtn ghost" href="/">나도 만들기</a>
    <button class="vbtn prim" id="install">앱으로 설치</button>
  </div>
  <iframe id="toolFrame" sandbox="allow-scripts allow-modals allow-forms allow-popups"></iframe>
</div>
<script type="module">
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const TOOL_ID = ${toolId};
const TOOL_TITLE = ${title};
const TOOL_HTML = ${html};
let deferredInstall = null;
let supabase = null;
let session = null;
const frame = document.getElementById('toolFrame');

document.getElementById('title').textContent = TOOL_TITLE;
window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredInstall = e; });
if('serviceWorker' in navigator){ navigator.serviceWorker.register('/sw.js').catch(()=>{}); }

document.getElementById('install').onclick = async ()=>{
  if(deferredInstall){ deferredInstall.prompt(); try{ await deferredInstall.userChoice; }catch(e){} deferredInstall = null; }
  else alert('설치 안내: 브라우저 메뉴에서 홈 화면에 추가 또는 앱 설치를 선택해 주세요.');
};

function loadLocalSeed(){
  try{ return JSON.parse(localStorage.getItem('mallo_tool_' + TOOL_ID) || '{}') || {}; }
  catch(e){ return {}; }
}

function withShim(html, seed){
  const seedJson = JSON.stringify(seed || {}).replace(/</g, '\\u003c');
  const shim = '<scr'+'ipt>(function(){try{'
    + 'var mem=' + seedJson + ';var ses={};var P=window.parent;'
    + 'function notify(){try{P.postMessage({__mallo:"data",data:mem},"*");}catch(e){}}'
    + 'function mk(store,persist){return{getItem:function(k){k=String(k);return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null;},setItem:function(k,v){store[String(k)]=String(v);if(persist)notify();},removeItem:function(k){delete store[String(k)];if(persist)notify();},clear:function(){Object.keys(store).forEach(function(k){delete store[k];});if(persist)notify();},key:function(i){return Object.keys(store)[i]||null;},get length(){return Object.keys(store).length;}};}'
    + 'Object.defineProperty(window,"localStorage",{value:mk(mem,true),configurable:true});'
    + 'Object.defineProperty(window,"sessionStorage",{value:mk(ses,false),configurable:true});'
    + 'var _aiq={},_aid=0;'
    + 'function _ai(prompt){return new Promise(function(res,rej){var id=++_aid;_aiq[id]={res:res,rej:rej};try{P.postMessage({__mallo:"ai",id:id,prompt:String(prompt==null?"":prompt)},"*");}catch(e){rej(e);}setTimeout(function(){if(_aiq[id]){_aiq[id].rej(new Error("AI 응답 시간 초과"));delete _aiq[id];}},60000);});}'
    + 'window.addEventListener("message",function(e){var d=e.data;if(!d||d.__mallo!=="ai-result")return;var q=_aiq[d.id];if(!q)return;delete _aiq[d.id];if(d.error)q.rej(new Error(d.error));else q.res(d.text||"");});'
    + 'var _A={ai:_ai};window["말로"]=_A;window.mallo=_A;'
    + '}catch(e){}})();</scr'+'ipt>';
  if(/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, m => m + shim);
  if(/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, m => m + shim);
  return shim + html;
}

function withBadge(html){
  const badge = '<a href="/" target="_blank" rel="noopener" style="position:fixed;right:12px;bottom:12px;z-index:2147483647;display:flex;align-items:center;gap:6px;background:#3182f6;color:#fff;font:700 12px/1 Pretendard,-apple-system,sans-serif;padding:9px 13px;border-radius:999px;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.18)">말로로 만들었어요</a>';
  if(/<\\/body>/i.test(html)) return html.replace(/<\\/body>/i, badge + '</body>');
  return html + badge;
}

async function initSession(){
  try{
    const cfg = await (await fetch('/api/config')).json();
    supabase = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    const result = await supabase.auth.getSession();
    session = result && result.data ? result.data.session : null;
  }catch(e){}
}

async function handleAiRequest(id, prompt){
  const reply = (payload)=>{ try{ frame.contentWindow && frame.contentWindow.postMessage(Object.assign({ __mallo:'ai-result', id }, payload), '*'); }catch(e){} };
  if(!prompt || !String(prompt).trim()){ reply({ error:'내용을 입력해 주세요' }); return; }
  if(!session){ reply({ error:'AI 기능은 로그인 후 사용할 수 있어요' }); return; }
  try{
    const res = await fetch('/api/ai', {
      method:'POST',
      headers:{ 'content-type':'application/json', authorization:'Bearer ' + session.access_token },
      body: JSON.stringify({ prompt: String(prompt).slice(0, 12000) }),
    });
    const j = await res.json().catch(()=>({}));
    if(!res.ok){ reply({ error: j.error || 'AI 처리에 실패했어요' }); return; }
    reply({ text: j.text || '' });
  }catch(e){ reply({ error:'AI 연결에 실패했어요' }); }
}

window.addEventListener('message', (e)=>{
  if(e.source !== frame.contentWindow) return;
  const d = e.data;
  if(d && d.__mallo === 'data'){
    try{ localStorage.setItem('mallo_tool_' + TOOL_ID, JSON.stringify(d.data || {})); }catch(e){}
    return;
  }
  if(d && d.__mallo === 'ai') handleAiRequest(d.id, d.prompt);
});

await initSession();
frame.srcdoc = withBadge(withShim(TOOL_HTML, loadLocalSeed()));
</script>
</body>
</html>`;
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export default async function handler(req) {
  const url = new URL(req.url);
  const id = (url.searchParams.get('t') || '').trim();
  if (!/^[0-9a-fA-F-]{32,64}$/.test(id)) return html(notFoundHtml, 404);

  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const api = `${env('SUPABASE_URL')}/rest/v1/tools?id=eq.${encodeURIComponent(id)}&shared=eq.true&select=id,title,html&limit=1`;
  const res = await fetch(api, {
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
    },
  });
  if (!res.ok) return html(notFoundHtml, 404);

  const rows = await res.json().catch(() => []);
  const tool = Array.isArray(rows) ? rows[0] : null;
  if (!tool) return html(notFoundHtml, 404);
  return html(page(tool));
}
