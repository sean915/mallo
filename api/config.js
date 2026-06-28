// GET /api/config — 프론트엔드에 공개해도 되는 설정만 내려줌
import { json, env, PLANS, GENERATION_PRICE, AI_FEATURE_PRICE } from './_lib.js';

export const config = { runtime: 'edge' };

export default async function handler() {
  const payStoreId = env('PORTONE_STORE_ID', '');
  const payChannelKey = env('PORTONE_CHANNEL_KEY', '');
  const hasPaySecret = !!env('PORTONE_API_SECRET', '');

  return json({
    supabaseUrl: env('SUPABASE_URL'),
    supabaseAnonKey: env('SUPABASE_ANON_KEY'), // anon key는 공개용 키 (RLS로 보호됨)
    gaId: env('GA_MEASUREMENT_ID', ''), // Google Analytics 측정 ID (선택)
    // 포트원(PortOne) 결제 — 공개 키 2개와 서버 시크릿까지 모두 있어야 실제 충전 가능
    payStoreId,
    payChannelKey,
    payReady: !!(payStoreId && payChannelKey && hasPaySecret),
    plans: PLANS, // 만료 없는 말로 잔액 충전 상품
    generationPrice: GENERATION_PRICE,
    aiFeaturePrice: AI_FEATURE_PRICE,
    anonFreeLimit: Number(env('ANON_FREE_LIMIT', '1')), // 비로그인 기기당 무료 체험 횟수
    trialLimit: Number(env('TRIAL_LIMIT', '2')),        // 로그인 계정 무료 체험 횟수
  });
}
