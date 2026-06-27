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
  .attach-btn{width:36px;height:36px;border-radius:10px;background:#eef7f5;color:#0b7b59;font-size:20px;font-weight:900;flex-shrink:0;display:flex;align-items:center;justify-content:center}
  .attach-btn:hover{background:#ddf3ec}
  .attach-input{display:none}
  .attach-list{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}
  .attach-item{display:inline-flex;align-items:center;gap:7px;max-width:100%;border:1px solid #dce9e7;background:#f8fbfa;color:#344054;border-radius:999px;padding:6px 8px;font-size:12px;font-weight:700}
  .attach-item img{width:22px;height:22px;border-radius:6px;object-fit:cover;background:#e9eef2}
  .attach-item .name{max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .attach-item .meta{color:#7a8793;font-weight:600}
  .attach-item button{width:20px;height:20px;border-radius:50%;background:#e6ecef;color:#667085;font-weight:900;line-height:1}
  .attach-item button:hover{background:#d8e2e5;color:#101828}
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
    .attach-item .name{max-width:112px}
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

replaceOnce(
`        <textarea id=${q}input${q} rows=${q}1${q} placeholder=${q}예) 거래처 연락처 정리하는 표 만들어줘${q}></textarea>
        <button class=${q}send${q} id=${q}btnSend${q} title=${q}만들기${q}>↑</button>`,
`        <button class=${q}attach-btn${q} id=${q}btnAttach${q} title=${q}파일 첨부${q} type=${q}button${q}>＋</button>
        <input class=${q}attach-input${q} id=${q}fileInput${q} type=${q}file${q} accept=${q}image/*,.pdf,.xlsx,.xls,.txt,.csv,.tsv,.json,.md,.html,.xml${q} multiple>
        <textarea id=${q}input${q} rows=${q}1${q} placeholder=${q}예) 거래처 연락처 정리하는 표 만들어줘${q}></textarea>
        <button class=${q}send${q} id=${q}btnSend${q} title=${q}만들기${q}>↑</button>`
);

replaceOnce(
`      <div class=${q}hint${q}>필요한 걸 한국말로 적으면 돼요 · 만든 뒤 ${q}글자 더 크게 해줘${q}처럼 말로 고칠 수 있어요</div>`,
`      <div class=${q}attach-list hidden${q} id=${q}attachList${q}></div>
      <div class=${q}hint${q}>필요한 걸 한국말로 적으면 돼요 · 파일/사진은 참고자료로 첨부할 수 있어요</div>`
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

replaceOnce(
`async function generate(req){
  if(S.busy) return;`,
`async function generate(req, meta={}){
  if(S.busy) return;`
);

replaceOnce(
`  addMsg('user', req);`,
`  addMsg('user', meta.display || req);`
);

if (!html.includes('function formatAttachmentSize(bytes)')) {
  replaceOnce(
`const input = $('input');
function submit(){`,
`const ATTACH_MAX_FILES = 3;
const ATTACH_MAX_BYTES = 5 * 1024 * 1024;
const ATTACH_TEXT_LIMIT = 1500;
const ATTACH_TABLE_ROWS = 40;
const ATTACH_PDF_PAGES = 5;
S.attachments = S.attachments || [];

function formatAttachmentSize(bytes){
  if(bytes < 1024) return bytes + 'B';
  if(bytes < 1024 * 1024) return Math.round(bytes / 1024) + 'KB';
  return (bytes / 1024 / 1024).toFixed(1) + 'MB';
}
function isTextAttachment(file){
  const name = file.name.toLowerCase();
  return /^text\\//.test(file.type) || /\\.(txt|csv|tsv|json|md|html|xml)$/i.test(name);
}
function isSpreadsheetAttachment(file){
  return /\\.(xlsx|xls)$/i.test(file.name);
}
function isPdfAttachment(file){
  return file.type === 'application/pdf' || /\\.pdf$/i.test(file.name);
}
function loadAttachmentScript(src, globalName){
  if(window[globalName]) return Promise.resolve(window[globalName]);
  return new Promise((resolve, reject)=>{
    const old = document.querySelector('script[data-attach-lib=' + globalName + ']');
    if(old){
      old.addEventListener('load', ()=>resolve(window[globalName]));
      old.addEventListener('error', ()=>reject(new Error(globalName + ' 로딩 실패')));
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.dataset.attachLib = globalName;
    s.onload = ()=>window[globalName] ? resolve(window[globalName]) : reject(new Error(globalName + ' 로딩 실패'));
    s.onerror = ()=>reject(new Error(globalName + ' 로딩 실패'));
    document.head.appendChild(s);
  });
}
async function readSpreadsheetAttachment(file){
  const XLSXLib = await loadAttachmentScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', 'XLSX');
  const buf = await file.arrayBuffer();
  const book = XLSXLib.read(buf, { type:'array', cellDates:true });
  const sheetName = book.SheetNames[0];
  const sheet = book.Sheets[sheetName];
  const rows = XLSXLib.utils.sheet_to_json(sheet, { header:1, defval:'' }).slice(0, ATTACH_TABLE_ROWS);
  const table = rows.map(row=>row.map(v=>String(v).replace(/\\s+/g, ' ').trim()).join(' | ')).filter(Boolean).join('\\n');
  return '엑셀 파일: ' + file.name + '\\n첫 시트: ' + (sheetName || 'Sheet1') + '\\n행/열 일부:\\n' + table.slice(0, ATTACH_TEXT_LIMIT) + (rows.length >= ATTACH_TABLE_ROWS ? '\\n...(이하 생략)' : '');
}
async function readPdfAttachment(file){
  const pdfjs = await loadAttachmentScript('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js', 'pdfjsLib');
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data:bytes }).promise;
  const maxPages = Math.min(pdf.numPages || 0, ATTACH_PDF_PAGES);
  const chunks = [];
  for(let p=1; p<=maxPages; p++){
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const text = content.items.map(item=>item.str || '').join(' ').replace(/\\s+/g, ' ').trim();
    if(text) chunks.push('[p.' + p + '] ' + text);
  }
  const body = chunks.join('\\n').slice(0, ATTACH_TEXT_LIMIT);
  return 'PDF 파일: ' + file.name + '\\n페이지: ' + (pdf.numPages || maxPages) + '쪽 중 ' + maxPages + '쪽 읽음\\n내용 일부:\\n' + (body || '텍스트를 찾지 못했어요. 스캔 이미지 PDF라면 핵심 내용을 프롬프트에 함께 적어 주세요.');
}
function getImageSize(file){
  return new Promise(resolve=>{
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>{ const info = { width:img.naturalWidth, height:img.naturalHeight, preview:url }; resolve(info); };
    img.onerror = ()=>{ URL.revokeObjectURL(url); resolve({ width:0, height:0, preview:'' }); };
    img.src = url;
  });
}
async function readAttachment(file){
  if(file.size > ATTACH_MAX_BYTES) throw new Error(file.name + '은 5MB 이하만 첨부할 수 있어요');
  const base = { id:Date.now() + '-' + Math.random().toString(16).slice(2), name:file.name, type:file.type || '알 수 없음', size:file.size };
  if(file.type.startsWith('image/')){
    const info = await getImageSize(file);
    return { ...base, kind:'image', preview:info.preview, text:'이미지 파일: ' + file.name + ' · ' + (info.width ? info.width + 'x' + info.height + 'px · ' : '') + formatAttachmentSize(file.size) + '. 화면 구조, 상품, 분위기, 참고자료로 사용할 수 있습니다. 사진 속 글자를 정확히 읽어야 하면 프롬프트에 핵심 내용을 함께 적어 주세요.' };
  }
  if(isPdfAttachment(file)){
    return { ...base, kind:'pdf', text:await readPdfAttachment(file) };
  }
  if(isSpreadsheetAttachment(file)){
    return { ...base, kind:'sheet', text:await readSpreadsheetAttachment(file) };
  }
  if(isTextAttachment(file)){
    let text = await file.text();
    text = text.replace(/\\u0000/g, '').replace(/\\r\\n/g, '\\n').trim();
    const lines = text.split('\\n').slice(0, 40).join('\\n');
    const clipped = lines.slice(0, ATTACH_TEXT_LIMIT);
    return { ...base, kind:'text', text:'파일명: ' + file.name + '\\n형식: ' + (file.type || 'text') + '\\n내용 일부:\\n' + clipped + (text.length > clipped.length ? '\\n...(이하 생략)' : '') };
  }
  return { ...base, kind:'file', text:'파일명: ' + file.name + '\\n형식: ' + (file.type || '알 수 없음') + '\\n크기: ' + formatAttachmentSize(file.size) + '\\n이 파일은 현재 내용 자동 추출 대상이 아니므로, 필요한 핵심 내용을 프롬프트에 함께 적어 주세요.' };
}
function renderAttachments(){
  const list = $('attachList');
  if(!list) return;
  list.innerHTML = '';
  list.classList.toggle('hidden', !S.attachments.length);
  S.attachments.forEach(item=>{
    const chip = document.createElement('div');
    chip.className = 'attach-item';
    if(item.preview){
      const img = document.createElement('img');
      img.src = item.preview;
      img.alt = '';
      chip.appendChild(img);
    }
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = item.name;
    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = formatAttachmentSize(item.size);
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '×';
    del.title = '첨부 제거';
    del.onclick = ()=>{
      if(item.preview) URL.revokeObjectURL(item.preview);
      S.attachments = S.attachments.filter(a=>a.id !== item.id);
      renderAttachments();
    };
    chip.appendChild(name);
    chip.appendChild(meta);
    chip.appendChild(del);
    list.appendChild(chip);
  });
}
async function addAttachments(files){
  const incoming = Array.from(files || []);
  if(!incoming.length) return;
  const slots = Math.max(0, ATTACH_MAX_FILES - S.attachments.length);
  if(incoming.length > slots) toast('첨부는 최대 ' + ATTACH_MAX_FILES + '개까지 가능해요');
  for(const file of incoming.slice(0, slots)){
    try{ S.attachments.push(await readAttachment(file)); }
    catch(e){ toast(e.message || '파일을 읽지 못했어요'); }
  }
  renderAttachments();
}
function buildAttachmentPrompt(userText){
  if(!S.attachments.length) return userText;
  const base = userText || '첨부한 자료를 참고해서 업무용 웹 도구를 만들어줘';
  const budget = Math.max(700, 3600 - base.length);
  const refs = S.attachments.map((a, i)=>'[' + (i + 1) + '] ' + a.text).join('\\n\\n').slice(0, budget);
  return base + '\\n\\n[첨부 참고자료]\\n' + refs + '\\n\\n[첨부 사용 지침]\\n첨부자료의 항목명, 예시 데이터, 화면 구성 단서, 업무 맥락을 반영하되 앱 안에 첨부 원문 전체를 그대로 노출하지 마세요.';
}
function attachmentLabel(){
  return S.attachments.length ? '\\n첨부: ' + S.attachments.map(a=>a.name).join(', ') : '';
}
function clearAttachments(){
  S.attachments.forEach(a=>{ if(a.preview) URL.revokeObjectURL(a.preview); });
  S.attachments = [];
  renderAttachments();
}

const input = $('input');
function submit(){`
  );
}

replaceOnce(
`  const v = input.value.trim();
  if(!v || S.busy) return;
  input.value = ''; input.style.height = 'auto';
  generate(v);`,
`  const v = input.value.trim();
  if((!v && !S.attachments.length) || S.busy) return;
  const display = (v || '첨부한 자료를 참고해서 도구 만들어줘') + attachmentLabel();
  const prompt = buildAttachmentPrompt(v);
  input.value = ''; input.style.height = 'auto';
  clearAttachments();
  generate(prompt, { display });`
);

replaceOnce(
`$('btnSend').onclick = submit;`,
`$('btnSend').onclick = submit;
$('btnAttach') && ($('btnAttach').onclick = ()=>$('fileInput').click());
$('fileInput') && ($('fileInput').onchange = e=>{ addAttachments(e.target.files); e.target.value = ''; });`
);

writeFileSync(path, html);
console.log('Applied app polish');