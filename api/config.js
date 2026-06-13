// GET /api/config — 프론트엔드에 공개해도 되는 설정만 내려줌
import { json, env } from './_lib.js';

export const config = { runtime: 'edge' };

export default async function handler() {
  return json({
    supabaseUrl: env('SUPABASE_URL'),
    supabaseAnonKey: env('SUPABASE_ANON_KEY'), // anon key는 공개용 키 (RLS로 보호됨)
    gaId: env('GA_MEASUREMENT_ID', ''), // Google Analytics 측정 ID (선택)
  });
}
