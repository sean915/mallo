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

if (!html.includes('/* landing-polish */')) {
  replaceOnce(
    '</style>',
    `  /* landing-polish */
  .landing-hero{min-height:calc(82vh - 72px);padding:clamp(28px,5vw,62px) clamp(18px,5vw,72px) 16px}
  .landing-h1{font-size:clamp(50px,8vw,104px)}
  .landing-lead{margin-top:22px}
  .landing-actions{margin-top:26px}
  .landing-platforms{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;color:rgba(247,247,251,.66);font-size:12.5px;font-weight:800}
  .landing-platforms span{border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(255,255,255,.055);padding:8px 10px}
  .landing-path,.landing-stats{display:none}
  .console-path{display:grid;gap:10px;margin-top:18px}
  .console-step{display:grid;grid-template-columns:70px 1fr;gap:12px;align-items:center;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.045);padding:12px}
  .console-step strong{color:#f6d782;font-size:12px;text-transform:uppercase}
  .console-step span{color:rgba(247,247,251,.78);font-size:13px;line-height:1.45}
  .download-stack{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:14px}
  .download-stack span{display:flex;align-items:center;justify-content:center;min-height:34px;border-radius:10px;background:linear-gradient(135deg,rgba(250,205,94,.22),rgba(91,199,191,.12));border:1px solid rgba(250,205,94,.2);color:#fff4c7;font-size:12px;font-weight:900}
  .flow-strip{grid-template-columns:repeat(4,minmax(0,1fr))}
  @media (max-width:768px){
    .landing-hero{grid-template-columns:1fr;min-height:auto;padding:28px 16px 38px}
    .landing-h1{font-size:clamp(42px,14vw,64px)}
    .landing-lead{font-size:16.5px}
    .landing-platforms{display:grid;grid-template-columns:1fr 1fr}
    .landing-console{display:none}
    .download-stack{grid-template-columns:1fr 1fr}
    .flow-strip{grid-template-columns:1fr}
  }
</style>`,
    'landing polish css'
  );
}

replaceOnce(
  /<div class="landing-navlinks">[\s\S]*?<\/div>\s*<\/nav>/,
  `<div class="landing-navlinks">
      <a class="landing-link" href="#landingFeatures">결과물</a>
      <a class="landing-link" href="#landingUsecases">사용처</a>
      <a class="landing-link" href="#landingFlow">다운로드</a>
      <button class="landing-mini-cta" type="button" data-enter-app>내 도구 만들기</button>
    </div>
  </nav>`,
  'landing nav'
);

replaceOnce(
  /<main class="landing-hero">[\s\S]*?<\/main>/,
  `<main class="landing-hero">
    <section>
      <p class="landing-eyebrow">개인 아이디어를 내 프로그램으로</p>
      <h1 class="landing-h1">말 한마디가 <span>내 도구가 되는 순간.</span></h1>
      <p class="landing-lead">머릿속에만 있던 아이디어, 엑셀로 버티던 반복 업무를 말로 설명하세요. 말로가 바로 쓸 수 있는 웹앱으로 만들고, Windows·Mac·Linux 앱으로 내려받아 내 PC에 오래 남깁니다.</p>
      <div class="landing-actions">
        <button class="landing-primary" type="button" data-enter-app>내 아이디어로 시작하기</button>
        <button class="landing-secondary" type="button" data-scroll-target="landingFlow">다운로드까지 보기</button>
      </div>
      <div class="landing-platforms" aria-label="지원 플랫폼">
        <span>Web App</span>
        <span>Windows</span>
        <span>macOS</span>
        <span>Linux</span>
      </div>
    </section>
    <aside class="landing-console" aria-label="Mallo creation preview">
      <div class="console-top"><span></span><span></span><span></span></div>
      <div class="console-prompt">“우리 가게 예약, 결제 메모, 고객 연락까지 한 화면에서 관리하고 싶어.”</div>
      <div class="console-reply">입력 폼, 검색, 저장, 수정, 내보내기까지 갖춘 개인 업무 프로그램으로 바꿉니다.</div>
      <div class="console-path" aria-label="제작 흐름">
        <div class="console-step"><strong>Step 1</strong><span>아이디어를 말로 설명</span></div>
        <div class="console-step"><strong>Step 2</strong><span>웹앱으로 바로 사용</span></div>
        <div class="console-step"><strong>Step 3</strong><span>PC앱으로 다운로드</span></div>
      </div>
      <div class="download-stack" aria-label="다운로드 옵션">
        <span>Web</span>
        <span>Windows</span>
        <span>Mac</span>
        <span>Linux</span>
      </div>
    </aside>
  </main>`,
  'landing hero'
);

replaceOnce(
  /<section class="landing-section" id="landingFeatures">[\s\S]*?<section class="landing-section landing-final">[\s\S]*?<\/section>/,
  `<section class="landing-section" id="landingFeatures">
    <div class="section-kicker">What you get</div>
    <h2 class="section-title">결과물은 소개 페이지가 아니라 실제로 쓰는 내 프로그램입니다.</h2>
    <p class="section-copy">예쁜 화면에서 멈추지 않습니다. 입력하고, 저장하고, 검색하고, 수정하고, 내보내는 기능까지 개인 업무 흐름에 맞춰 하나의 도구로 만듭니다.</p>
    <div class="feature-grid">
      <article class="feature-card"><div class="num">01</div><h3>내 아이디어</h3><p>반복 업무, 예약 관리, 고객 기록, 계산표처럼 지금 나에게 필요한 도구를 말합니다.</p></article>
      <article class="feature-card"><div class="num">02</div><h3>말 한마디 제작</h3><p>버튼, 입력 폼, 목록, 저장 방식까지 자연어로 수정하며 원하는 형태에 가까워집니다.</p></article>
      <article class="feature-card"><div class="num">03</div><h3>웹앱 즉시 사용</h3><p>설치 전에도 브라우저에서 먼저 써보고 실제 업무에 맞는지 확인할 수 있습니다.</p></article>
      <article class="feature-card"><div class="num">04</div><h3>PC앱 다운로드</h3><p>Windows, macOS, Linux 버전으로 내려받아 내 컴퓨터에 오래 보관하고 씁니다.</p></article>
    </div>
  </section>

  <section class="landing-section" id="landingUsecases">
    <div class="section-kicker">Why it matters</div>
    <h2 class="section-title">아이디어가 내 PC에 남는 순간, 작은 업무 자산이 됩니다.</h2>
    <div class="usecase-grid">
      <article class="usecase-card"><h3>나만의 영업 CRM</h3><p>고객 메모, 상담 단계, 후속 연락일을 한 화면에서 관리합니다.</p></article>
      <article class="usecase-card"><h3>우리 가게 운영판</h3><p>예약, 결제 메모, 재고, 알림처럼 매일 보는 정보를 한곳에 모읍니다.</p></article>
      <article class="usecase-card"><h3>개인 프로젝트 OS</h3><p>아이디어, 할 일, 파일 링크, 진행 상태를 나만의 방식으로 정리합니다.</p></article>
    </div>
  </section>

  <section class="landing-section" id="landingFlow">
    <div class="section-kicker">From idea to app</div>
    <h2 class="section-title">아이디어 하나가 웹앱과 PC앱으로 완성되는 흐름.</h2>
    <div class="flow-strip">
      <div class="flow-step"><b>Step 1</b><h3>아이디어 입력</h3><p>만들고 싶은 도구를 한 문장으로 말합니다.</p></div>
      <div class="flow-step"><b>Step 2</b><h3>도구 생성</h3><p>말로가 실제 조작 가능한 웹앱으로 만듭니다.</p></div>
      <div class="flow-step"><b>Step 3</b><h3>말로 수정</h3><p>필드, 버튼, 화면 흐름을 대화로 다듬습니다.</p></div>
      <div class="flow-step"><b>Step 4</b><h3>PC에 저장</h3><p>Windows, Mac, Linux 앱으로 내려받아 계속 씁니다.</p></div>
    </div>
  </section>

  <section class="landing-section landing-final">
    <div class="section-kicker">Start now</div>
    <h2 class="section-title">“이거 나한테 딱 필요한데?” 싶은 첫 도구를 지금 만드세요.</h2>
    <p class="section-copy">아이디어를 말하면 말로가 프로그램으로 바꿉니다. 웹에서 바로 써보고, 마음에 들면 내 PC에 내려받아 오래 쓰세요.</p>
    <div class="landing-actions">
      <button class="landing-primary" type="button" data-enter-app>내 첫 도구 만들기</button>
    </div>
  </section>`,
  'landing sections'
);

writeFileSync(file, html);
console.log('Polished landing page');
