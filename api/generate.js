// POST /api/generate — 한국어 요청 → LLM 호출(서버 키) → 통일된 SSE 스트림으로 응답
// 클라이언트는 LLM 종류/키를 전혀 모름. data: {"t":"..."} 형태로만 받음.
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
20. window.말로 가 없을 수도 있으니(\`if(window.말로&&window.말로.ai)\`) 방어적으로 호출하고, 없거나 실패하면 사용자에게 친절한 한국어 안내를 보여줄 것. AI 호출 결과는 그대로 화면에 예쁘게 표시.

[기타]
21. 요구사항이 모호하면 되묻지 말고, 가장 상식적이며 완성도·디자인 수준이 높은 형태로 스스로 결정해 완성할 것.
22. 기존 코드가 주어지면 요청된 수정만 반영한 전체 코드를 다시 출력할 것(기존 디자인 품질은 유지/향상).`;

// 자동 모델 선택: 사용자는 모델을 고르지 않음. 요청 난이도를 보고 Sonnet/Opus 자동 결정.
//  - 기본은 Sonnet(저렴·빠름)
//  - 복잡/고난도 도메인, 긴 요청, 또는 사용자가 결과에 불만이라 다시 요청 → Opus로 승급
// 환경변수로 끄기: AUTO_MODEL=0 (그러면 LLM_MODEL 사용). 모델명은 LLM_MODEL_SIMPLE / LLM_MODEL_COMPLEX 로 변경 가능.
function pickClaudeModel(prompt, hasCode) {
  const sonnet = env('LLM_MODEL_SIMPLE', 'claude-sonnet-4-6');
  const opus = env('LLM_MODEL_COMPLEX', 'claude-opus-4-8');
  // MODEL_MODE: 'quality'(기본·항상 최고 모델 Opus) | 'auto'(난이도별) | 'off'(LLM_MODEL 고정)
  const mode = env('MODEL_MODE', 'quality');
  if (mode === 'quality') return opus;          // 품질 최우선: 무조건 최고 성능 모델
  if (mode === 'off') return env('LLM_MODEL', opus);
  const p = String(prompt || '');
  const redo = hasCode && /(다시|처음부터|완전|별로|이상|마음에\s*안|안\s*돼|안\s*나|엉망|왜\s*이래|제대로|구려|별룬)/.test(p);
  const complex = /(게임|쇼핑몰|결제|장바구니|주문|대시보드|관리자|예약|캘린더|일정관리|차트|그래프|통계|실시간|드래그|애니메이션|지도|채팅|메신저|멀티|시뮬|에디터|캔버스|물리|점수|랭킹|로그인|데이터베이스|크롤|api)/i.test(p);
  const longReq = p.length > 180;
  return (redo || complex || longReq) ? opus : sonnet;
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: '허용되지 않은 요청이에요' }, 405);

  // 1. 로그인 확인
  const user = await getUser(req);
  if (!user) return json({ error: '로그인이 만료됐어요. 다시 로그인해 주세요.' }, 401);

  // 2. 체험/구독/월간한도 검사 + 사용량 차감 (DB에서 원자적으로)
  const rpc = await sb('rpc/use_generation', {
    method: 'POST',
    body: JSON.stringify({
      uid: user.id,
      monthly_limit: Number(env('MONTHLY_LIMIT', '100')),
      trial_minutes: Number(env('TRIAL_LIMIT', '3')), // 이제 '분'이 아니라 무료 체험 '횟수'
      p_cooldown_sec: Number(env('COOLDOWN_SEC', '6')),   // 어뷰징: 계정당 연속 생성 최소 간격(초)
      p_daily_cap: Number(env('DAILY_CAP', '500')),        // 어뷰징/비용: 전체 일일 생성 상한
    }),
  });
  if (!rpc.ok) return json({ error: '서버 오류가 났어요. 잠시 후 다시 시도해 주세요.' }, 500);
  const quota = await rpc.json();
  if (!quota.allowed) {
    const MSG = {
      no_credit: '무료 횟수를 모두 썼어요. 이용권을 충전하면 계속 만들 수 있어요 ⚡',
      trial_over: '무료 횟수를 모두 썼어요. 이용권을 충전하면 계속 만들 수 있어요 ⚡',
      cooldown: '조금 빠르네요! 몇 초 뒤에 다시 시도해 주세요 🙂',
      busy: '지금 접속이 많아 잠시 쉬어가는 중이에요. 잠시 후 다시 시도해 주세요 🙏',
    };
    const code = quota.reason || 'no_credit';
    const status = (code === 'cooldown' || code === 'busy') ? 429 : 402;
    return json({ error: MSG[code] || MSG.limit, code }, status);
  }

  // 3. 요청 검증
  let body;
  try { body = await req.json(); } catch { return json({ error: '요청 형식이 잘못됐어요' }, 400); }
  const { prompt, code } = body || {};
  if (!prompt || typeof prompt !== 'string' || prompt.length > 4000) {
    return json({ error: '요청 내용을 확인해 주세요 (최대 4000자)' }, 400);
  }
  const userPrompt = code
    ? `기존 앱 코드:\n\`\`\`html\n${code}\n\`\`\`\n\n수정 요청: ${prompt}`
    : `만들 것: ${prompt}`;

  // 4. LLM 호출 (서버 환경변수의 키 사용 — 클라이언트는 모름)
  // 공급자별 요청 빌더 — 1차(유료·고품질)와 폴백(무료) 양쪽에 재사용
  function buildCall(prov, apiKey, modelName) {
    if (prov === 'claude') {
      return {
        url: 'https://api.anthropic.com/v1/messages',
        options: {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          // 시스템 프롬프트를 프롬프트 캐싱(ephemeral)으로 — 매 호출 동일하므로 캐시 적중 시 입력비 ~90%↓ + TTFT↑
        body: JSON.stringify({ model: modelName, max_tokens: Number(env('MAX_TOKENS', '16000')), stream: true, system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }], messages: [{ role: 'user', content: userPrompt }] }),
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
          body: JSON.stringify({ model: modelName, stream: true, messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt }] }),
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
        body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }, contents: [{ role: 'user', parts: [{ text: userPrompt }] }], generationConfig: { thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 8192 } }),
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
    ? pickClaudeModel(prompt, !!code)
    : env('LLM_MODEL', provider === 'openai' ? 'gpt-4o' : 'gemini-2.0-flash');

  let call = buildCall(provider, key, primaryModel);
  let extract = call.extract;
  let usedModel = primaryModel;
  let upstream = await fetch(call.url, call.options);

  // 잔액 부족·인증·쿼터 오류(400/401/402/403/429)면 무료 모델로 자동 폴백 → 서비스가 끊기지 않음
  // 활성화 조건: LLM_FALLBACK_API_KEY 환경변수 설정(기본 공급자 gemini, 모델 gemini-2.0-flash)
  const FALLBACK_STATUSES = [400, 401, 402, 403, 429];
  const fbKey = env('LLM_FALLBACK_API_KEY');
  if (!upstream.ok && fbKey && FALLBACK_STATUSES.includes(upstream.status)) {
    const errBody = await upstream.text().catch(() => '');
    console.error('[generate] primary failed → fallback', upstream.status, errBody.slice(0, 300));
    const fbProvider = env('LLM_FALLBACK_PROVIDER', 'gemini');
    const fbModel = env('LLM_FALLBACK_MODEL', 'gemini-2.5-flash');
    const fbCall = buildCall(fbProvider, fbKey, fbModel);
    upstream = await fetch(fbCall.url, fbCall.options);
    extract = fbCall.extract;
    usedModel = `${fbModel}#fallback`;
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    // 실제 업스트림 오류는 서버 로그에만 남기고, 사용자에겐 공급자/모델이 드러나지 않는 일반 문구만 노출
    console.error('[generate] upstream error', upstream.status, detail.slice(0, 500));
    const friendly =
      upstream.status === 429
        ? '지금 사용량이 많아요. 잠시 후 다시 시도해 주세요.'
        : '도구를 만드는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.';
    return json({ error: friendly }, 503);
  }

  // 5. 어떤 LLM이든 동일한 형식(data: {"t":"..."})으로 변환해 스트리밍
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const reader = upstream.body.getReader();

  const stream = new ReadableStream({
    async start(controller) {
      let buf = '';
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
              if (t) controller.enqueue(enc.encode(`data: ${JSON.stringify({ t })}\n\n`));
            } catch { /* partial json — skip */ }
          }
        }
        controller.enqueue(enc.encode('data: [DONE]\n\n'));
      } catch (e) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: '생성 중 연결이 끊겼어요' })}\n\n`));
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
