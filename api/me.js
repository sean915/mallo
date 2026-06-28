// GET /api/me — 내 체험/구독/사용량 상태
import { json, env, getUser } from './_lib.js';

export const config = { runtime: 'edge' };

const TRIAL_LIMIT = 2; // 로그인 계정 무료 체험: 평생 생성 가능 횟수 (비로그인 기기 무료 1회와 별개)
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
      p = { created_at: new Date().toISOString(), unlimited: false, usage_count: 0, credits: 0 };
    }

    const trialLimit = Number(env('TRIAL_LIMIT', String(TRIAL_LIMIT)));
    const used = Number(p.usage_count || 0);          // 무료 체험 사용 횟수
    const trialLeft = Math.max(0, trialLimit - used); // 남은 무료 체험 횟수
    const credits = Number(p.credits || 0);           // 충전한 AI 크레딧 잔여 건수
    const remaining = trialLeft + credits;            // 총 사용 가능 횟수

    return json({
      email: user.email,
      unlimited: isMaster || !!p.unlimited,
      trialLeft,
      credits,
      remaining,
      used,
    });
  } catch (e) {
    return json({ error: '상태 조회 중 오류' }, 500);
  }
}
