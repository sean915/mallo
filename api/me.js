// GET /api/me — 내 체험/구독/사용량 상태
import { json, env, getUser } from './_lib.js';

export const config = { runtime: 'edge' };

const TRIAL_MINUTES = 30;
// 마스터(무제한) 계정 — 이메일 기준으로도 보장
const MASTER_EMAILS = ['seanhh915@gmail.com'];

export default async function handler(req) {
  try {
    const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
    const user = await getUser(req);
    if (!user) return json({ error: '로그인이 필요해요' }, 401);

    const isMaster = MASTER_EMAILS.includes(String(user.email || '').toLowerCase());

    // 본인 토큰으로 자기 프로필 조회 (RLS "own profile read" 정책 사용)
    let p = null;
    try {
      const res = await fetch(`${env('SUPABASE_URL')}/rest/v1/profiles?id=eq.${user.id}&select=*`, {
        headers: { apikey: env('SUPABASE_ANON_KEY'), authorization: `Bearer ${token}` },
      });
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) p = rows[0];
    } catch (e) { /* 조회 실패 시 기본값 */ }

    if (!p) {
      p = { created_at: new Date().toISOString(), subscribed: false, unlimited: false, usage_month: '', usage_count: 0 };
    }

    const trialMinutes = Number(env('TRIAL_MINUTES', String(TRIAL_MINUTES)));
    const elapsedMin = (Date.now() - new Date(p.created_at).getTime()) / 60000;
    const trialLeft = Math.max(0, Math.ceil(trialMinutes - elapsedMin)); // 남은 '분'
    const limit = Number(env('MONTHLY_LIMIT', '100'));
    const curMonth = new Date().toISOString().slice(0, 7);
    const used = p.usage_month === curMonth ? p.usage_count : 0;

    return json({
      email: user.email,
      subscribed: !!p.subscribed,
      unlimited: isMaster || !!p.unlimited,
      trialLeft,
      used,
      limit,
    });
  } catch (e) {
    return json({ error: '상태 조회 중 오류' }, 500);
  }
}
