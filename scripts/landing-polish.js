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
      <a class="landing-link" href="#landingFeatures">결과물</a>
      <a class="landing-link" href="#landingUsecases">자산화</a>
      <a class="landing-link" href="#landingFlow">흐름</a>
      <button class="landing-mini-cta" type="button" data-enter-app>도구 만들기</button>
    </div>
  </nav>`,
  'landing nav'
);

replaceOnce(
  /<main class="landing-hero">[\s\S]*?<\/main>/,
  `<main class="landing-hero">
    <section>
      <p class="landing-eyebrow">말 한마디로 아이디어를 자산화</p>
      <h1 class="landing-h1">말로 설명하면 <span>내 도구가 됩니다.</span></h1>
      <p class="landing-lead">예약 장부, 고객 관리, 계산표처럼 매번 엑셀로 버티던 일을 말로 설명하세요. 웹에서 바로 써보고, 필요하면 PC앱으로 내려받아 계속 쓸 수 있습니다.</p>
      <div class="landing-actions">
        <button class="landing-primary" type="button" data-enter-app>아이디어로 도구 만들기</button>
        <button class="landing-secondary" type="button" data-scroll-target="landingUsecases">어떻게 남는지 보기</button>
      </div>
      <div class="landing-platforms" aria-label="말로 사용 방식">
        <span>웹에서 바로 사용</span>
        <span>PC앱으로 보관</span>
        <span>말로 계속 수정</span>
        <span>링크로 공유</span>
      </div>
    </section>
    <aside class="landing-console" aria-label="말로 제작 예시">
      <div class="console-top"><span></span><span></span><span></span></div>
      <div class="console-prompt">“예약을 오늘·이번 주로 나누고, 결제 메모랑 고객 연락처를 같이 보고 싶어.”</div>
      <div class="console-reply">예약 목록, 고객 메모, 정산 체크가 한 화면에 있는 운영 도구로 정리합니다.</div>
      <div class="console-path" aria-label="제작 흐름">
        <div class="console-step"><strong>말하기</strong><span>필요한 일을 평소 말투로 설명</span></div>
        <div class="console-step"><strong>써보기</strong><span>브라우저에서 바로 입력하고 확인</span></div>
        <div class="console-step"><strong>남기기</strong><span>내 도구함과 PC앱으로 보관</span></div>
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
    <div class="section-kicker">결과물</div>
    <h2 class="section-title">보기 좋은 화면보다,<br>실제로 쓰는 도구를 남깁니다.</h2>
    <p class="section-copy">입력하고, 저장하고, 검색하고, 다시 고치는 흐름까지 처음부터 업무용으로 만듭니다. 작은 도구라도 내 방식으로 쌓이면 다음 일이 빨라집니다.</p>
    <div class="feature-grid">
      <article class="feature-card"><div class="num">01</div><h3>기록이 남는 구조</h3><p>고객, 예약, 금액, 메모처럼 다시 찾아야 하는 정보를 한곳에 모읍니다.</p></article>
      <article class="feature-card"><div class="num">02</div><h3>말로 다듬는 수정</h3><p>항목 추가, 버튼 이름 변경, 화면 순서 조정까지 대화하듯 고칠 수 있습니다.</p></article>
      <article class="feature-card"><div class="num">03</div><h3>바로 써보는 웹앱</h3><p>설치 전에 브라우저에서 먼저 입력해보고 실제 업무에 맞는지 확인합니다.</p></article>
      <article class="feature-card"><div class="num">04</div><h3>PC에 보관</h3><p>괜찮아진 도구는 Windows, macOS, Linux 앱으로 내려받아 계속 씁니다.</p></article>
    </div>
  </section>

  <section class="landing-section" id="landingUsecases">
    <div class="section-kicker">자산화</div>
    <h2 class="section-title">한 번 만든 도구는 다음 업무의 출발점이 됩니다.</h2>
    <div class="usecase-grid">
      <article class="usecase-card"><h3>고객·상담 기록</h3><p>연락처, 상담 단계, 다음 연락일을 내가 보는 순서대로 정리합니다.</p></article>
      <article class="usecase-card"><h3>예약·정산 관리</h3><p>예약 현황과 결제 메모를 한 화면에서 확인하고 누락을 줄입니다.</p></article>
      <article class="usecase-card"><h3>반복 계산표</h3><p>부가세, 마진, 할인처럼 매번 다시 계산하던 일을 작은 계산기로 만듭니다.</p></article>
    </div>
  </section>

  <section class="landing-section" id="landingFlow">
    <div class="section-kicker">제작 흐름</div>
    <h2 class="section-title">설명하고, 써보고, 필요한 만큼 고칩니다.</h2>
    <div class="flow-strip">
      <div class="flow-step"><b>01</b><h3>필요한 일 설명</h3><p>만들고 싶은 도구를 업무 언어 그대로 적습니다.</p></div>
      <div class="flow-step"><b>02</b><h3>웹에서 확인</h3><p>생성된 화면에 직접 입력해보며 구조를 확인합니다.</p></div>
      <div class="flow-step"><b>03</b><h3>말로 수정</h3><p>부족한 항목이나 버튼을 다시 말해 바로 다듬습니다.</p></div>
      <div class="flow-step"><b>04</b><h3>도구로 보관</h3><p>내 도구함, 공유 링크, PC앱으로 업무 자산을 남깁니다.</p></div>
    </div>
  </section>

  <section class="landing-section landing-final">
    <div class="section-kicker">시작하기</div>
    <h2 class="section-title">머릿속에만 있던 도구를 오늘 하나 남겨보세요.</h2>
    <p class="section-copy">처음부터 완벽할 필요 없습니다. 써보면서 말로 고치고, 괜찮아지면 내 도구함과 PC에 보관하세요.</p>
    <div class="landing-actions">
      <button class="landing-primary" type="button" data-enter-app>말로 시작하기</button>
    </div>
  </section>`,
  'landing sections'
);

writeFileSync(file, html);
console.log('Polished landing page');
