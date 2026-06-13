// POST /api/generate — 한국어 요청 → LLM 호출(서버 키) → 통일된 SSE 스트림으로 응답
// 클라이언트는 LLM 종류/키를 전혀 모름. data: {"t":"..."} 형태로만 받음.
import { json, env, getUser, sb } from './_lib.js';

export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `당신은 한국어 요구사항을 받아 완성된 웹앱을 만드는 최고의 개발자입니다.
규칙:
1. 출력은 반드시 \`\`\`html 코드블록 하나만. 코드블록 밖에는 한 문장의 짧은 한국어 인사만 허용.
2. 단일 HTML 파일(CSS/JS 인라인)로 완결되게 작성. 외부 라이브러리는 cdnjs/jsdelivr CDN만 사용.
3. 앱의 모든 텍스트·버튼·안내는 자연스러운 한국어로.
4. 디자인은 모던하고 깔끔하게 (둥근 모서리, 충분한 여백, 시스템 한글 폰트).
5. 요구사항이 모호하면 묻지 말고 가장 상식적인 형태로 완성할 것.
6. 기존 코드가 주어지면 요청된 수정만 반영한 전체 코드를 다시 출력할 것.`;

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
      trial_minutes: Number(env('TRIAL_MINUTES', '30')),
    }),
  });
  if (!rpc.ok) return json({ error: '서버 오류가 났어요. 잠시 후 다시 시도해 주세요.' }, 500);
  const quota = await rpc.json();
  if (!quota.allowed) {
    const msg = quota.reason === 'trial_over'
      ? '30분 무료 체험이 끝났어요. 구독하면 계속 만들 수 있어요!'
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
  let upstream, extract;

  if (provider === 'claude') {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: env('LLM_MODEL', 'claude-sonnet-4-6'),
        max_tokens: 16000,
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
        }),
      }
    );
    extract = (j) => j.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  }

  if (!upstream.ok) {
    return json({ error: `AI 호출에 실패했어요 (${upstream.status}). 잠시 후 다시 시도해 주세요.` }, 502);
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
    },
  });
}
