import { readFileSync, writeFileSync } from 'node:fs';

const path = 'index.html';
let html = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

const LOCAL_AI_PREVIEW_BRIDGE_SOURCE = "const PREVIEW_AI_BRIDGE = `" + String.raw`
  if(!window.__malloAiBridgeInstalled){
    window.__malloAiBridgeInstalled = true;
    const ko = window.말로 = window.말로 || {};
    const en = window.mallo = window.mallo || ko;
    let aiSeq = 0;
    const HELP = 'AI 기능은 말로 온라인에서 로그인 후 크레딧으로 사용할 수 있어요.';
    ko.ai = en.ai = function(prompt){
      return new Promise((resolve, reject)=>{
        const id = 'ai_' + Date.now() + '_' + (++aiSeq);
        listeners[id] = { resolve, reject };
        try{ parent.postMessage({ __mallo:'ai', id, prompt:String(prompt || '') }, '*'); }
        catch(e){ delete listeners[id]; reject(new Error(HELP)); return; }
        setTimeout(()=>{
          if(!listeners[id]) return;
          delete listeners[id];
          reject(new Error('AI 응답이 지연되고 있어요. 잠시 후 다시 시도해 주세요.'));
        }, 90000);
      });
    };
    ko.aiSetup = en.aiSetup = function(){ throw new Error(HELP); };
  }
` + "`;\n";

const LOCAL_AI_PREVIEW_SHIM_SOURCE =
  "  const shim = `<script>\n" +
  "(function(){\n" +
  "  const SEED=${seedJson};\n" +
  "  const KEY='__mallo_internal__';\n" +
  "  const listeners=[];\n" +
  "  const memory={};\n" +
  "  function post(){ try{ parent.postMessage({__mallo:'data',data:memory},'*'); }catch(e){} }\n" +
  "  function patch(){\n" +
  "    const rawSet=localStorage.setItem.bind(localStorage), rawGet=localStorage.getItem.bind(localStorage), rawRemove=localStorage.removeItem.bind(localStorage);\n" +
  "    localStorage.setItem=function(k,v){ memory[k]=v; post(); try{return rawSet(k,v)}catch(e){} };\n" +
  "    localStorage.getItem=function(k){ if(Object.prototype.hasOwnProperty.call(memory,k)) return memory[k]; try{return rawGet(k)}catch(e){return null} };\n" +
  "    localStorage.removeItem=function(k){ delete memory[k]; post(); try{return rawRemove(k)}catch(e){} };\n" +
  "  }\n" +
  "  function reportRuntime(kind,message,source,lineno,colno,stack){\n" +
  "    const msg=String(message||'').trim();\n" +
  "    if(!msg || /ResizeObserver loop/i.test(msg)) return;\n" +
  "    try{ parent.postMessage({__mallo:'runtime_error',kind:kind||'error',message:msg.slice(0,600),source:String(source||'').slice(0,200),lineno:lineno||0,colno:colno||0,stack:String(stack||'').slice(0,1500)},'*'); }catch(e){}\n" +
  "  }\n" +
  "  window.addEventListener('error',function(e){ reportRuntime('error',e.message,e.filename,e.lineno,e.colno,e.error&&e.error.stack); });\n" +
  "  window.addEventListener('unhandledrejection',function(e){ const r=e.reason; reportRuntime('unhandledrejection',(r&&(r.message||r))||'Unhandled promise rejection','',0,0,r&&r.stack); });\n" +
  "  try{ Object.assign(memory, SEED||{}); patch(); }catch(e){}\n" +
  "${PREVIEW_AI_BRIDGE}\n" +
  "  window.addEventListener('message',e=>{ const d=e.data; if(d&&d.__mallo==='ai_result'&&listeners[d.id]){ const l=listeners[d.id]; delete listeners[d.id]; d.error?l.reject(new Error(d.error)):l.resolve(d.text||''); } });\n" +
  "})();\n" +
  "<\\/script>`;";

function ensureLocalAiPreviewBridge() {
  const anchor = '/* ================== 생성 코드 ↔ 미리보기 데이터 저장 shim ================== */\n';
  if (html.includes('const PREVIEW_AI_BRIDGE = `')) {
    const bridge = /const PREVIEW_AI_BRIDGE = `[\s\S]*?`;\nfunction withShim\(html, seed\)\{/;
    if (!bridge.test(html)) {
      throw new Error('patch target not found: existing local AI preview bridge');
    }
    html = html.replace(bridge, LOCAL_AI_PREVIEW_BRIDGE_SOURCE + 'function withShim(html, seed){');
  } else {
    if (!html.includes(anchor + 'function withShim(html, seed){')) {
      throw new Error('patch target not found: local AI preview bridge anchor');
    }
    html = html.replace(anchor + 'function withShim(html, seed){', anchor + LOCAL_AI_PREVIEW_BRIDGE_SOURCE + 'function withShim(html, seed){');
  }
  if (html.includes('window.말로.ai = window.mallo.ai = function(prompt)')) {
    const oldShim = /  const shim = `<script>\\n\(function\(\)\{\\n  const SEED=\$\{seedJson\};[\s\S]*?\\n<\\\/script>`;/;
    if (!oldShim.test(html)) throw new Error('patch target not found: local AI preview shim');
    html = html.replace(oldShim, LOCAL_AI_PREVIEW_SHIM_SOURCE);
  }
}
ensureLocalAiPreviewBridge();

function replaceOnce(before, after, label) {
  if (html.includes(after)) return;
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
  if(d && d.__mallo === 'runtime_error'){ handleRuntimeError(d); return; }
  if(d && d.__mallo === 'ai'){ handleAiRequest(e.source, d.id, d.prompt); return; }
  if(!(d && d.__mallo === 'data' && d.data)) return;
`,
  'message source validation'
);

replaceOnce(
`async function handleAiRequest(source, id, prompt){
  try{ source.postMessage({__mallo:'ai_result', id, error:'이 도구의 AI 기능은 로컬 AI(Ollama)만 사용합니다. 말로 서버 AI로는 자동 전환되지 않습니다.'}, '*'); }catch(e){}
}
`,
`async function handleAiRequest(source, id, prompt){
  try{
    if(!S.session) throw new Error('AI 기능은 로그인 후 크레딧으로 사용할 수 있어요.');
    const res = await fetch('/api/ai', {
      method:'POST',
      headers:{ 'content-type':'application/json', authorization:\`Bearer \${S.session.access_token}\` },
      body: JSON.stringify({ prompt })
    });
    const j = await res.json().catch(()=>({}));
    if(!res.ok || j.error){
      if(j.code === 'no_credit') openCharge();
      throw new Error(j.error || 'AI 처리 중 문제가 생겼어요.');
    }
    source.postMessage({__mallo:'ai_result', id, text:j.text||'', error:null}, '*');
    refreshMe();
  }catch(e){
    try{ source.postMessage({__mallo:'ai_result', id, error:e.message||'AI 호출 실패'}, '*'); }catch(_){}
  }
}
`,
  'enable credit-based server AI relay'
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

replaceOnce(
`    --radius:16px;`,
`    --radius:16px; --footer-h:34px;`,
  'review footer height token'
);

replaceOnce(
`  body.app-mode{height:100%;background:var(--bg);overflow:hidden}
  button{font-family:inherit;cursor:pointer;border:none;background:none}
  input,textarea{font-family:inherit}
  .app-shell{height:100%;min-height:100%}`,
`  body.app-mode{height:100%;height:100dvh;min-height:100%;background:var(--bg);overflow:hidden}
  button{font-family:inherit;cursor:pointer;border:none;background:none}
  input,textarea{font-family:inherit}
  .app-shell{height:100%;height:100dvh;min-height:0;display:flex;flex-direction:column}`,
  'fixed app viewport shell'
);

replaceOnce(
`  header{height:60px;background:var(--card);border-bottom:1px solid var(--line);display:flex;align-items:center;padding:0 64px 0 20px;gap:14px}`,
`  header{height:60px;flex:0 0 60px;background:var(--card);border-bottom:1px solid var(--line);display:flex;align-items:center;padding:0 64px 0 20px;gap:14px}`,
  'fixed app header height'
);

replaceOnce(
`  .hidden{display:none !important}`,
`  .hidden{display:none !important}
  .site-footer{height:var(--footer-h);flex:0 0 var(--footer-h);display:flex;align-items:center;justify-content:center;gap:8px;padding:0 12px;border-top:1px solid #eef1f4;background:rgba(255,255,255,.92);color:#9aa4b2;font-size:10px;line-height:1.35;white-space:nowrap;overflow:hidden}
  .site-footer span{display:inline-block}
  .site-footer a{color:#9aa4b2;text-decoration:none}
  .site-footer a:hover{text-decoration:underline}
  .pay-note{margin-top:12px;padding:11px 12px;border:1px solid #eef1f4;border-radius:12px;background:#fafbfc;color:#6b7684;font-size:12.5px;line-height:1.55}
  .pay-note a{color:#3182f6;text-decoration:none;font-weight:700}
  .landing-business{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px 10px;padding:16px clamp(18px,5vw,72px) 20px;border-top:1px solid rgba(255,255,255,.08);color:rgba(247,247,251,.42);font-size:10px;line-height:1.45}
  .landing-business a{color:rgba(247,247,251,.5);text-decoration:none}
  .landing-business a:hover{text-decoration:underline}`,
  'review footer and payment note styles'
);

replaceOnce(
`  @media (max-width:768px){
    header{padding:0 14px;gap:10px}`,
`  @media (max-width:768px){
    :root{--footer-h:52px}
    header{padding:0 14px;gap:10px}`,
  'mobile review footer height'
);

replaceOnce(
`    .main{flex-direction:column;height:calc(100% - 60px - 46px)}`,
`    .main{flex-direction:column;height:auto;min-height:0}`,
  'mobile app footer height'
);

if (!html.includes('.site-footer{flex-wrap:wrap;gap:2px 7px')) {
  replaceOnce(
`    .landing-section{padding:68px 16px}
  }`,
`    .landing-section{padding:68px 16px}
    .site-footer{flex-wrap:wrap;gap:2px 7px;padding:4px 10px;font-size:9px;align-content:center}
    .landing-business{padding:14px 12px 18px;font-size:9px}
  }`,
    'mobile review footer styles'
  );
}

replaceOnce(
`  </section>
</div>

<div class="app-shell hidden" id="appShell">`,
`  </section>
  <footer class="landing-business" aria-label="사업자 정보">
    <span>상호명: 말로</span>
    <span>대표자명: 한호정</span>
    <span>사업자등록번호: 489-07-03664</span>
    <span>사업장주소: 서울특별시 노원구 동일로237바길 17, 101동 202호</span>
    <span>전화번호: 050-6544-3197</span>
    <span><a href="/terms.html" target="_blank">이용약관</a> · <a href="/refund.html" target="_blank">환불정책</a> · <a href="/privacy.html" target="_blank">개인정보처리방침</a></span>
  </footer>
</div>

<div class="app-shell hidden" id="appShell">`,
  'landing business footer'
);

replaceOnce(
`</div>

<!-- 로그인 모달 -->`,
`<footer class="site-footer" aria-label="사업자 정보">
  <span>상호명: 말로</span>
  <span>대표자명: 한호정</span>
  <span>사업자등록번호: 489-07-03664</span>
  <span>사업장주소: 서울특별시 노원구 동일로237바길 17, 101동 202호</span>
  <span>전화번호: 050-6544-3197</span>
  <span><a href="/terms.html" target="_blank">이용약관</a> · <a href="/refund.html" target="_blank">환불정책</a> · <a href="/privacy.html" target="_blank">개인정보처리방침</a></span>
</footer>
</div>

<!-- 로그인 모달 -->`,
  'app business footer'
);

replaceOnce(
`    <div class="planbox hidden" id="planBox"></div>
    <button class="bigbtn" id="btnFbSend">의견 보내기</button>`,
`    <div class="planbox hidden" id="planBox"></div>
    <div class="pay-note hidden" id="payNote">
      서비스 제공일: 결제 완료 즉시 AI 크레딧 충전 · 도구 생성/수정 또는 도구 안의 AI 기능 사용 시 1건 차감 · 환불: 결제 후 7일 이내 미사용분 환불, 사용분 제외 · <a href="/refund.html" target="_blank">환불 정책 보기</a>
    </div>
    <button class="bigbtn" id="btnFbSend">의견 보내기</button>`,
  'payment detail note'
);

replaceOnce(
`  $('btnCharge').classList.toggle('hidden', !loggedIn);`,
`  $('btnCharge').classList.toggle('hidden', !payConfigured());`,
  'show charge button when payment ready'
);

replaceOnce(
`$('btnCharge').onclick = ()=>{ try{ if(typeof window.startPurchase==='function'){ window.startPurchase('single'); } else { alert('결제 기능을 불러오는 중이에요. 잠시 후 다시 시도해주세요.'); } }catch(e){ alert('오류: '+((e&&e.message)||e)); } };`,
`$('btnCharge').onclick = ()=> openCharge();`,
  'charge opens product list'
);

replaceOnce(
`    b.innerHTML = '<div><div class="pn">'+p.name+badge+'</div><div class="pd">'+p.credits+'건 생성권 · 건당 '+per.toLocaleString()+'원 · 만료 없음</div></div><div class="pv">'+p.price.toLocaleString()+'원</div>';`,
`    b.innerHTML = '<div><div class="pn">'+p.name+badge+'</div><div class="pd">'+p.credits+'건 크레딧 · 도구 생성/AI 기능에 사용 · 만료 없음</div></div><div class="pv">'+p.price.toLocaleString()+'원<br><span style="font-size:11px;color:#6b7684">결제하기</span></div>';`,
  'payment product detail copy'
);

replaceOnce(
`function openFeedback(beta){
  const payOn = payConfigured();`,
`function openFeedback(beta){
  const payOn = payConfigured();
  $('fbStars').classList.remove('hidden');
  $('fbText').classList.remove('hidden');
  $('btnFbSend').classList.remove('hidden');
  $('payNote').classList.add('hidden');`,
  'feedback modal reset state'
);

replaceOnce(
`      $('fbTitle').textContent = '무료 횟수를 다 쓰셨어요 🎉';
      $('fbSub').textContent = '생성권을 충전하면 계속 만들 수 있어요. 카카오페이로 한 번만 결제하면 끝, 구매한 생성권은 만료 없이 계속 쓸 수 있어요.';`,
`      $('fbTitle').textContent = '무료 체험을 모두 사용했어요';
      $('fbSub').textContent = '도구 생성과 AI 기능 사용에 필요한 크레딧을 선택해 주세요. 구매한 크레딧은 만료 없이 사용할 수 있습니다.';
      $('fbStars').classList.add('hidden');
      $('fbText').classList.add('hidden');
      $('btnFbSend').classList.add('hidden');
      $('payNote').classList.remove('hidden');`,
  'trial over shows product list first'
);

replaceOnce(
`      $('fbTitle').textContent = '무료 체험이 끝났어요 🧪';
      $('fbSub').textContent = '말로는 아직 베타 테스트 버전이에요. 지금은 결제 없이 준비 중이고, 정식 오픈하면 알려드릴게요. 써보신 후기를 남겨 주시면 큰 힘이 됩니다!';`,
`      $('fbTitle').textContent = '무료 체험이 끝났어요';
      $('fbSub').textContent = '지금은 정식 결제 오픈 전이에요. 사용 후 느낀 점을 남겨주시면 제품 개선에 반영하겠습니다.';`,
  'trial over beta copy'
);

replaceOnce(
`    $('fbTitle').textContent = '의견을 들려주세요 💬';
    $('fbSub').textContent = '말로는 지금 베타 테스트 중이에요. 좋았던 점·불편한 점·만들고 싶은 기능 뭐든 적어 주세요!';`,
`    $('fbTitle').textContent = '의견을 들려주세요';
    $('fbSub').textContent = '말로를 쓰면서 좋았던 점, 불편했던 점, 만들고 싶은 기능을 편하게 남겨 주세요.';`,
  'feedback modal copy'
);

replaceOnce(
`"의견을 들려주세요 💬":"Send us feedback 💬","말로는 지금 베타 테스트 중이에요. 좋았던 점·불편한 점·만들고 싶은 기능 뭐든 적어 주세요!":"Mallo is in beta. Tell us what you liked, what felt off, or features you want!"`,
`"의견을 들려주세요":"Send us feedback","말로를 쓰면서 좋았던 점, 불편했던 점, 만들고 싶은 기능을 편하게 남겨 주세요.":"Tell us what worked, what felt off, or what you want to build next."`,
  'feedback i18n copy'
);

replaceOnce(
`    <h2 id="fbTitle">의견을 들려주세요 💬</h2>
    <p class="sub" id="fbSub">말로는 지금 베타 테스트 중이에요. 좋았던 점·불편한 점·만들고 싶은 기능 뭐든 적어 주세요!</p>`,
`    <h2 id="fbTitle">의견을 들려주세요</h2>
    <p class="sub" id="fbSub">말로를 쓰면서 좋았던 점, 불편했던 점, 만들고 싶은 기능을 편하게 남겨 주세요.</p>`,
  'static feedback modal copy'
);

replaceOnce(
`  $('fbModal').classList.remove('hidden');
  setTimeout(()=>$('fbText').focus(), 50);
}
$('btnFeedback').onclick = ()=> openFeedback(false);`,
`  $('fbModal').classList.remove('hidden');
  if(!$('fbText').classList.contains('hidden')) setTimeout(()=>$('fbText').focus(), 50);
}
function openCharge(){
  if(!payConfigured()){ toast('결제 준비 중이에요'); return; }
  $('fbTitle').textContent = 'AI 크레딧 충전';
  $('fbSub').textContent = '도구 생성, 수정, 도구 안의 AI 기능 사용에 필요한 크레딧 상품을 선택해 주세요.';
  $('fbStars').classList.add('hidden');
  $('fbText').classList.add('hidden');
  $('btnFbSend').classList.add('hidden');
  renderPlans();
  $('planBox').classList.remove('hidden');
  $('payNote').classList.remove('hidden');
  $('fbModal').classList.remove('hidden');
}
$('btnFeedback').onclick = ()=> openFeedback(false);`,
  'standalone charge product list'
);

replaceOnce(
`  .main{display:flex;height:calc(100% - 60px)}
  .left{width:420px;min-width:340px;display:flex;flex-direction:column;background:var(--card);border-right:1px solid var(--line)}
  .right{flex:1;display:flex;flex-direction:column;background:#fff}

  .chat{flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:14px}`,
`  .main{display:flex;flex:1 1 auto;height:auto;min-height:0}
  .left{width:420px;min-width:340px;min-height:0;display:flex;flex-direction:column;background:var(--card);border-right:1px solid var(--line)}
  .right{flex:1;min-height:0;display:flex;flex-direction:column;background:#fff}

  .chat{flex:1;min-height:0;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:14px}`,
  'prompt layout flex shrink'
);

replaceOnce(
`  .tools-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 20px}`,
`  .tools-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 20px;min-height:0;overflow-y:auto}`,
  'prompt tools grid scroll'
);

replaceOnce(
`    .left{width:100%;min-width:0;border-right:none;height:100%}
    .right{height:100%}`,
`    .left{width:100%;min-width:0;min-height:0;border-right:none;height:100%}
    .right{min-height:0;height:100%}`,
  'mobile prompt pane shrink'
);

const appPolishCss = `
  /* app-polish */
  body.app-mode{background:#eef3f2}
  .app-shell{background:linear-gradient(180deg,#f8fbfa 0%,#edf4f3 100%)}
  header{background:rgba(255,255,255,.94);border-bottom:1px solid #dce9e7;box-shadow:0 10px 30px rgba(15,23,42,.05);backdrop-filter:blur(12px)}
  .logo b{color:#0f9f73}
  .trial-badge{background:#e8fbf3;color:#0b7b59}
  .hbtn.primary{background:#101828;color:#fff}
  .hbtn.primary:hover{background:#0f9f73}
  .left{background:linear-gradient(180deg,#fff 0%,#fbfefd 100%);border-right:1px solid #d8e5e3}
  .right{background:#f8faf9}
  .welcome{padding:26px 20px 4px}
  .welcome h2{font-size:20px;letter-spacing:0;color:#101828}
  .welcome p{max-width:350px;color:#586571}
  .tools-grid{gap:10px;padding-top:12px}
  .tcard{border-color:#dde7e5;border-radius:10px;background:#fff;box-shadow:0 8px 20px rgba(15,23,42,.035);gap:8px;min-height:92px}
  .tcard:hover{border-color:#0f9f73;background:#f4fffa;transform:translateY(-1px)}
  .tcard .ic{width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:#e9fbf4;font-size:17px;line-height:1}
  .tcard .nm{font-size:13.5px;letter-spacing:0}
  .tcard .ds{color:#70808d}
  .tcard.more{background:#101828;color:#fff;border-color:#101828;border-style:solid}
  .tcard.more:hover{background:#0f9f73;border-color:#0f9f73;color:#fff}
  .inputbar{background:rgba(255,255,255,.94);border-top:1px solid #dce9e7;padding:14px 16px 16px;box-shadow:0 -12px 30px rgba(15,23,42,.05)}
  .inputbox{background:#fff;border:1.5px solid #cfe2df;border-radius:14px;box-shadow:0 12px 24px rgba(15,23,42,.06)}
  .inputbox:focus-within{border-color:#0f9f73;box-shadow:0 0 0 4px rgba(15,159,115,.1)}
  .send{background:#101828;border-radius:10px}
  .send:hover{background:#0f9f73}
  .hint{color:#74808b}
  .preview-head{background:rgba(255,255,255,.95);border-bottom:1px solid #dce9e7}
  .live-dot.on{background:#0f9f73;box-shadow:0 0 0 4px rgba(15,159,115,.15)}
  .pbtn.go{background:#101828;border-color:#101828}
  .pbtn.go:hover{background:#0f9f73;border-color:#0f9f73}
  .preview-wrap{background:linear-gradient(135deg,#f7faf9,#edf4f3)}
  .empty{background:transparent;color:#101828;padding:28px}
  .empty .big{width:58px;height:58px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:#e9fbf4;color:#0b7b59;font-size:24px;font-weight:900}
  .empty h3{font-size:20px;letter-spacing:0}
  .empty p{max-width:430px;color:#5d6975}
  .site-footer{height:28px;flex-basis:28px;background:rgba(248,250,252,.72);color:#b7c0c8;border-top:1px solid #edf1f2;font-size:9px}
  .site-footer a{color:#a8b2bd}
  @media (max-width:768px){
    .app-shell header{padding:0 12px;gap:8px}
    .app-shell .logo{font-size:19px}
    .app-shell .trial-badge{max-width:104px;overflow:hidden;text-overflow:ellipsis}
    .app-shell .hbtn{font-size:12px;padding:7px 8px}
    .mtabs{background:rgba(255,255,255,.95);border-bottom-color:#dce9e7}
    .mtab{font-size:14px}
    .mtab.active{color:#0f9f73;border-bottom-color:#0f9f73}
    body.app-mode #__mlt{display:none}
    .welcome{padding:20px 16px 4px}
    .tools-grid{padding:12px 14px}
    .tcard{min-height:86px;padding:12px}
    .empty{padding:24px 18px}
    .site-footer{height:42px;flex-basis:42px}
  }`;

if (!html.includes('/* app-polish */')) {
  replaceOnce(
`  .landing-business a:hover{text-decoration:underline}`,
`  .landing-business a:hover{text-decoration:underline}
${appPolishCss}`,
    'app polish styles'
  );
}

replaceOnce(
`  <button class="hbtn primary hidden" id="btnCharge">💳 충전</button>
  <button class="hbtn hidden" id="btnMyTools">📂 내 도구함</button>
  <button class="hbtn primary hidden" id="btnFeedback">💬 피드백</button>
  <button class="hbtn primary hidden" id="btnLogin">🔑 로그인</button>`,
`  <button class="hbtn primary hidden" id="btnCharge">충전</button>
  <button class="hbtn hidden" id="btnMyTools">내 도구함</button>
  <button class="hbtn primary hidden" id="btnFeedback">피드백</button>
  <button class="hbtn primary hidden" id="btnLogin">로그인</button>`,
  'calmer app header actions'
);

replaceOnce(
`  <button class="mtab active" data-pane="make">✏️ 만들기</button>
  <button class="mtab" data-pane="preview">👁️ 미리보기</button>`,
`  <button class="mtab active" data-pane="make">만들기</button>
  <button class="mtab" data-pane="preview">미리보기</button>`,
  'calmer mobile tabs'
);

replaceOnce(
`      <h2>어떤 도구가 필요하세요? 🛠️</h2>
      <p>아래에서 고르면 <b>바로 만들어 드려요.</b> 누르기만 하면 끝 — 만든 뒤엔 말로 고치고, 입력한 내용은 자동으로 저장돼요.</p>`,
`      <h2>필요한 업무를 말하면 도구가 됩니다</h2>
      <p>원하는 일을 고르거나 아래 입력창에 설명해 주세요. 말로가 바로 실행 가능한 웹 도구로 만들고, 만든 뒤에도 말로 수정할 수 있어요.</p>`,
  'professional app welcome copy'
);

replaceOnce(
`      <div class="empty" id="empty">
        <div class="big">🛠️</div>
        <h3>아직 만든 도구가 없어요</h3>
        <p>왼쪽에서 필요한 도구를 고르면<br>여기서 바로 만들어지고, 바로 써볼 수 있어요.</p>
      </div>`,
`      <div class="empty" id="empty">
        <div class="big">M</div>
        <h3>만들 준비가 완료됐어요</h3>
        <p>왼쪽에서 업무 템플릿을 고르거나 아래 입력창에 필요한 흐름을 말로 설명해 주세요.<br>완성된 도구가 이곳에 바로 나타납니다.</p>
      </div>`,
  'professional empty preview copy'
);

replaceOnce(
`      <button class="tcard more" id="tcMore">✏️ 직접 말로 만들기</button>`,
`      <button class="tcard more" id="tcMore">직접 말로 만들기</button>`,
  'calmer custom prompt card'
);

replaceOnce(
`  setTimeout(()=>{ try{ input.focus(); }catch(e){} }, 120);
}

function initLanding(){`,
`  setTimeout(()=>{ try{ input.focus(); }catch(e){} }, 120);
}

function maybeEnterAppFromHash(){
  if(location.hash !== '#app') return;
  const appShell = $('appShell');
  if(!appShell || !appShell.classList.contains('hidden')) return;
  enterApp();
}

function initLanding(){`,
  'hash app entry helper'
);

replaceOnce(
`  if(location.hash === '#app') enterApp();`,
`  maybeEnterAppFromHash();`,
  'hash app entry call'
);

replaceOnce(
`initLanding();
bindViewerButtons();
initAuth();
</script>`,
`initLanding();
bindViewerButtons();
initAuth();
maybeEnterAppFromHash();
window.addEventListener('hashchange', maybeEnterAppFromHash);
</script>`,
  'hash app entry after init'
);

writeFileSync(path, html);
console.log('Patched index.html security guards, payment readiness, prompt layout, and app polish');
