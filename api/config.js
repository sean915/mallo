// GET /api/config — 프론트엔드에 공개해도 되는 설정만 내려줌
import { json, env, PLANS } from './_lib.js';

export const config = { runtime: 'edge' };

export default async function handler() {
  return json({
    supabaseUrl: env('SUPABASE_URL'),
    supabaseAnonKey: env('SUPABASE_ANON_KEY'), // anon key는 공개용 키 (RLS로 보호됨)
    gaId: env('GA_MEASUREMENT_ID', ''), // Google Analytics 측정 ID (선택)
    // 포트원(PortOne) 결제 — 아래 값이 모두 채워지면 결제 버튼이 자동으로 켜져요(키 없으면 베타 모드 유지)
    payStoreId: env('PORTONE_STORE_ID', ''),     // 공개용 스토어 ID
    payChannelKey: env('PORTONE_CHANNEL_KEY', ''), // 카카오페이 채널 키(공개용)
    plans: PLANS,                                  // 구독 플랜(가격·횟수)
  });
}
