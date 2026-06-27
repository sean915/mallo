import { readFileSync, writeFileSync } from 'node:fs';

const path = 'index.html';
let html = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

const LOCAL_AI_PREVIEW_BRIDGE_SOURCE = "const PREVIEW_AI_BRIDGE = `" + String.raw`
  if(!window.__malloAiBridgeInstalled){
    window.__malloAiBridgeInstalled = true;
    const ko = window.말로 = window.말로 || {};
    const en = window.mallo = window.mallo || ko;
    const HELP = '로컬 AI를 찾지 못했어요. Ollama를 실행하거나 말로 온라인에서 로그인해 AI 기능을 사용해 주세요.';
    const BASES = ['http://127.0.0.1:11434', 'http://localhost:11434'];
    const PREFERRED = ['llama3.2', 'llama3.1', 'qwen2.5', 'gemma3', 'mistral', 'phi4', 'phi3'];
    function storedModel(){ try{ return localStorage.getItem('mallo_local_ai_model') || ''; }catch(e){ return ''; } }
    function fetchJson(url, options, timeoutMs){
      const ctrl = new AbortController();
      const timer = setTimeout(()=>ctrl.abort(), timeoutMs || 8000);
      options = options || {};
      options.signal = ctrl.signal;
      return fetch(url, options).then(res=>{
        if(!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      }).finally(()=>clearTimeout(timer));
    }
    async function chooseModel(base){
      const saved = storedModel();
      if(saved) return saved;
      const data = await fetchJson(base + '/api/tags', { method:'GET' }, 2500);
      const names = ((data && data.models) || []).map(m=>m && m.name).filter(Boolean);
      if(!names.length) throw new Error('설치된 Ollama 모델이 없어요');
      return names.find(name=>{
        const lower = String(name).toLowerCase();
        return PREFERRED.some(prefix=>lower.indexOf(prefix) === 0);
      }) || names[0];
    }
    async function localAi(prompt){
      let last;
      for(const base of BASES){
        try{
          const model = await chooseModel(base);
          const data = await fetchJson(base + '/api/generate', {
            method:'POST',
            headers:{ 'content-type':'application/json' },
            body: JSON.stringify({ model, prompt:String(prompt || ''), stream:false, options:{ temperature:0.4 } })
          }, 60000);
          const text = String((data && (data.response || (data.message && data.message.content))) || '').trim();
          if(text) return text;
          throw new Error('빈 응답');
        }catch(e){ last = e; }
      }
      throw last || new Error(HELP);
    }
    function onlineAi(prompt){
      return new Promise((resolve,reject)=>{
        if(!parent || parent === window){ reject(new Error(HELP)); return; }
        const id = Math.random().toString(36).slice(2);
        listeners[id] = { resolve, reject };
        try{ parent.postMessage({__mallo:'ai',id,prompt:String(prompt||'')},'*'); }
        catch(e){ delete listeners[id]; reject(e); return; }
        setTimeout(()=>{ if(listeners[id]){ delete listeners[id]; reject(new Error('AI 응답 시간이 초과됐어요')); }},60000);
      });
    }
    ko.aiLocal = en.aiLocal = localAi;
    ko.ai = en.ai = async function(prompt){
      try{ return await localAi(prompt); }
      catch(localError){
        try{ return await onlineAi(prompt); }
        catch(e){ throw new Error(HELP); }
      }
    };
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
  "  try{ Object.assign(memory, SEED||{}); patch(); }catch(e){}\n" +
  "${PREVIEW_AI_BRIDGE}\n" +
  "  window.addEventListener('message',e=>{ const d=e.data; if(d&&d.__mallo==='ai_result'&&listeners[d.id]){ const l=listeners[d.id]; delete listeners[d.id]; d.error?l.reject(new Error(d.error)):l.resolve(d.text||''); } });\n" +
  "})();\n" +
  "<\\/script>`;";

function ensureLocalAiPreviewBridge() {
  const anchor = '/* ================== 생성 코드 ↔ 미리보기 데이터 저장 shim ================== */\n';
  if (!html.includes('const PREVIEW_AI_BRIDGE = `')) {
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

replaceOnce(
`    .landing-section{padding:68px 16px}
  }`,
`    .landing-section{padding:68px 16px}
    .site-footer{flex-wrap:wrap;gap:2px 7px;padding:4px 10px;font-size:9px;align-content:center}
    .landing-business{padding:14px 12px 18px;font-size:9px}
  }`,
  'mobile review footer styles'
);

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
      서비스 제공일: 결제 완료 즉시 생성권 충전 · 교환: 디지털 생성권 특성상 다른 상품으로 교환 불가 · 환불: 결제 후 7일 이내 미사용분 환불, 사용분 제외 · <a href="/refund.html" target="_blank">환불 정책 보기</a>
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
`    b.innerHTML = '<div><div class="pn">'+p.name+badge+'</div><div class="pd">'+p.credits+'건 생성권 · 만료 없음 · 즉시 충전</div></div><div class="pv">'+p.price.toLocaleString()+'원<br><span style="font-size:11px;color:#6b7684">결제하기</span></div>';`,
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
`      $('fbTitle').textContent = '무료 생성권을 모두 사용했어요';
      $('fbSub').textContent = '계속 만들려면 필요한 생성권 상품을 선택해 주세요. 구매한 생성권은 만료 없이 사용할 수 있습니다.';
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
  $('fbTitle').textContent = '생성권 충전';
  $('fbSub').textContent = '상품 종류와 가격을 확인한 뒤 결제할 상품을 선택해 주세요.';
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

writeFileSync(path, html);
console.log('Patched index.html security guards, payment readiness, and prompt layout');
