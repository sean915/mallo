import { readFileSync, writeFileSync } from 'node:fs';

const path = 'index.html';
let html = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

function replaceOnce(before, after) {
  if (html.includes(after) || !html.includes(before)) return;
  html = html.replace(before, after);
}

const q = String.fromCharCode(34);

const appPolishCss = `
  /* app-polish-overrides */
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
    .welcome{padding:20px 16px 4px}
    .tools-grid{padding:12px 14px}
    .tcard{min-height:86px;padding:12px}
    .empty{padding:24px 18px}
    .site-footer{height:42px;flex-basis:42px}
  }`;

if (!html.includes('/* app-polish-overrides */')) {
  replaceOnce('</style>', `${appPolishCss}\n</style>`);
}

replaceOnce(
`  <button class=${q}hbtn primary hidden${q} id=${q}btnCharge${q}>💳 충전</button>
  <button class=${q}hbtn hidden${q} id=${q}btnMyTools${q}>📂 내 도구함</button>
  <button class=${q}hbtn primary hidden${q} id=${q}btnFeedback${q}>💬 피드백</button>
  <button class=${q}hbtn primary hidden${q} id=${q}btnLogin${q}>🔑 로그인</button>`,
`  <button class=${q}hbtn primary hidden${q} id=${q}btnCharge${q}>충전</button>
  <button class=${q}hbtn hidden${q} id=${q}btnMyTools${q}>내 도구함</button>
  <button class=${q}hbtn primary hidden${q} id=${q}btnFeedback${q}>피드백</button>
  <button class=${q}hbtn primary hidden${q} id=${q}btnLogin${q}>로그인</button>`
);

replaceOnce(
`  <button class=${q}mtab active${q} data-pane=${q}make${q}>✏️ 만들기</button>
  <button class=${q}mtab${q} data-pane=${q}preview${q}>👁️ 미리보기</button>`,
`  <button class=${q}mtab active${q} data-pane=${q}make${q}>만들기</button>
  <button class=${q}mtab${q} data-pane=${q}preview${q}>미리보기</button>`
);

replaceOnce(
`      <h2>어떤 도구가 필요하세요? 🛠️</h2>
      <p>아래에서 고르면 <b>바로 만들어 드려요.</b> 누르기만 하면 끝 — 만든 뒤엔 말로 고치고, 입력한 내용은 자동으로 저장돼요.</p>`,
`      <h2>필요한 업무를 말하면 도구가 됩니다</h2>
      <p>원하는 일을 고르거나 아래 입력창에 설명해 주세요. 말로가 바로 실행 가능한 웹 도구로 만들고, 만든 뒤에도 말로 수정할 수 있어요.</p>`
);

replaceOnce(
`      <div class=${q}empty${q} id=${q}empty${q}>
        <div class=${q}big${q}>🛠️</div>
        <h3>아직 만든 도구가 없어요</h3>
        <p>왼쪽에서 필요한 도구를 고르면<br>여기서 바로 만들어지고, 바로 써볼 수 있어요.</p>
      </div>`,
`      <div class=${q}empty${q} id=${q}empty${q}>
        <div class=${q}big${q}>M</div>
        <h3>만들 준비가 완료됐어요</h3>
        <p>왼쪽에서 업무 템플릿을 고르거나 아래 입력창에 필요한 흐름을 말로 설명해 주세요.<br>완성된 도구가 이곳에 바로 나타납니다.</p>
      </div>`
);

replaceOnce(
`      <button class=${q}tcard more${q} id=${q}tcMore${q}>✏️ 직접 말로 만들기</button>`,
`      <button class=${q}tcard more${q} id=${q}tcMore${q}>직접 말로 만들기</button>`
);

if (!html.includes('function maybeEnterAppFromHash()')) {
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

function initLanding(){`
  );
}

replaceOnce(`  if(location.hash === '#app') enterApp();`, `  maybeEnterAppFromHash();`);

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
</script>`
);

writeFileSync(path, html);
console.log('Applied app polish');