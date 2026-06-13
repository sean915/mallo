// GET /api/me — 내 체험/구독/사용량 상태
import { json, env, getUser, sb } from './_lib.js';

export const config = { runtime: 'edge' };

const TRIAL_MINUTES = 30;

export default async function handler(req) {
  const user = await getUser(req);
  if (!user) return json({ error: '로그인이 필요해요' }, 401);

  let res = await sb(`profiles?id=eq.${user.id}&select=*`);
  let rows = await res.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    await sb('profiles', {
      method: 'POST',
      headers: { prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({ id: user.id, email: user.email }),
    });
    res = await sb(`profiles?id=eq.${user.id}&select=*`);
    rows = await res.json();
  }
  const p = rows[0];

  const trialMinutes = Number(env('TRIAL_MINUTES', String(TRIAL_MINUTES)));
  const elapsedMin = (Date.now() - new Date(p.created_at).getTime()) / 60000;
  const trialLeft = Math.max(0, Math.ceil(trialMinutes - elapsedMin)); // 남은 '분'
  const limit = Number(env('MONTHLY_LIMIT', '100'));
  const curMonth = new Date().toISOString().slice(0, 7);
  const used = p.usage_month === curMonth ? p.usage_count : 0;

  return json({
    email: user.email,
    subscribed: p.subscribed,
    unlimited: !!p.unlimited,
    trialLeft,
    used,
    limit,
  });
}
