// GET /api/anon?device=<기기ID> — 비로그인(익명) 기기의 남은 무료 체험 횟수 조회
// 로그인 없이도 기기당 ANON_FREE_LIMIT(기본 1)회 무료. 재접속해도 서버가 기억해 막는다.
import { json, env, sb } from './_lib.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const limit = Number(env('ANON_FREE_LIMIT', '1'));
  const device = (new URL(req.url).searchParams.get('device') || '').trim().slice(0, 64);
  if (!device) return json({ remaining: limit, limit, used: 0 });

  try {
    const res = await sb(`anon_usage?device_id=eq.${encodeURIComponent(device)}&select=used_count`);
    const rows = await res.json().catch(() => []);
    const used = Array.isArray(rows) && rows[0] ? Number(rows[0].used_count || 0) : 0;
    return json({ remaining: Math.max(0, limit - used), limit, used });
  } catch (e) {
    // 조회 실패 시에는 막지 않음(서버가 생성 시점에 최종 검증). 기본 한도로 안내.
    return json({ remaining: limit, limit, used: 0 });
  }
}
