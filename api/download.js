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

const DOWNLOAD_AI_BRIDGE = `<script>
(function(){
  if(window.__malloAiBridgeInstalled) return;
  window.__malloAiBridgeInstalled = true;
  var ko = window["말로"] = window["말로"] || {};
  var en = window.mallo = window.mallo || ko;
  var HELP = "로컬 AI를 찾지 못했어요. Ollama를 설치하고 로컬 모델을 실행한 뒤 다시 시도해 주세요. 말로 서버 AI로는 자동 전환되지 않습니다.";
  var BASES = ["http://127.0.0.1:11434", "http://localhost:11434"];
  var DEFAULT_MODEL = "gemma3:1b";
  var PREFERRED = [DEFAULT_MODEL, "llama3.2:1b", "llama3.2", "llama3.1", "qwen2.5", "gemma3", "mistral", "phi4", "phi3"];
  function storedModel(){ try{ return localStorage.getItem("mallo_local_ai_model") || ""; }catch(e){ return ""; } }
  function fetchJson(url, options, timeoutMs){
    var ctrl = new AbortController();
    var timer = setTimeout(function(){ ctrl.abort(); }, timeoutMs || 8000);
    options = options || {};
    options.signal = ctrl.signal;
    return fetch(url, options).then(function(res){
      if(!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).finally(function(){ clearTimeout(timer); });
  }
  async function chooseModel(base){
    var saved = storedModel();
    if(saved) return saved;
    var data = await fetchJson(base + "/api/tags", { method: "GET" }, 2500);
    var names = ((data && data.models) || []).map(function(m){ return m && m.name; }).filter(Boolean);
    if(!names.length) throw new Error("설치된 Ollama 모델이 없어요");
    var picked = names.find(function(name){
      var lower = String(name).toLowerCase();
      return PREFERRED.some(function(prefix){ return lower.indexOf(prefix) === 0; });
    });
    return picked || names[0];
  }
  function setupInfo(){
    var ua = navigator.userAgent || "";
    var platform = navigator.platform || "";
    if(/Win/i.test(platform + ua)) return { os:"Windows", url:"https://ollama.com/download/windows", install:"Ollama 설치 파일을 다운로드해 실행한 뒤 Ollama 앱을 켜 주세요." };
    if(/Mac/i.test(platform + ua)) return { os:"Mac", url:"https://ollama.com/download/mac", install:"Ollama 앱을 설치하고 실행한 뒤 터미널에서 모델을 내려받아 주세요." };
    if(/Linux|X11/i.test(platform + ua)) return { os:"Linux", url:"https://ollama.com/download/linux", install:"공식 설치 안내에 따라 Ollama를 설치하고 서비스를 실행해 주세요." };
    return { os:"현재 기기", url:"https://ollama.com/download", install:"공식 다운로드 페이지에서 운영체제에 맞는 Ollama를 설치해 주세요." };
  }
  function ensureSetupStyle(){
    if(document.getElementById("__mallo_ai_setup_style")) return;
    var style = document.createElement("style");
    style.id = "__mallo_ai_setup_style";
    style.textContent = "#__mallo_ai_setup{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(15,23,42,.45);font-family:Pretendard,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}#__mallo_ai_setup *{box-sizing:border-box}#__mallo_ai_setup_panel{width:min(460px,100%);border-radius:18px;background:#fff;color:#191f28;box-shadow:0 24px 80px rgba(0,0,0,.28);padding:22px}#__mallo_ai_setup h2{margin:0 0 8px;font-size:20px;line-height:1.3}#__mallo_ai_setup p{margin:0;color:#4e5968;font-size:14px;line-height:1.55}#__mallo_ai_setup ol{margin:16px 0;padding-left:20px;color:#333d4b;font-size:14px;line-height:1.6}#__mallo_ai_setup code{display:block;margin:10px 0 0;padding:11px 12px;border-radius:10px;background:#f2f4f6;color:#191f28;font:700 13px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:normal;word-break:break-all}#__mallo_ai_setup_actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}#__mallo_ai_setup button,#__mallo_ai_setup a{appearance:none;border:0;border-radius:10px;padding:10px 12px;font:800 13px/1 Pretendard,-apple-system,sans-serif;text-decoration:none;cursor:pointer}#__mallo_ai_setup .primary{background:#3182f6;color:#fff}#__mallo_ai_setup .ghost{background:#f2f4f6;color:#333d4b}#__mallo_ai_setup .plain{margin-left:auto;background:transparent;color:#6b7684}#__mallo_ai_setup_status{margin-top:12px;padding:10px 12px;border-radius:10px;background:#f8fafc;color:#4e5968;font-size:13px;line-height:1.45}";
    document.head.appendChild(style);
  }
  function copyText(text){
    if(navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    var t = document.createElement("textarea");
    t.value = text;
    document.body.appendChild(t);
    t.select();
    try{ document.execCommand("copy"); }catch(e){}
    t.remove();
    return Promise.resolve();
  }
  async function checkLocalAi(){
    var last;
    for(var i=0;i<BASES.length;i++){
      try{
        var data = await fetchJson(BASES[i] + "/api/tags", { method:"GET" }, 2500);
        var names = ((data && data.models) || []).map(function(m){ return m && m.name; }).filter(Boolean);
        if(names.length) return { ok:true, detail:"로컬 AI 준비 완료: " + names[0] };
        return { ok:false, detail:"Ollama는 켜져 있지만 설치된 모델이 없어요. 아래 모델 명령을 실행해 주세요." };
      }catch(e){ last = e; }
    }
    return { ok:false, detail:"Ollama 연결을 찾지 못했어요. 설치 후 Ollama 앱이 실행 중인지 확인해 주세요." };
  }
  function showSetup(reason){
    ensureSetupStyle();
    var info = setupInfo();
    var command = "ollama run " + DEFAULT_MODEL;
    var old = document.getElementById("__mallo_ai_setup");
    if(old) old.remove();
    var overlay = document.createElement("div");
    overlay.id = "__mallo_ai_setup";
    var panel = document.createElement("div");
    panel.id = "__mallo_ai_setup_panel";
    var title = document.createElement("h2");
    title.textContent = "로컬 AI 설정이 필요해요";
    var desc = document.createElement("p");
    desc.textContent = "이 기능은 내 PC의 Ollama만 사용합니다. 말로 서버 AI로 자동 전환되지 않아 토큰 비용이 발생하지 않습니다.";
    var list = document.createElement("ol");
    var li1 = document.createElement("li");
    li1.textContent = info.os + "용 Ollama를 설치하고 실행합니다. " + info.install;
    var li2 = document.createElement("li");
    li2.textContent = "터미널에서 가벼운 기본 모델을 한 번 내려받습니다.";
    var code = document.createElement("code");
    code.textContent = command;
    li2.appendChild(code);
    var li3 = document.createElement("li");
    li3.textContent = "설치가 끝나면 다시 확인을 누르고 AI 기능을 다시 실행합니다.";
    list.appendChild(li1); list.appendChild(li2); list.appendChild(li3);
    var actions = document.createElement("div");
    actions.id = "__mallo_ai_setup_actions";
    var install = document.createElement("a");
    install.className = "primary";
    install.href = info.url;
    install.target = "_blank";
    install.rel = "noopener";
    install.textContent = "Ollama 설치";
    var copy = document.createElement("button");
    copy.className = "ghost";
    copy.type = "button";
    copy.textContent = "모델 명령 복사";
    var check = document.createElement("button");
    check.className = "ghost";
    check.type = "button";
    check.textContent = "다시 확인";
    var close = document.createElement("button");
    close.className = "plain";
    close.type = "button";
    close.textContent = "닫기";
    var status = document.createElement("div");
    status.id = "__mallo_ai_setup_status";
    status.textContent = reason || "Ollama 설치와 모델 준비가 필요합니다.";
    copy.onclick = function(){ copyText(command).then(function(){ status.textContent = "모델 설치 명령을 복사했어요."; }); };
    check.onclick = async function(){
      status.textContent = "로컬 AI 상태를 확인하는 중...";
      var result = await checkLocalAi();
      status.textContent = result.ok ? result.detail + " AI 버튼을 다시 눌러 주세요." : result.detail;
    };
    close.onclick = function(){ overlay.remove(); };
    actions.appendChild(install); actions.appendChild(copy); actions.appendChild(check); actions.appendChild(close);
    panel.appendChild(title); panel.appendChild(desc); panel.appendChild(list); panel.appendChild(actions); panel.appendChild(status);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  }
  async function localAi(prompt){
    var last;
    for(var i=0;i<BASES.length;i++){
      var base = BASES[i];
      try{
        var model = await chooseModel(base);
        var data = await fetchJson(base + "/api/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model: model,
            prompt: String(prompt || ""),
            stream: false,
            options: { temperature: 0.4 }
          })
        }, 60000);
        var text = String((data && (data.response || (data.message && data.message.content))) || "").trim();
        if(text) return text;
        throw new Error("빈 응답");
      }catch(e){ last = e; }
    }
    throw last || new Error(HELP);
  }
  ko.aiLocal = en.aiLocal = localAi;
  ko.aiSetup = en.aiSetup = showSetup;
  ko.aiCheck = en.aiCheck = checkLocalAi;
  ko.ai = en.ai = async function(prompt){
    try{ return await localAi(prompt); }
    catch(e){ showSetup(e && e.message); throw new Error(HELP); }
  };
})();
</script>`;

function withDownloadRuntime(html) {
  const badge = '<a href="https://malloai.com/" target="_blank" rel="noopener" style="position:fixed;right:12px;bottom:12px;z-index:2147483647;background:#3182f6;color:#fff;font:700 12px/1 -apple-system,sans-serif;padding:9px 13px;border-radius:999px;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.18)">⚡ 말로로 만들었어요</a>';
  const runtime = DOWNLOAD_AI_BRIDGE + badge;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, runtime + '</body>');
  return html + runtime;
}

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
  const host = req.headers.get('host') || 'malloai.com';
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
    documentRoot: '/resources/',
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

Powered by 말로 (malloai.com) & Neutralino.js ${NEUTRALINO_VERSION}
`;

  // ZIP 조립: 바이너리 + resources/index.html (파일시스템 모드)
  const zipOut = zipSync({
    [exeName]:                  [binBytes,            { level: 0 }],
    'resources/index.html':     [strToU8(withDownloadRuntime(html)),       { level: 6 }],
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
