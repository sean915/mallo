// GET /?t=<toolId> rewrite target — shared tool viewer without owner-saved data.
import { env } from './_lib.js';

export const config = { runtime: 'edge' };

const notFoundHtml = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>도구를 찾을 수 없어요 · 말로</title></head>
<body style="font-family:Pretendard,-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;display:flex;height:100vh;align-items:center;justify-content:center;text-align:center;color:#6b7684;padding:24px;margin:0;box-sizing:border-box">
  <div>도구를 찾을 수 없어요.<br>링크가 만료됐거나 비공개 도구일 수 있어요.</div>
</body></html>`;

const VIEWER_AI_BRIDGE = `
if(!window.__malloAiBridgeInstalled){
window.__malloAiBridgeInstalled=true;
var ko=window["\\uB9D0\\uB85C"]=window["\\uB9D0\\uB85C"]||{};
var en=window.mallo=window.mallo||ko;
var HELP="로컬 AI를 찾지 못했어요. Ollama를 설치하고 로컬 모델을 실행한 뒤 다시 시도해 주세요. 말로 서버 AI로는 자동 전환되지 않습니다.";
var BASES=["http://127.0.0.1:11434","http://localhost:11434"];
var PREFERRED=["llama3.2","llama3.1","qwen2.5","gemma3","mistral","phi4","phi3"];
function storedModel(){try{return localStorage.getItem("mallo_local_ai_model")||"";}catch(e){return "";}}
function fetchJson(url,options,timeoutMs){var ctrl=new AbortController();var timer=setTimeout(function(){ctrl.abort();},timeoutMs||8000);options=options||{};options.signal=ctrl.signal;return fetch(url,options).then(function(res){if(!res.ok)throw new Error("HTTP "+res.status);return res.json();}).finally(function(){clearTimeout(timer);});}
async function chooseModel(base){var saved=storedModel();if(saved)return saved;var data=await fetchJson(base+"/api/tags",{method:"GET"},2500);var names=((data&&data.models)||[]).map(function(m){return m&&m.name;}).filter(Boolean);if(!names.length)throw new Error("설치된 Ollama 모델이 없어요");var picked=names.find(function(name){var lower=String(name).toLowerCase();return PREFERRED.some(function(prefix){return lower.indexOf(prefix)===0;});});return picked||names[0];}
async function localAi(prompt){var last;for(var i=0;i<BASES.length;i++){var base=BASES[i];try{var model=await chooseModel(base);var data=await fetchJson(base+"/api/generate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({model:model,prompt:String(prompt||""),stream:false,options:{temperature:.4}})},60000);var text=String((data&&(data.response||(data.message&&data.message.content)))||"").trim();if(text)return text;throw new Error("빈 응답");}catch(e){last=e;}}throw last||new Error(HELP);}
ko.aiLocal=en.aiLocal=localAi;
ko.ai=en.ai=async function(prompt){try{return await localAi(prompt);}catch(e){throw new Error(HELP);}};
}`;

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

function isStandalone(){ return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
function showInstallHint(msg){
  var old = document.getElementById('__mallo_hint'); if(old) old.remove();
  var b = document.createElement('div'); b.id='__mallo_hint'; b.textContent = msg;
  b.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);max-width:90%;background:#191f28;color:#fff;font:600 14px/1.5 Pretendard,-apple-system,sans-serif;padding:14px 18px;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.25);z-index:2147483647;text-align:center';
  document.body.appendChild(b); setTimeout(function(){ if(b&&b.parentNode) b.remove(); }, 6000);
}
document.getElementById('install').onclick = async ()=>{
  if(isStandalone()){ showInstallHint('이미 앱으로 설치돼 있어요 ✅'); return; }
  if(deferredInstall){ deferredInstall.prompt(); try{ await deferredInstall.userChoice; }catch(e){} deferredInstall = null; return; }
  var ua = navigator.userAgent || '';
  if(/iPhone|iPad|iPod/i.test(ua)) showInstallHint('아이폰: 공유 버튼 → "홈 화면에 추가"를 누르세요');
  else if(/Android/i.test(ua)) showInstallHint('Chrome 메뉴(⋮) → "앱 설치" 또는 "홈 화면에 추가"를 누르세요');
  else showInstallHint('주소창 오른쪽 끝 설치 아이콘(⊕), 또는 메뉴(⋮) → "앱 설치"를 누르세요');
};

function loadLocalSeed(){
  try{ return JSON.parse(localStorage.getItem('mallo_tool_' + TOOL_ID) || '{}') || {}; }
  catch(e){ return {}; }
}

function withShim(html, seed){
  const seedJson = JSON.stringify(seed || {}).replace(/</g, '\\u003c');
  const shim = '<scr'+'ipt>(function(){'
    + 'var SEED=' + seedJson + ';'
    + 'var listeners={};var memory={};'
    + 'function post(){try{parent.postMessage({__mallo:"data",data:memory},"*");}catch(e){}}'
    + 'function patch(){var rs=localStorage.setItem.bind(localStorage),rg=localStorage.getItem.bind(localStorage),rr=localStorage.removeItem.bind(localStorage);localStorage.setItem=function(k,v){memory[String(k)]=String(v);post();try{return rs(k,v)}catch(e){}};localStorage.getItem=function(k){k=String(k);if(Object.prototype.hasOwnProperty.call(memory,k))return memory[k];try{return rg(k)}catch(e){return null}};localStorage.removeItem=function(k){delete memory[String(k)];post();try{return rr(k)}catch(e){}};}'
    + 'try{Object.assign(memory,SEED||{});}catch(e){}'
    + 'try{patch();}catch(e){}'
    + VIEWER_AI_BRIDGE
    + 'window.addEventListener("message",function(e){var d=e.data;if(!d)return;if((d.__mallo==="ai_result"||d.__mallo==="ai-result")&&listeners[d.id]){var l=listeners[d.id];delete listeners[d.id];d.error?l.reject(new Error(d.error)):l.resolve(d.text||"");}});'
    + '})();</scr'+'ipt>';
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
  reply({ error:'이 도구의 AI 기능은 로컬 AI(Ollama)만 사용합니다. 말로 서버 AI로는 자동 전환되지 않습니다.' });
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
