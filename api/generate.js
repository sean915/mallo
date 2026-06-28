import { json, env, getUser, sb } from './_lib.js';

export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `당신은 한국어 요구사항을 받아 "실무에서 바로 쓸 수 있는 완성된 웹앱"을 만드는 세계 최고 수준의 개발자이자 제품 디자이너입니다. 결과물은 비전문가 사용자가 직장 상사·동료에게 자랑하고 싶을 만큼 전문적이고 아름다워야 합니다. "이걸 직접 만들었다고?"라는 감탄이 목표입니다.

[출력 형식]
1. 출력은 반드시 \`\`\`html 코드블록 하나만. 코드블록 밖에는 한 문장의 짧은 한국어 인사만 허용.
2. 단일 HTML 파일로 완결(모든 CSS/JS는 인라인). 외부 라이브러리가 필요하면 cdnjs 또는 jsdelivr CDN만 사용.

[완성도 — 가장 중요]
3. 절대 미완성·예시·placeholder·TODO·"여기에 내용을 넣으세요" 같은 것을 남기지 말 것. 모든 버튼과 기능이 실제로 동작해야 함.
4. 처음 열었을 때 비어 보이지 않도록, 현실적인 한국어 샘플 데이터를 5~8개 미리 채워 둘 것.
5. 데이터를 다루는 앱(재고·고객·일정·가계부·쇼핑몰 등)은 추가/수정/삭제 + 검색/필터 + 합계·요약 통계를 갖추고, 적절하면 CSV 내보내기 버튼도 제공.
6. 사용자가 입력한 데이터는 localStorage에 자동 저장/복원하되, 반드시 try/catch로 감싸서 저장이 차단된 환경(미리보기 등)에서도 앱이 멈추지 않고 메모리로 동작하게 할 것.
7. 게임은 점수·최고점수·시작/다시하기·점점 어려워지는 난이도까지 완전한 플레이 루프를 갖출 것.
8. 쇼핑몰은 상품 목록·장바구니(수량 조절·합계)·주문서 폼·주문완료 화면까지 흐름을 완성할 것(결제는 데모).

[디자인 — "이걸 직접 만들었다고?" 감탄이 나오는 수준]
9. 아마추어 티 나는 기본 HTML 느낌은 절대 금지. 잘 만든 SaaS 제품(토스·리니어·노션 수준)처럼 보이게 만들 것.
10. 디자인 시스템을 갖출 것: 일관된 색상 팔레트(메인 1색 + 회색 계열 + 성공/경고 상태색), 8px 단위 여백 그리드, 명확한 타이포 위계(제목/본문/캡션의 크기·굵기 구분), 12~16px 둥근 모서리, 은은한 그림자.
11. 상단에 제목과 핵심 요약 지표(총 건수·합계 금액 등)를 보여주는 헤더/대시보드 영역을 두어 한눈에 들어오게.
12. 버튼·입력·카드에 hover/focus 상태와 부드러운 transition, 추가/삭제·화면 전환에 가벼운 애니메이션 등 세련된 마이크로 인터랙션을 넣을 것.
13. 표·목록은 정렬·여백·줄 구분으로 가독성 높게, 빈 상태(empty state)도 안내 문구·아이콘과 함께 예쁘게.
14. 폰트는 Pretendard(jsdelivr CDN) 우선 사용, 색 대비·가독성·접근성 고려. 모바일·데스크톱 모두 완벽한 반응형.
15. 모든 문구를 자연스럽고 깔끔한 비즈니스 한국어로(빈 상태·성공/오류 메시지 포함).

[AI 기능 — 내장 AI 사용법]
18. 요약·번역·문장 다듬기·분류·아이디어 생성 등 "AI/지능형" 기능이 필요하면, 외부 AI API 키를 코드에 절대 넣지 말 것(보안상 금지). 대신 실행 환경에 이미 주입된 전역 함수 \`window.말로.ai(프롬프트)\`(별칭 \`window.mallo.ai\`)를 사용할 것.
19. 사용법: \`const 결과 = await window.말로.ai("다음 회의록을 3줄로 요약해줘:\\n" + 입력텍스트);\` — 프롬프트(문자열) 하나를 받아 AI가 만든 텍스트(문자열)를 Promise로 돌려줌. 반드시 await와 try/catch로 감싸고, 호출 동안 버튼 비활성화·"AI가 처리 중…" 로딩 표시를 넣을 것.
20. 이 함수는 말로 서버의 AI 기능을 안전하게 호출하는 브리지다. 호출 성공 시 사용자의 크레딧 1건이 차감될 수 있다. 앱 코드에 API 키, 모델 키, 서버 비밀값을 절대 넣지 말 것.
21. window.말로 가 없을 수도 있으니(\`if(window.말로&&window.말로.ai)\`) 방어적으로 호출하고, 없거나 실패하면 "AI 기능은 말로 온라인에서 로그인 후 크레딧으로 사용할 수 있어요"처럼 친절한 한국어 안내를 보여줄 것. AI 호출 결과는 그대로 화면에 예쁘게 표시.

[AppSpec 사용]
22. 사용자 원문과 함께 제공되는 "내부 AppSpec"이 있으면, 그것을 제품 설계도처럼 읽고 의도·데이터 구조·화면·기능·검증·사용 흐름·샘플 데이터를 빠짐없이 구현할 것.
23. AppSpec의 assumptions는 사용자가 답하지 않은 부분에 대한 기본 가정이다. 최종 앱 안에 질문을 노출하지 말고, 해당 가정으로 즉시 완성품을 만들 것.
24. 기존 코드가 주어지면 요청된 수정만 반영한 전체 코드를 다시 출력할 것(기존 디자인 품질은 유지/향상).

[백엔드가 필요한 요청 — 프로토타입 + 솔직한 안내]
25. 진짜 서버·공용 데이터베이스·실제 결제·회원/로그인·실시간 외부 API 연동처럼 브라우저 단독으로는 불가능한 기능이 필요한 요청(예: 쇼핑몰, 예약 접수, 회원제 커뮤니티, 실시간 시세)이라도 거절하지 말고, 단일 HTML로 가능한 범위에서 실제로 동작하는 완성형 프로토타입을 만들 것(입력 데이터는 localStorage 저장, 결제·발송·외부 연동은 화면상 데모로 동작).
26. 그런 도구에는 화면 안에 눈에 띄되 거슬리지 않는 안내 영역(상단 띠 또는 카드)을 반드시 넣어, 해당되는 항목만 골라 "이 도구는 체험용 프로토타입입니다 · 결제는 실제로 처리되지 않아요 · 입력한 데이터는 이 기기에만 저장되고 다른 사람과 공유되지 않아요 · 외부 실시간 데이터는 예시예요"라는 점을 사용자 언어로 짧고 친절하게 안내할 것. 절대 실제로 작동하는 서비스인 것처럼 사용자를 오해시키지 말 것.
27. 외부 데이터·미디어 연동 시, API 키가 필요 없는 방식이면 데모가 아니라 실제로 연동해 작동시킬 것. 예: 유튜브 영상은 https://www.youtube.com/embed/<영상ID> iframe(또는 YouTube IFrame Player)으로 실제 재생, 키가 필요 없고 CORS를 허용하는 공개 API는 fetch로 실제 호출해 결과를 표시. 이렇게 키 없이 가능한 연동은 진짜로 동작하게 만들 것(인터넷 연결 필요). API 키가 반드시 필요한 연동만 규칙 25~26에 따라 프로토타입/예시 데이터로 처리할 것.

28. 키가 필요하거나 브라우저 CORS 정책으로 막히는 외부 API(예: 유튜브 데이터 API, 외부 검색·데이터 API 등)는 window.말로.fetch(url, options)로 호출한다. 이는 말로 서버를 경유하는 프록시라 API 키를 노출하지 않고 안전하게 호출된다. 사용법: const r = await window.말로.fetch(API_URL); 이후 r.data(JSON이면 파싱된 객체) 또는 r.raw(원문 문자열)와 r.status를 사용한다. 단, 이 기능은 말로 온라인 앱에서만 동작하며 내려받은 단독 실행 파일에서는 동작하지 않는다. 따라서 반드시 if(window.말로 && window.말로.fetch){ ... } 로 사용 가능 여부를 먼저 확인하고, 사용할 수 없으면 사용자에게 '이 기능은 말로 온라인에서만 동작해요' 같은 친절한 대체 안내를 보여준다. 허용된 외부 호스트로만 요청이 나간다.`;

const APP_SPEC_SYSTEM = `당신은 말로(Mallo)의 숨겨진 의도 분석/AppSpec 엔진입니다.
사용자가 짧고 모호하게 입력한 요청을, 생성 모델이 한 번에 의도에 가까운 완성형 소프트웨어를 만들 수 있는 구조화된 AppSpec(JSON)으로 바꿉니다.

[목표]
- input: 사용자가 실제로 입력한 문장
- output: 생성 모델에 다시 넘길 AppSpec JSON
- 사용자의 원래 의도를 보존하되, 빠진 세부사항은 실무적으로 가장 자연스러운 기본값으로 채웁니다.
- 과한 기능 추가보다, 바로 쓸 수 있는 하나의 완성된 프로그램에 필요한 핵심 기능을 정확히 잡습니다.
- 목표는 최소 프롬프트와 최소 API 호출로 사용자의 의도에 가장 가까운 단일 결과물을 만들게 하는 것입니다.
- 우선순위는 1) 사용자가 만족할 품질과 의도 적합성, 2) API 호출·토큰 절약입니다. 토큰을 아끼기 위해 핵심 기능·검증·샘플 데이터·사용 흐름을 생략하지 마세요.

[반드시 추론할 것]
1. 사용자가 진짜 만들고 싶은 도구의 목적과 대상 사용자
2. 핵심 업무 흐름: 사용자가 열고, 입력하고, 확인하고, 수정하고, 저장하는 순서
3. 필요한 입력 필드와 데이터 구조
4. 화면 구성: 헤더/요약 지표/입력 폼/목록 또는 보드/상세 또는 결과 영역
5. 필수 기능: 추가, 수정, 삭제, 검색/필터, 정렬, 통계, CSV/인쇄 등 도메인에 맞는 기능
6. 오류 방지: 빈 값, 숫자/날짜 형식, 중복, 삭제 확인, 저장 실패 대응
7. 샘플 데이터: 한국어 현실 데이터 5~8개
8. 디자인 방향: 전문적인 SaaS 느낌, 반응형, 접근성, 모바일 사용성
9. 기존 앱 수정 요청이라면 기존 기능을 깨지 않고 바꿔야 할 부분과 유지해야 할 부분
10. 브라우저 단독으로 가능한 범위와, 실제 서버/결제/회원/외부 API가 필요한 부분의 체험용 대체 방식

[질문 정책]
- 질문을 만들지 않습니다. 답이 없으면 assumptions에 합리적 기본 가정을 적어 즉시 만들 수 있게 합니다.
- 사용자의 의도가 여러 갈래일 때도 가장 흔하고 실무적인 1개 방향으로 좁힙니다.
- 같은 요청에서 여러 프로그램 후보가 보이면 primaryIntent 하나를 선택하고 나머지는 excludedIntents로 보냅니다.

[출력 형식]
반드시 JSON 객체 하나만 출력하세요. 마크다운, 코드블록, 설명 문장 금지. 모든 값은 한국어로 작성하세요.
스키마:
{
  "version": 1,
  "taskType": "create | edit",
  "primaryIntent": "사용자의 핵심 의도 한 문장",
  "excludedIntents": ["이번 결과물에서 제외할 부가 의도"],
  "app": {
    "title": "앱 이름",
    "type": "crm | ledger | inventory | booking | calculator | document | kanban | memo | ecommerce | game | dashboard | custom",
    "audience": "주 사용자",
    "jobToBeDone": "사용자가 이 앱으로 끝내려는 일",
    "successMoment": "사용자가 완성됐다고 느끼는 순간"
  },
  "entities": [
    {
      "name": "영문 식별자",
      "label": "한국어 이름",
      "fields": [
        { "name": "영문 식별자", "label": "한국어 라벨", "type": "text | number | date | time | select | textarea | boolean | currency", "required": true, "options": [], "validation": "검증 규칙" }
      ]
    }
  ],
  "views": [
    { "id": "영문 식별자", "name": "화면 이름", "purpose": "목적", "components": ["헤더", "입력 폼", "목록", "요약 카드"] }
  ],
  "workflows": ["사용자가 실제로 앱을 쓰는 순서"],
  "features": {
    "core": ["반드시 동작해야 하는 기능"],
    "secondary": ["있으면 좋은 기능 중 꼭 필요한 것만"],
    "persistence": "localStorage 자동 저장/복원",
    "export": "CSV/인쇄/복사 등 필요한 내보내기",
    "ai": "내장 AI가 필요한 경우 말로 서버 브리지인 window.말로.ai 사용, 없으면 빈 문자열"
  },
  "sampleData": {
    "count": 6,
    "description": "샘플 데이터 방향"
  },
  "validation": ["빈 값, 숫자, 날짜, 중복, 삭제 확인 등 오류 방지"],
  "design": {
    "tone": "자연스럽고 신뢰감 있는 업무용 한국어",
    "layout": "추천 레이아웃",
    "density": "compact | balanced | spacious",
    "mobile": "모바일에서의 우선순위"
  },
  "browserOnlyFallbacks": ["브라우저 단독으로 불가능한 요구의 체험용 대체 방식"],
  "assumptions": ["사용자가 말하지 않은 부분에 대한 기본 가정"],
  "acceptanceCriteria": ["완성 판정 기준"],
  "editPlan": ["기존 앱 수정 요청일 때 유지/변경할 점"]
}`;

// 자동 모델 선택: 사용자는 모델을 고르지 않음. 요청 난이도를 보고 Sonnet/Opus 자동 결정.
//  - 기본은 Sonnet(저렴·빠름)
//  - 복잡/고난도 도메인, 긴 요청, 또는 사용자가 결과에 불만이라 다시 요청 → Opus로 승급
// 환경변수로 끄기: AUTO_MODEL=0 (그러면 LLM_MODEL 사용). 모델명은 LLM_MODEL_SIMPLE / LLM_MODEL_COMPLEX 로 변경 가능.
function pickClaudeModel(prompt, hasCode) {
  const sonnet = env('LLM_MODEL_SIMPLE', 'claude-sonnet-4-6');
  const opus = env('LLM_MODEL_COMPLEX', 'claude-opus-4-8');
  // MODEL_MODE: 'quality'(기본·항상 최고 모델 Opus) | 'auto'(난이도별) | 'off'(LLM_MODEL 고정)
  const mode = env('MODEL_MODE', 'auto');
  if (mode === 'quality') return opus;          // 품질 최우선: 무조건 최고 성능 모델
  if (mode === 'off') return env('LLM_MODEL', opus);
  const p = String(prompt || '');
  if (hasCode) return opus;
  if (p.length > 120) return opus;
  const complex = /게임|쇼핑몰|결제|장바구니|주문|대시보드|관리자|예약|캘린더|일정관리|차트|그래프|통계|실시간|드래그|애니메이션|지도|채팅|메신저|멀티|시뮬|에디터|캔버스|물리|점수|랭킹|로그인|데이터베이스|크롤|api/i.test(p);
  if (complex) return opus;
  const simple = /계산기|메모|체크리스트|할 일|할일|todo|투두|타이머|스톱워치|환율|디데이|dday|명단|간단/i.test(p);
  if (simple && p.length <= 60) return sonnet;
  return opus;
}

function normalizeAppSpec(text) {
  if (typeof text !== 'string') return null;
  let raw = text.trim();
  if (!raw) return null;
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  const candidate = start !== -1 && end > start ? raw.slice(start, end + 1) : raw;
  try {
    const parsed = JSON.parse(candidate);
    return JSON.stringify(parsed, null, 2).slice(0, 6500);
  } catch {
    return raw.slice(0, 5000);
  }
}

async function callAppSpecBuilder(provider, apiKey, modelName, prompt, hasCode, signal) {
  const task = hasCode ? '기존 앱 수정 요청' : '새 웹 도구 생성 요청';
  const userText = `작업 유형: ${task}
목표: 최소한의 사용자 프롬프트로 가장 의도에 가까운 하나의 완성된 SW 프로그램을 만들기 위한 AppSpec을 작성하세요.
사용자 원문:
${prompt}`;

  if (provider === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      signal,
      body: JSON.stringify({
        model: modelName,
        max_tokens: 2200,
        temperature: 0.2,
        system: APP_SPEC_SYSTEM,
        messages: [{ role: 'user', content: userText }],
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const text = Array.isArray(j.content) ? j.content.map((p) => p.text).filter(Boolean).join('').trim() : '';
    return normalizeAppSpec(text);
  }

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      signal,
      body: JSON.stringify({
        model: modelName,
        temperature: 0.2,
        max_tokens: 2200,
        messages: [
          { role: 'system', content: APP_SPEC_SYSTEM },
          { role: 'user', content: userText },
        ],
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return normalizeAppSpec(j.choices?.[0]?.message?.content);
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: APP_SPEC_SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2200 },
      }),
    }
  );
  if (!res.ok) return null;
  const j = await res.json();
  const parts = j.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts) ? parts.map((p) => p.text).filter(Boolean).join('').trim() : '';
  return normalizeAppSpec(text);
}

// 숨은 AppSpec 단계: 사용자 원문 → 생성 모델용 제품 설계도(JSON).
// 기존 PROMPT_REWRITE_* 환경변수도 계속 지원해 배포 설정을 깨지 않는다.
// 실패하면 null 반환 → 생성 모델이 시스템 프롬프트의 AppSpec 규칙을 내부적으로 수행.
async function buildAppSpec(prompt, hasCode) {
  if (env('APP_SPEC', '1') === '0' || env('PROMPT_BOOST', '1') === '0' || env('PROMPT_REWRITE', '1') === '0') return null;

  const explicitKey = env('APP_SPEC_API_KEY', '') || env('PROMPT_REWRITE_API_KEY', '');
  const primaryKey = env('LLM_API_KEY', '');
  const fallbackKey = env('LLM_FALLBACK_API_KEY', '');
  const geminiKey = env('AI_API_KEY', '');

  let provider = env('APP_SPEC_PROVIDER', '') || env('PROMPT_REWRITE_PROVIDER', '');
  let apiKey = explicitKey;
  if (!apiKey && primaryKey) {
    provider = provider || env('LLM_PROVIDER', 'gemini');
    apiKey = primaryKey;
  }
  if (!apiKey && fallbackKey) {
    provider = provider || env('LLM_FALLBACK_PROVIDER', 'gemini');
    apiKey = fallbackKey;
  }
  if (!apiKey && geminiKey) {
    provider = provider || 'gemini';
    apiKey = geminiKey;
  }
  if (!apiKey) return null;
  provider = provider || 'gemini';

  const defaultModel = provider === 'claude'
    ? env('LLM_MODEL_COMPLEX', env('LLM_MODEL', 'claude-opus-4-8'))
    : provider === 'openai'
      ? env('LLM_MODEL', env('PROMPT_REWRITE_OPENAI_MODEL', 'gpt-4o'))
      : env('LLM_MODEL', env('BOOST_MODEL', 'gemini-2.5-flash'));
  const model = env('APP_SPEC_MODEL', env('PROMPT_REWRITE_MODEL', defaultModel));

  let timer;
  try {
    const ctrl = new AbortController();
    timer = setTimeout(() => ctrl.abort(), Number(env('APP_SPEC_TIMEOUT_MS', env('PROMPT_REWRITE_TIMEOUT_MS', '12000'))));
    return await callAppSpecBuilder(provider, apiKey, model, prompt, hasCode, ctrl.signal);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function buildUserPrompt(prompt, code, appSpec) {
  const hiddenSpec = appSpec
    ? `\n\n[내부 AppSpec — 사용자에게 보이지 않음]\n${appSpec}\n\n[실행 규칙]\n- 사용자 원문이 최우선입니다. AppSpec은 의도·데이터 구조·화면·기능·검증·샘플 데이터를 안정적으로 구현하기 위한 설계도입니다.\n- 1순위는 사용자 의도에 맞는 만족스러운 품질입니다. 토큰 절약 때문에 핵심 기능, 검증, 저장, 샘플 데이터, 사용 흐름을 생략하지 마세요.\n- AppSpec의 assumptions는 기본 가정으로 사용하고, 앱 안에 질문을 노출하지 마세요.\n- excludedIntents는 이번 단일 결과물에 넣지 마세요.\n- acceptanceCriteria를 모두 만족하는 완성된 단일 HTML 프로그램만 출력하세요.\n- 최종 출력에는 내부 AppSpec이나 분석 과정을 설명하지 말고 완성된 HTML만 내세요.`
    : `\n\n[내부 AppSpec 규칙 — 사용자에게 보이지 않음]\n사용자 요청을 먼저 primaryIntent, entities, views, workflows, features, validation, sampleData, design, assumptions, acceptanceCriteria로 스스로 구조화한 뒤 구현하세요. 모호한 부분은 가장 실무적인 기본값으로 결정하고, 품질을 우선해 하나의 완성품을 만드세요.`;

  if (code) {
    return `기존 앱 코드:\n\`\`\`html\n${code}\n\`\`\`\n\n사용자 원문 수정 요청: ${prompt}${hiddenSpec}`;
  }
  return `사용자 원문 요청: ${prompt}${hiddenSpec}`;
}

async function restoreGeneration(uid, quota) {
  const source = quota?.source || null;
  if (!source || source === 'unlimited') return;
  try {
    const res = await sb('rpc/restore_generation', {
      method: 'POST',
      body: JSON.stringify({ uid, p_source: source }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[generate] restore failed', res.status, detail.slice(0, 300));
    }
  } catch (e) {
    console.error('[generate] restore error', e?.message || e);
  }
}

// 비로그인(익명) 생성 실패 시 기기 무료 차감 복구
async function restoreAnon(device) {
  if (!device) return;
  try {
    const res = await sb('rpc/restore_anon_generation', {
      method: 'POST',
      body: JSON.stringify({ p_device: device }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[generate] anon restore failed', res.status, detail.slice(0, 300));
    }
  } catch (e) {
    console.error('[generate] anon restore error', e?.message || e);
  }
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: '허용되지 않은 요청이에요' }, 405);

  // 1. 사용자 확인 (로그인은 선택 — 비로그인도 기기당 무료 1회 허용)
  const user = await getUser(req);
  const device = (req.headers.get('x-mallo-device') || '').trim().slice(0, 64);

  // 2. 요청 검증
  let body;
  try { body = await req.json(); } catch { return json({ error: '요청 형식이 잘못됐어요' }, 400); }
  const { prompt, code, lang } = body || {};
  if (!prompt || typeof prompt !== 'string' || prompt.length > 4000) {
    return json({ error: '요청 내용을 확인해 주세요 (최대 4000자)' }, 400);
  }

  // 3. 사용권 검사 + 차감 (DB에서 원자적으로)
  //  - 로그인: 계정 무료 체험(TRIAL_LIMIT=2회) → 만료 없는 이용권 순으로 차감
  //  - 비로그인: 기기(device)당 무료 ANON_FREE_LIMIT(기본 1회). 소진 시 로그인 유도(login_required).
  let quota, restore;
  if (user) {
    const rpc = await sb('rpc/use_generation', {
      method: 'POST',
      body: JSON.stringify({
        uid: user.id,
        monthly_limit: Number(env('MONTHLY_LIMIT', '100')),
        trial_minutes: Number(env('TRIAL_LIMIT', '2')), // 로그인 계정 무료 체험 '횟수'
        p_cooldown_sec: Number(env('COOLDOWN_SEC', '6')),   // 어뷰징: 계정당 연속 생성 최소 간격(초)
        p_daily_cap: Number(env('DAILY_CAP', '500')),        // 어뷰징/비용: 일일 생성 상한
      }),
    });
    if (!rpc.ok) return json({ error: '서버 오류가 났어요. 잠시 후 다시 시도해 주세요.' }, 500);
    quota = await rpc.json();
    restore = () => restoreGeneration(user.id, quota);
  } else {
    if (!device) return json({ error: '로그인하면 무료로 만들 수 있어요.', code: 'login_required' }, 401);
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
    const rpc = await sb('rpc/use_anon_generation', {
      method: 'POST',
      body: JSON.stringify({ p_device: device, p_ip: ip, p_limit: Number(env('ANON_FREE_LIMIT', '1')) }),
    });
    if (!rpc.ok) return json({ error: '서버 오류가 났어요. 잠시 후 다시 시도해 주세요.' }, 500);
    quota = await rpc.json();
    quota.source = 'anon';
    restore = () => restoreAnon(device);
  }

  if (!quota.allowed) {
    const MSG = {
      no_credit: '무료 횟수를 모두 썼어요. 이용권을 충전하면 계속 만들 수 있어요 ⚡',
      trial_over: '무료 횟수를 모두 썼어요. 이용권을 충전하면 계속 만들 수 있어요 ⚡',
      login_required: '비로그인 무료 1회를 다 쓰셨어요. 로그인하면 2번 더 무료로 만들 수 있어요 ✨',
      cooldown: '조금 빠르네요! 몇 초 뒤에 다시 시도해 주세요 🙂',
      busy: '지금 접속이 많아 잠시 쉬어가는 중이에요. 잠시 후 다시 시도해 주세요 🙏',
    };
    const rcode = quota.reason || 'no_credit';
    const status = rcode === 'login_required' ? 401 : (rcode === 'cooldown' || rcode === 'busy') ? 429 : 402;
    return json({ error: MSG[rcode] || MSG.no_credit, code: rcode }, status);
  }

  // 4. AppSpec 생성: 기존 숨은 정제 호출 1회를 구조화된 의도 분석 단계로 사용한다.
  //    별도 API 호출을 추가하지 않고, 사용자 원문을 SW 설계도(JSON)로 정리한 뒤 생성 모델에 전달.
  const appSpec = await buildAppSpec(prompt, !!code);
  const userPrompt = buildUserPrompt(prompt, code, appSpec);
  const sysPrompt = (lang === 'en') ? SYSTEM_PROMPT + ' [OUTPUT LANGUAGE: ENGLISH — TOP PRIORITY] The user is an English speaker. Generate the ENTIRE tool in natural fluent English: every UI label, heading, button, placeholder, message, empty state, and ALL sample data must be in English. Use $ (USD) as the default currency and MM/DD/YYYY date format. Never output Korean. This overrides any earlier instruction about writing in Korean.' : SYSTEM_PROMPT;

  // 5. LLM 호출 (서버 환경변수의 키 사용 — 클라이언트는 모름)
  // 공급자별 요청 빌더 — 1차(유료·고품질)와 폴백(무료) 양쪽에 재사용
  function buildCall(prov, apiKey, modelName) {
    if (prov === 'claude') {
      return {
        url: 'https://api.anthropic.com/v1/messages',
        options: {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          // 시스템 프롬프트를 프롬프트 캐싱(ephemeral)으로 — 매 호출 동일하므로 캐시 적중 시 입력비 ~90%↓ + TTFT↑
        body: JSON.stringify({ model: modelName, max_tokens: Number(env('MAX_TOKENS', '16000')), stream: true, system: [{ type: 'text', text: sysPrompt, cache_control: { type: 'ephemeral' } }], messages: [{ role: 'user', content: userPrompt }] }),
        },
        extract: (j) => (j.type === 'content_block_delta' ? j.delta?.text : null),
      };
    }
    if (prov === 'openai') {
      return {
        url: 'https://api.openai.com/v1/chat/completions',
        options: {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: modelName, stream: true, messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: userPrompt }] }),
        },
        extract: (j) => j.choices?.[0]?.delta?.content ?? null,
      };
    }
    // gemini (무료 등급 가능 — 폴백 기본)
    return {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`,
      options: {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: sysPrompt }] }, contents: [{ role: 'user', parts: [{ text: userPrompt }] }], generationConfig: { thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 8192 } }),
      },
      extract: (j) => {
        const parts = j.candidates?.[0]?.content?.parts;
        if (!Array.isArray(parts)) return null;
        const t = parts.map((p) => p.text).filter(Boolean).join('');
        return t || null;
      },
    };
  }

  const provider = env('LLM_PROVIDER', 'gemini');
  const key = env('LLM_API_KEY');
  const primaryModel = provider === 'claude'
    ? pickClaudeModel(userPrompt, !!code)
    : env('LLM_MODEL', provider === 'openai' ? 'gpt-4o' : 'gemini-2.5-flash');

  let call = buildCall(provider, key, primaryModel);
  let extract = call.extract;
  let upstream = await fetch(call.url, call.options);

  // 잔액 부족·인증·쿼터 오류(400/401/402/403/429)면 무료 모델로 자동 폴백 → 서비스가 끊기지 않음
  // 활성화 조건: LLM_FALLBACK_API_KEY 환경변수 설정(기본 공급자 gemini, 모델 gemini-2.5-flash)
  const FALLBACK_STATUSES = [400, 401, 402, 403];
  const fbKey = env('LLM_FALLBACK_API_KEY', '');
  if (!upstream.ok && fbKey && FALLBACK_STATUSES.includes(upstream.status)) {
    const errBody = await upstream.text().catch(() => '');
    console.error('[generate] primary failed → fallback', upstream.status, errBody.slice(0, 300));
    const fbProvider = env('LLM_FALLBACK_PROVIDER', 'gemini');
    const fbModel = env('LLM_FALLBACK_MODEL', 'gemini-2.5-flash');
    const fbCall = buildCall(fbProvider, fbKey, fbModel);
    upstream = await fetch(fbCall.url, fbCall.options);
    extract = fbCall.extract;
  }

  if (!upstream.ok) {
    await restore();
    const detail = await upstream.text().catch(() => '');
    // 실제 업스트림 오류는 서버 로그에만 남기고, 사용자에겐 공급자/모델이 드러나지 않는 일반 문구만 노출
    console.error('[generate] upstream error', upstream.status, detail.slice(0, 500));
    const friendly =
      (upstream.status === 429 || upstream.status === 529)
        ? '지금 만드는 분이 많아 잠시 대기 중이에요 🙏 이용권은 차감되지 않았어요. 10초쯤 뒤 다시 만들어 주세요.'
        : '도구를 만드는 중 문제가 발생했어요. 이용권은 차감되지 않았어요. 잠시 후 다시 시도해 주세요.';
    return json({ error: friendly }, 503);
  }

  // 6. 어떤 LLM이든 동일한 형식(data: {"t":"..."})으로 변환해 스트리밍
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const reader = upstream.body.getReader();

  const stream = new ReadableStream({
    async start(controller) {
      let buf = '';
      let sentAny = false;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop();
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (!data || data === '[DONE]') continue;
            try {
              const t = extract(JSON.parse(data));
              if (t) {
                sentAny = true;
                controller.enqueue(enc.encode(`data: ${JSON.stringify({ t })}\n\n`));
              }
            } catch { /* partial json — skip */ }
          }
        }
        if (!sentAny) {
          await restore();
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: '생성 결과를 받지 못했어요. 이용권은 차감되지 않았어요.' })}\n\n`));
        } else {
          controller.enqueue(enc.encode('data: [DONE]\n\n'));
        }
      } catch (e) {
        await restore();
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: '생성 중 연결이 끊겼어요. 이용권은 차감되지 않았어요.' })}\n\n`));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      'x-remaining': String(quota.remaining ?? ''),
      // x-model 헤더 제거: 사용 모델/공급자 노출 방지(영업기밀)
    },
  });
}
