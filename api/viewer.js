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
  var DEFAULT_MODEL="gemma3:1b";
  var PREFERRED=[DEFAULT_MODEL,"llama3.2:1b","llama3.2","llama3.1","qwen2.5","gemma3","mistral","phi4","phi3"];
  function storedModel(){try{return localStorage.getItem("mallo_local_ai_model")||"";}catch(e){return "";}}
  function fetchJson(url,options,timeoutMs){var ctrl=new AbortController();var timer=setTimeout(function(){ctrl.abort();},timeoutMs||8000);options=options||{};options.signal=ctrl.signal;return fetch(url,options).then(function(res){if(!res.ok)throw new Error("HTTP "+res.status);return res.json();}).finally(function(){clearTimeout(timer);});}
  async function chooseModel(base){var saved=storedModel();if(saved)return saved;var data=await fetchJson(base+"/api/tags",{method:"GET"},2500);var names=((data&&data.models)||[]).map(function(m){return m&&m.name;}).filter(Boolean);if(!names.length)throw new Error("설치된 Ollama 모델이 없어요");var picked=names.find(function(name){var lower=String(name).toLowerCase();return PREFERRED.some(function(prefix){return lower.indexOf(prefix)===0;});});return picked||names[0];}
  function setupInfo(){var ua=navigator.userAgent||"";var platform=navigator.platform||"";if(/Win/i.test(platform+ua))return{os:"Windows",url:"https://ollama.com/download/windows",install:"Ollama 설치 파일을 다운로드해 실행한 뒤 Ollama 앱을 켜 주세요."};if(/Mac/i.test(platform+ua))return{os:"Mac",url:"https://ollama.com/download/mac",install:"Ollama 앱을 설치하고 실행한 뒤 터미널에서 모델을 내려받아 주세요."};if(/Linux|X11/i.test(platform+ua))return{os:"Linux",url:"https://ollama.com/download/linux",install:"공식 설치 안내에 따라 Ollama를 설치하고 서비스를 실행해 주세요."};return{os:"현재 기기",url:"https://ollama.com/download",install:"공식 다운로드 페이지에서 운영체제에 맞는 Ollama를 설치해 주세요."};}
  function ensureSetupStyle(){if(document.getElementById("__mallo_ai_setup_style"))return;var style=document.createElement("style");style.id="__mallo_ai_setup_style";style.textContent="#__mallo_ai_setup{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(15,23,42,.45);font-family:Pretendard,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}#__mallo_ai_setup *{box-sizing:border-box}#__mallo_ai_setup_panel{width:min(460px,100%);border-radius:18px;background:#fff;color:#191f28;box-shadow:0 24px 80px rgba(0,0,0,.28);padding:22px}#__mallo_ai_setup h2{margin:0 0 8px;font-size:20px;line-height:1.3}#__mallo_ai_setup p{margin:0;color:#4e5968;font-size:14px;line-height:1.55}#__mallo_ai_setup ol{margin:16px 0;padding-left:20px;color:#333d4b;font-size:14px;line-height:1.6}#__mallo_ai_setup code{display:block;margin:10px 0 0;padding:11px 12px;border-radius:10px;background:#f2f4f6;color:#191f28;font:700 13px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:normal;word-break:break-all}#__mallo_ai_setup_actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}#__mallo_ai_setup button,#__mallo_ai_setup a{appearance:none;border:0;border-radius:10px;padding:10px 12px;font:800 13px/1 Pretendard,-apple-system,sans-serif;text-decoration:none;cursor:pointer}#__mallo_ai_setup .primary{background:#3182f6;color:#fff}#__mallo_ai_setup .ghost{background:#f2f4f6;color:#333d4b}#__mallo_ai_setup .plain{margin-left:auto;background:transparent;color:#6b7684}#__mallo_ai_setup_status{margin-top:12px;padding:10px 12px;border-radius:10px;background:#f8fafc;color:#4e5968;font-size:13px;line-height:1.45}";document.head.appendChild(style);}
  function copyText(text){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(text);var t=document.createElement("textarea");t.value=text;document.body.appendChild(t);t.select();try{document.execCommand("copy");}catch(e){}t.remove();return Promise.resolve();}
  async function checkLocalAi(){for(var i=0;i<BASES.length;i++){try{var data=await fetchJson(BASES[i]+"/api/tags",{method:"GET"},2500);var names=((data&&data.models)||[]).map(function(m){return m&&m.name;}).filter(Boolean);if(names.length)return{ok:true,detail:"로컬 AI 준비 완료: "+names[0]};return{ok:false,detail:"Ollama는 켜져 있지만 설치된 모델이 없어요. 아래 모델 명령을 실행해 주세요."};}catch(e){}}return{ok:false,detail:"Ollama 연결을 찾지 못했어요. 설치 후 Ollama 앱이 실행 중인지 확인해 주세요."};}
  function showSetup(reason){ensureSetupStyle();var info=setupInfo();var command="ollama run "+DEFAULT_MODEL;var old=document.getElementById("__mallo_ai_setup");if(old)old.remove();var overlay=document.createElement("div");overlay.id="__mallo_ai_setup";var panel=document.createElement("div");panel.id="__mallo_ai_setup_panel";var title=document.createElement("h2");title.textContent="로컬 AI 설정이 필요해요";var desc=document.createElement("p");desc.textContent="이 기능은 내 PC의 Ollama만 사용합니다. 말로 서버 AI로 자동 전환되지 않아 토큰 비용이 발생하지 않습니다.";var list=document.createElement("ol");var li1=document.createElement("li");li1.textContent=info.os+"용 Ollama를 설치하고 실행합니다. "+info.install;var li2=document.createElement("li");li2.textContent="터미널에서 가벼운 기본 모델을 한 번 내려받습니다.";var code=document.createElement("code");code.textContent=command;li2.appendChild(code);var li3=document.createElement("li");li3.textContent="설치가 끝나면 다시 확인을 누르고 AI 기능을 다시 실행합니다.";list.appendChild(li1);list.appendChild(li2);list.appendChild(li3);var actions=document.createElement("div");actions.id="__mallo_ai_setup_actions";var install=document.createElement("a");install.className="primary";install.href=info.url;install.target="_blank";install.rel="noopener";install.textContent="Ollama 설치";var copy=document.createElement("button");copy.className="ghost";copy.type="button";copy.textContent="모델 명령 복사";var check=document.createElement("button");check.className="ghost";check.type="button";check.textContent="다시 확인";var close=document.createElement("button");close.className="plain";close.type="button";close.textContent="닫기";var status=document.createElement("div");status.id="__mallo_ai_setup_status";status.textContent=reason||"Ollama 설치와 모델 준비가 필요합니다.";copy.onclick=function(){copyText(command).then(function(){status.textContent="모델 설치 명령을 복사했어요.";});};check.onclick=async function(){status.textContent="로컬 AI 상태를 확인하는 중...";var result=await checkLocalAi();status.textContent=result.ok?result.detail+" AI 버튼을 다시 눌러 주세요.":result.detail;};close.onclick=function(){overlay.remove();};actions.appendChild(install);actions.appendChild(copy);actions.appendChild(check);actions.appendChild(close);panel.appendChild(title);panel.appendChild(desc);panel.appendChild(list);panel.appendChild(actions);panel.appendChild(status);overlay.appendChild(panel);document.body.appendChild(overlay);}
  async function localAi(prompt){var last;for(var i=0;i<BASES.length;i++){var base=BASES[i];try{var model=await chooseModel(base);var data=await fetchJson(base+"/api/generate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({model:model,prompt:String(prompt||""),stream:false,options:{temperature:.4}})},60000);var text=String((data&&(data.response||(data.message&&data.message.content)))||"").trim();if(text)return text;throw new Error("빈 응답");}catch(e){last=e;}}throw last||new Error(HELP);}
  ko.aiLocal=en.aiLocal=localAi;
  ko.aiSetup=en.aiSetup=showSetup;
  ko.aiCheck=en.aiCheck=checkLocalAi;
  ko.ai=en.ai=async function(prompt){try{return await localAi(prompt);}catch(e){showSetup(e&&e.message);throw new Error(HELP);}};
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
