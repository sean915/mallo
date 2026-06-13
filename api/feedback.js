// POST /api/feedback — 사용자 피드백/후기 저장 (본인 토큰 + RLS "own feedback insert" 정책)
import { json, env, getUser } from './_lib.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: '허용되지 않은 요청이에요' }, 405);

  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  const user = await getUser(req);
  if (!user) return json({ error: '로그인이 필요해요' }, 401);

  let body;
  try { body = await req.json(); } catch { return json({ error: '요청 형식이 잘못됐어요' }, 400); }

  const message = (body?.message || '').toString().trim();
  if (!message || message.length > 2000) {
    return json({ error: '내용을 확인해 주세요 (최대 2000자)' }, 400);
  }
  let rating = Number(body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) rating = null;

  const res = await fetch(`${env('SUPABASE_URL')}/rest/v1/feedback`, {
    method: 'POST',
    headers: {
      apikey: env('SUPABASE_ANON_KEY'),
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify({
      user_id: user.id,
      email: user.email,
      message,
      rating,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return json({ error: '저장에 실패했어요', detail: detail.slice(0, 200) }, 500);
  }

  return json({ ok: true });
}
