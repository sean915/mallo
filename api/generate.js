// POST /api/generate — 한국어 요청 → LLM 호출(서버 키) → 통일된 SSE 스트림으로 응답
// 클라이언트는 LLM 종류/키를 전혀 모름. data: {"t":"..."} 형태로만 받음.
import { json, env, getUser, sb } from './_lib.js';

export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `당신은 한국어 요구사항을 받아 "실무에서 바로 쓸 수 있는 완성된 웹앱"을 만드는 세계 최고 수준의 개발자이자 제품 디자이너입니다.

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

[디자인·사용성]
9. 모던하고 깔끔한 UI(둥근 모서리, 넉넉한 여백, 시스템 한글 폰트, 일관된 색상). 모바일·데스크톱 모두 잘 보이는 반응형으로.
10. 모든 텍스트·버튼·안내·빈 상태·성공/오류 메시지를 자연스러운 한국어로.

[기타]
11. 요구사항이 모호하면 되묻지 말고, 가장 상식적이고 완성도 높은 형태로 스스로 결정해 완성할 것.
12. 기존 코드가 주어지면 요청된 수정만 반영한 전체 코드를 다시 출력할 것.`;

// 자동 모델 선택: 사용자는 모델을 고르지 않음. 요청 난이도를 보고 Sonnet/Opus 자동 결정.
//  - 기본은 Sonnet(저렴·빠름)
//  - 복잡/고난도 도메인, 긴 요청, 또는 사용자가 결과에 불만이라 다시 요청 → Opus로 승급
// 환경변수로 끄기: AUTO_MODEL=0 (그러면 LLM_MODEL 사용). 모델명은 LLM_MODEL_SIMPLE / LLM_MODEL_COMPLEX 로 변경 가능.
function pickClaudeModel(prompt, hasCode) {
  const sonnet = env('LLM_MODEL_SIMPLE', 'claude-sonnet-4-6');
  const opus = env('LLM_MODEL_COMPLEX', 'claude-opus-4-8');
  if (env('AUTO_MODEL', '1') === '0') return env('LLM_MODEL', opus);
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
    }),
  });
  if (!rpc.ok) return json({ error: '서버 오류가 났어요. 잠시 후 다시 시도해 주세요.' }, 500);
  const quota = await rpc.json();
  if (!quota.allowed) {
    const msg = quota.reason === 'trial_over'
      ? '무료 체험 3회를 모두 썼어요. 베타 기간이라 지금은 여기까지예요 🙏 후기를 남겨 주시면 큰 힘이 됩니다!'
      : '이번 달 만들기 횟수를 모두 썼어요. 다음 달 1일에 다시 충전돼요.';
    return json({ error: msg, code: quota.reason }, 402);
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
  const provider = env('LLM_PROVIDER', 'gemini');
  const key = env('LLM_API_KEY');
  let upstream, extract, usedModel = '';

  if (provider === 'claude') {
    usedModel = pickClaudeModel(prompt, !!code); // 난이도 보고 Sonnet/Opus 자동 선택
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: usedModel,
        max_tokens: 24000,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    extract = (j) => (j.type === 'content_block_delta' ? j.delta?.text : null);
  } else if (provider === 'openai') {
    upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: env('LLM_MODEL', 'gpt-4o'),
        stream: true,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    extract = (j) => j.choices?.[0]?.delta?.content ?? null;
  } else { // gemini (기본 — 가장 저렴)
    const model = env('LLM_MODEL', 'gemini-2.0-flash');
    upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 8192 },
        }),
      }
    );
    extract = (j) => {
      const parts = j.candidates?.[0]?.content?.parts;
      if (!Array.isArray(parts)) return null;
      const t = parts.map((p) => p.text).filter(Boolean).join('');
      return t || null;
    };
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    return json({ error: `AI 호출 실패 (${upstream.status}): ${detail.slice(0, 400)}` }, 502);
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
      'x-model': usedModel, // 어떤 모델이 처리했는지(디버그용)
    },
  });
}
