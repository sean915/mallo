// POST /api/ai — 생성된 도구가 호출하던 서버 AI 중계.
// 비용 0 보장을 위해 기본값은 비활성화다. 명시적으로 켠 경우에만 아래 중계를 사용한다.
import { json, env, getUser } from './_lib.js';

export const config = { runtime: 'edge' };

const AI_SYSTEM = '당신은 사용자가 만든 웹 도구에 내장된 AI 도우미입니다. 사용자의 지시에 따라 정확하고 간결한 한국어 결과만 출력하세요. "네, 알겠습니다" 같은 머리말이나 불필요한 설명 없이 요청한 결과 자체만 바로 답하세요. 코드블록(```)으로 감싸지 마세요.';

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: '허용되지 않은 요청이에요' }, 405);

  if (env('ENABLE_TOOL_SERVER_AI', '0') !== '1') {
    return json({ error: '이 도구의 AI 기능은 로컬 AI(Ollama)만 사용합니다. 말로 서버 AI로는 자동 전환되지 않습니다.' }, 403);
  }

  // 로그인 확인 (도구 안에서 호출되더라도 사용자 인증 필요)
  const user = await getUser(req);
  if (!user) return json({ error: 'AI 기능은 로그인 후 사용할 수 있어요' }, 401);

  let body;
  try { body = await req.json(); } catch { return json({ error: '요청 형식이 잘못됐어요' }, 400); }
  const prompt = (body && body.prompt) ? String(body.prompt) : '';
  if (!prompt.trim()) return json({ error: '내용을 입력해 주세요' }, 400);
  if (prompt.length > 12000) return json({ error: '내용이 너무 길어요 (최대 12000자)' }, 400);

  // 무료 모델 키: AI 전용 → 폴백 → 기본 순서로 탐색
  let key = '';
  try { key = env('AI_API_KEY'); } catch {}
  if (!key) { try { key = env('LLM_FALLBACK_API_KEY'); } catch {} }
  if (!key) { try { key = env('LLM_API_KEY'); } catch {} }
  if (!key) return json({ error: 'AI 기능이 아직 준비 중이에요' }, 503);

  const model = env('AI_MODEL', 'gemini-2.5-flash');

  let res;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: AI_SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
        }),
      }
    );
  } catch {
    return json({ error: 'AI 연결에 실패했어요. 잠시 후 다시 시도해 주세요.' }, 503);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('[ai] upstream error', res.status, detail.slice(0, 400)); // 원인은 로그에만
    const friendly = res.status === 429
      ? 'AI 사용량이 많아요. 잠시 후 다시 시도해 주세요.'
      : 'AI 처리 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.';
    return json({ error: friendly }, 503);
  }

  let text = '';
  try {
    const j = await res.json();
    const parts = j.candidates?.[0]?.content?.parts;
    if (Array.isArray(parts)) text = parts.map((p) => p.text).filter(Boolean).join('');
  } catch {}
  text = text.trim();
  if (!text) return json({ error: 'AI가 답을 만들지 못했어요. 다시 시도해 주세요.' }, 503);

  return json({ text });
}
