// 공용 유틸 (Vercel Edge Functions)

// 말로 잔액 정책 (단일 출처) — 1회성 충전, 만료 없음.
// DB의 profiles.credits 컬럼은 기존 이름을 유지하지만, 값은 원 단위 잔액으로 사용한다.
export const GENERATION_PRICE = 3900;
export const AI_FEATURE_PRICE = 990;

export const PACKS = {
  single:   { name: '도구 만들기 1회', price: GENERATION_PRICE, credits: GENERATION_PRICE, makeUses: 1 },
  light:    { name: '도구 만들기 3회', price: GENERATION_PRICE * 3, credits: GENERATION_PRICE * 3, makeUses: 3 },
  standard: { name: '도구 만들기 5회', price: GENERATION_PRICE * 5, credits: GENERATION_PRICE * 5, makeUses: 5 },
  pro:      { name: '도구 만들기 10회', price: GENERATION_PRICE * 10, credits: GENERATION_PRICE * 10, makeUses: 10 },
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
