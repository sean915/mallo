import { readFileSync, writeFileSync } from 'node:fs';

const path = 'index.html';
let html = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

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
`      $('fbTitle').textContent = '무료 횟수를 다 쓰셨어요 🎉';
      $('fbSub').textContent = '아래 생성권 상품을 확인한 뒤 필요한 상품을 선택해 결제해 주세요. 구매한 생성권은 만료 없이 계속 쓸 수 있어요.';
      $('fbStars').classList.add('hidden');
      $('fbText').classList.add('hidden');
      $('btnFbSend').classList.add('hidden');
      $('payNote').classList.remove('hidden');`,
  'trial over shows product list first'
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
