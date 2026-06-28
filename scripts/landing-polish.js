import { readFileSync, writeFileSync } from 'node:fs';

const file = 'index.html';
let html = readFileSync(file, 'utf8');

function replaceOnce(pattern, replacement, label) {
  if (typeof replacement === 'string' && html.includes(replacement)) return;
  const next = html.replace(pattern, replacement);
  if (next === html) {
    throw new Error(`landing polish target not found: ${label}`);
  }
  html = next;
}

const polishCss = `  /* landing-polish */
  .landing::before{background:linear-gradient(180deg,rgba(5,5,10,.18),rgba(5,5,10,.78) 62%,#05050a 100%),repeating-linear-gradient(90deg,rgba(255,255,255,.03) 0 1px,transparent 1px 108px)}
  .landing-mark{background:linear-gradient(135deg,#f7f7fb 0 48%,#8be7c5 48% 100%);box-shadow:none}
  .landing-nav .landing-mini-cta{font-weight:800}
  .landing-hero{min-height:calc(84vh - 72px);padding:clamp(34px,6vw,72px) clamp(18px,5vw,72px) 22px}
  .landing-eyebrow{width:auto;text-transform:none;letter-spacing:0;color:#d8fff1;border-color:rgba(139,231,197,.24);background:rgba(139,231,197,.08);font-size:13px;font-weight:800}
  .landing-h1{max-width:840px;font-size:clamp(46px,7vw,92px);line-height:1.02}
  .landing-h1 span{color:#bdf7dc;background:none;-webkit-background-clip:initial;background-clip:initial}
  .landing-lead{max-width:640px;margin-top:22px;color:rgba(247,247,251,.74);font-size:clamp(17px,1.7vw,21px);line-height:1.68}
  .landing-actions{margin-top:28px}
  .landing-platforms{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;color:rgba(247,247,251,.68);font-size:12.5px;font-weight:800}
  .landing-platforms span{border:1px solid rgba(255,255,255,.12);border-radius:8px;background:rgba(255,255,255,.045);padding:8px 10px}
  .landing-path,.landing-stats{display:none}
  .landing-console{box-shadow:0 22px 80px rgba(0,0,0,.34)}
  .landing-console::before{display:none}
  .console-top span{width:8px;height:8px;border-radius:50%;background:rgba(247,247,251,.28)}
  .console-top span:nth-child(1){background:#8be7c5}.console-top span:nth-child(2){background:#f6d782}.console-top span:nth-child(3){background:#8bc7ff}
  .console-prompt{margin:20px 20px 0;padding:16px;border:1px solid rgba(255,255,255,.12);border-radius:8px;background:rgba(5,5,10,.45);color:#f7f7fb;font-size:15px;line-height:1.6}
  .console-reply{margin:12px 20px 0;padding:0 0 0 13px;border-left:2px solid rgba(139,231,197,.75);color:rgba(247,247,251,.72);font-size:14px;line-height:1.65}
  .console-path{display:grid;gap:10px;margin:18px 20px 0}
  .console-step{display:grid;grid-template-columns:74px 1fr;gap:12px;align-items:center;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:rgba(255,255,255,.04);padding:12px}
  .console-step strong{color:#f6d782;font-size:12px;text-transform:none}
  .console-step span{color:rgba(247,247,251,.78);font-size:13px;line-height:1.45}
  .download-stack{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:14px 20px 20px}
  .download-stack span{display:flex;align-items:center;justify-content:center;min-height:34px;border-radius:8px;background:rgba(139,231,197,.1);border:1px solid rgba(139,231,197,.18);color:#d8fff1;font-size:12px;font-weight:800}
  .section-kicker{color:#8be7c5;letter-spacing:0;text-transform:none;font-size:13px}
  .section-title{max-width:820px}
  .feature-card,.usecase-card{background:rgba(255,255,255,.045)}
  .usecase-card:first-child{background:rgba(139,231,197,.09)}
  .flow-strip{grid-template-columns:repeat(4,minmax(0,1fr))}
  .flow-step b{color:#8be7c5}
  @media (max-width:768px){
    .landing-hero{grid-template-columns:1fr;min-height:auto;padding:32px 16px 42px}
    .landing-h1{font-size:clamp(34px,11vw,46px);line-height:1.08}
    .landing-lead{font-size:16.5px}
    .landing-platforms{display:grid;grid-template-columns:1fr 1fr}
    .landing-console{display:none}
    .download-stack{grid-template-columns:1fr}
    .section-title{font-size:clamp(27px,7.7vw,30px);line-height:1.16}
    .flow-strip{grid-template-columns:1fr}
  }`;

if (html.includes('/* landing-polish */')) {
  replaceOnce(/  \/\* landing-polish \*\/[\s\S]*?<\/style>/, `${polishCss}\n</style>`, 'landing polish css refresh');
} else {
  replaceOnce('</style>', `${polishCss}\n</style>`, 'landing polish css');
}

replaceOnce(
  /<div class="landing-navlinks">[\s\S]*?<\/div>\s*<\/nav>/,
  `<div class="landing-navlinks">
      <a class="landing-link" href="#landingFeatures">차이</a>
      <a class="landing-link" href="#landingUsecases">업무화</a>
      <a class="landing-link" href="#landingFlow">과정</a>
      <button class="landing-mini-cta" type="button" data-enter-app>도구 만들기</button>
    </div>
  </nav>`,
  'landing nav'
);

replaceOnce(
  /<main class="landing-hero">[\s\S]*?<\/main>/,
  `<main class="landing-hero">
    <section>
      <p class="landing-eyebrow">한국 업무에 맞춘 도구 제작</p>
      <h1 class="landing-h1">업무를 말하면 <span>바로 쓸 도구로 정리됩니다.</span></h1>
      <p class="landing-lead">고객 관리, 예약 장부, 견적서처럼 매번 엑셀과 메모로 버티던 일을 설명해 주세요. 말로가 화면, 입력 항목, 저장, 검색, 내보내기까지 갖춘 작은 업무앱으로 만듭니다.</p>
      <div class="landing-actions">
        <button class="landing-primary" type="button" data-enter-app>내 업무 도구 만들기</button>
        <button class="landing-secondary" type="button" data-scroll-target="landingFeatures">말로가 다른 점</button>
      </div>
      <div class="landing-platforms" aria-label="말로 사용 방식">
        <span>한국어로 설명</span>
        <span>엑셀·PDF 참고</span>
        <span>웹에서 시연</span>
        <span>PC앱으로 보관</span>
      </div>
    </section>
    <aside class="landing-console" aria-label="말로 제작 예시">
      <div class="console-top"><span></span><span></span><span></span></div>
      <div class="console-prompt">“기존 예약 엑셀을 기준으로 오늘 예약, 고객 연락처, 결제 메모를 한 화면에서 보고 싶어.”</div>
      <div class="console-reply">엑셀 항목을 읽어 예약 목록, 고객 메모, 정산 체크가 이어지는 운영 도구로 정리합니다.</div>
      <div class="console-path" aria-label="제작 흐름">
        <div class="console-step"><strong>이해</strong><span>업무 목적과 필요한 항목을 정리</span></div>
        <div class="console-step"><strong>점검</strong><span>저장, 검색, 수정 흐름을 확인</span></div>
        <div class="console-step"><strong>완성</strong><span>웹앱과 PC앱으로 보관</span></div>
      </div>
      <div class="download-stack" aria-label="저장 방식">
        <span>웹앱</span>
        <span>PC앱</span>
        <span>공유 링크</span>
      </div>
    </aside>
  </main>`,
  'landing hero'
);

replaceOnce(
  /<section class="landing-section" id="landingFeatures">[\s\S]*?<section class="landing-section landing-final">[\s\S]*?<\/section>/,
  `<section class="landing-section" id="landingFeatures">
    <div class="section-kicker">말로가 다른 점</div>
    <h2 class="section-title">프롬프트를 잘 쓰는 사람이 아니라,<br>일을 아는 사람에게 맞췄습니다.</h2>
    <p class="section-copy">말로는 코드를 보여주는 데서 끝나지 않습니다. 한국어 업무 설명과 첨부 자료를 바탕으로 입력, 저장, 검색, 수정, 내보내기까지 실제 사용 흐름을 먼저 잡습니다.</p>
    <div class="feature-grid">
      <article class="feature-card"><div class="num">01</div><h3>한국어 업무 이해</h3><p>거래처, 부가세, 담당자, 상태, 메모처럼 현장에서 자주 쓰는 기본값을 먼저 챙깁니다.</p></article>
      <article class="feature-card"><div class="num">02</div><h3>자료를 구조로 전환</h3><p>엑셀, PDF, 사진을 참고해 항목명과 예시 데이터를 화면 구조로 옮깁니다.</p></article>
      <article class="feature-card"><div class="num">03</div><h3>완성 전 점검</h3><p>첫 화면, 저장, 검색, 수정, 모바일 표시까지 확인한 뒤 바로 써볼 수 있게 만듭니다.</p></article>
      <article class="feature-card"><div class="num">04</div><h3>배포까지 한 번에</h3><p>브라우저에서 시연하고, 링크로 공유하고, PC앱으로 내려받아 계속 씁니다.</p></article>
    </div>
  </section>

  <section class="landing-section" id="landingUsecases">
    <div class="section-kicker">업무화</div>
    <h2 class="section-title">흩어진 자료와 반복 업무를<br>작은 앱으로 바꿉니다.</h2>
    <div class="usecase-grid">
      <article class="usecase-card"><h3>엑셀 장부 재구성</h3><p>기존 표를 참고해 입력 폼, 목록, 합계, 검색, CSV 내보내기가 있는 도구로 만듭니다.</p></article>
      <article class="usecase-card"><h3>고객·예약 운영</h3><p>연락처, 방문 이력, 결제 메모, 다음 연락일을 한 화면에서 관리합니다.</p></article>
      <article class="usecase-card"><h3>견적·정산 계산</h3><p>원화, 부가세, 할인, 마진처럼 자주 계산하는 기준을 업무 화면에 넣습니다.</p></article>
    </div>
  </section>

  <section class="landing-section" id="landingFlow">
    <div class="section-kicker">과정</div>
    <h2 class="section-title">말하고, 확인하고,<br>업무 도구로 남깁니다.</h2>
    <div class="flow-strip">
      <div class="flow-step"><b>01</b><h3>자료와 요구 설명</h3><p>한국어로 필요한 업무를 적고, 엑셀이나 PDF가 있으면 함께 첨부합니다.</p></div>
      <div class="flow-step"><b>02</b><h3>구조화된 앱 생성</h3><p>필드, 화면, 저장, 검색, 내보내기 흐름을 갖춘 도구로 만듭니다.</p></div>
      <div class="flow-step"><b>03</b><h3>바로 써보며 수정</h3><p>생성된 화면에 직접 입력해보고 부족한 부분은 말로 다시 고칩니다.</p></div>
      <div class="flow-step"><b>04</b><h3>공유와 다운로드</h3><p>내 도구함에 저장하고, 링크나 PC앱 형태로 계속 사용합니다.</p></div>
    </div>
  </section>

  <section class="landing-section landing-final">
    <div class="section-kicker">시작하기</div>
    <h2 class="section-title">지금 쓰는 업무 하나를<br>말로 도구로 바꿔보세요.</h2>
    <p class="section-copy">프롬프트를 잘 쓸 필요 없습니다. 평소 설명하듯 적으면 말로가 업무 화면과 기능으로 정리합니다.</p>
    <div class="landing-actions">
      <button class="landing-primary" type="button" data-enter-app>말로 시작하기</button>
    </div>
  </section>`,
  'landing sections'
);

writeFileSync(file, html);
console.log('Polished landing page');
