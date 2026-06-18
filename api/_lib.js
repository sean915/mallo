// 공용 유틸 (Vercel Edge Functions)

// 이용권 팩 (단일 출처) — 1회성 구매, 가격(원)/충전 횟수(credits). 만료 없음.
export const PACKS = {
  light:    { name: '라이트',   price: 9900,  credits: 10 },
  standard: { name: '스탠다드', price: 24900, credits: 25 },
  pro:      { name: '프로',     price: 49000, credits: 50 },
};
// 하위호환 별칭(구 구독 코드가 참조해도 빌드 깨지지 않도록)
export const PLANS = PACKS;

export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export function env(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`환경변수 ${name} 가 설정되지 않았어요`);
  }
  return v;
}

// Supabase 액세스 토큰으로 사용자 확인
export async function getUser(req) {
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '').trim();
  if (!token) return null;
  const res = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, {
    headers: { apikey: env('SUPABASE_ANON_KEY'), authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

// service role 키로 Supabase REST 호출
export async function sb(path, options = {}) {
  const SERVICE = env('SUPABASE_SERVICE_ROLE_KEY');
  return fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SERVICE,
      authorization: `Bearer ${SERVICE}`,
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
}
