// POST /api/ai — 생성된 도구가 호출하는 서버 AI 중계.
// 호출 성공 시 크레딧 1건을 차감하고, 업스트림 실패/빈 응답은 자동 복구한다.
import { json, env, getUser, sb } from './_lib.js';

export const config = { runtime: 'edge' };

const AI_SYSTEM = '당신은 사용자가 만든 웹 도구에 내장된 AI 도우미입니다. 사용자의 지시에 따라 정확하고 간결한 한국어 결과만 출력하세요. "네, 알겠습니다" 같은 머리말이나 불필요한 설명 없이 요청한 결과 자체만 바로 답하세요. 코드블록(```)으로 감싸지 마세요.';

function readAiConfig() {
  const explicitProvider = env('AI_PROVIDER', '');
  let provider = explicitProvider;
  let key = env('AI_API_KEY', '');

  if (!key) {
    provider = explicitProvider || env('LLM_PROVIDER', 'gemini');
    key = env('LLM_API_KEY', '');
  } else {
    provider = provider || 'gemini';
  }

  if (!key) {
    provider = explicitProvider || env('LLM_FALLBACK_PROVIDER', 'gemini');
    key = env('LLM_FALLBACK_API_KEY', '');
  }

  if (!key) return null;

  const model = env(
    'AI_MODEL',
    provider === 'claude'
      ? env('LLM_MODEL_SIMPLE', env('LLM_MODEL', 'claude-sonnet-4-6'))
      : provider === 'openai'
        ? env('LLM_MODEL', 'gpt-4o')
        : 'gemini-2.5-flash'
  );

  return { provider, key, model };
}

async function useAiCredit(uid) {
  const res = await sb('rpc/use_generation', {
    method: 'POST',
    body: JSON.stringify({
      uid,
      monthly_limit: 0,
      trial_minutes: 0,
      p_cooldown_sec: Number(env('AI_COOLDOWN_SEC', '0')),
      p_daily_cap: Number(env('AI_DAILY_CAP', '300')),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('[ai] credit rpc failed', res.status, detail.slice(0, 300));
    return { allowed: false, reason: 'server_error' };
  }
  return res.json();
}

async function restoreAiCredit(uid, quota) {
  const source = quota?.source || null;
  if (!source || source === 'unlimited') return;
  try {
    const res = await sb('rpc/restore_generation', {
      method: 'POST',
      body: JSON.stringify({ uid, p_source: source }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[ai] credit restore failed', res.status, detail.slice(0, 300));
    }
  } catch (e) {
    console.error('[ai] credit restore error', e?.message || e);
  }
}

function buildCall({ provider, key, model }, prompt) {
  const maxTokens = Number(env('AI_MAX_OUTPUT_TOKENS', '2048'));

  if (provider === 'claude') {
    return {
      url: 'https://api.anthropic.com/v1/messages',
      options: {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: 0.5,
          system: AI_SYSTEM,
          messages: [{ role: 'user', content: prompt }],
        }),
      },
      extract: (j) => Array.isArray(j.content) ? j.content.map((p) => p.text).filter(Boolean).join('') : '',
    };
  }

  if (provider === 'openai') {
    return {
      url: 'https://api.openai.com/v1/chat/completions',
      options: {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          temperature: 0.5,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: AI_SYSTEM },
            { role: 'user', content: prompt },
          ],
        }),
      },
      extract: (j) => j.choices?.[0]?.message?.content || '',
    };
  }

  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    options: {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: AI_SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: maxTokens },
      }),
    },
    extract: (j) => {
      const parts = j.candidates?.[0]?.content?.parts;
      return Array.isArray(parts) ? parts.map((p) => p.text).filter(Boolean).join('') : '';
    },
  };
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: '허용되지 않은 요청이에요' }, 405);

  const user = await getUser(req);
  if (!user) return json({ error: 'AI 기능은 로그인 후 사용할 수 있어요.', code: 'login_required' }, 401);

  let body;
  try { body = await req.json(); } catch { return json({ error: '요청 형식이 잘못됐어요' }, 400); }
  const prompt = (body && body.prompt) ? String(body.prompt) : '';
  if (!prompt.trim()) return json({ error: '내용을 입력해 주세요' }, 400);
  if (prompt.length > 12000) return json({ error: '내용이 너무 길어요 (최대 12000자)' }, 400);

  const aiConfig = readAiConfig();
  if (!aiConfig) return json({ error: 'AI 기능이 아직 준비 중이에요' }, 503);

  const quota = await useAiCredit(user.id);
  if (!quota.allowed) {
    const status = quota.reason === 'busy' ? 429 : quota.reason === 'server_error' ? 500 : 402;
    const message = quota.reason === 'busy'
      ? '지금 AI 사용량이 많아요. 잠시 후 다시 시도해 주세요.'
      : quota.reason === 'server_error'
        ? '크레딧 확인 중 오류가 났어요. 잠시 후 다시 시도해 주세요.'
        : 'AI 기능은 크레딧 1건을 사용해요. 크레딧을 충전하면 계속 사용할 수 있습니다.';
    return json({ error: message, code: quota.reason || 'no_credit' }, status);
  }

  let res;
  try {
    const call = buildCall(aiConfig, prompt);
    res = await fetch(call.url, call.options);
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[ai] upstream error', res.status, detail.slice(0, 400));
      await restoreAiCredit(user.id, quota);
      const friendly = res.status === 429
        ? 'AI 사용량이 많아요. 크레딧은 차감되지 않았어요. 잠시 후 다시 시도해 주세요.'
        : 'AI 처리 중 문제가 발생했어요. 크레딧은 차감되지 않았어요. 잠시 후 다시 시도해 주세요.';
      return json({ error: friendly }, 503);
    }

    const data = await res.json();
    const text = String(call.extract(data) || '').trim();
    if (!text) {
      await restoreAiCredit(user.id, quota);
      return json({ error: 'AI가 답을 만들지 못했어요. 크레딧은 차감되지 않았어요. 다시 시도해 주세요.' }, 503);
    }

    return json({ text, remaining: quota.remaining });
  } catch (e) {
    await restoreAiCredit(user.id, quota);
    return json({ error: 'AI 연결에 실패했어요. 크레딧은 차감되지 않았어요. 잠시 후 다시 시도해 주세요.' }, 503);
  }
}
