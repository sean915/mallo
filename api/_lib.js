// 공용 유틸 (Vercel Edge Functions)

// 프로그램 생성권 팩 (단일 출처) — 1회성 구매, 가격(원)/생성권 수(credits). 만료 없음.
// 컨셉: 한 번 호출하면 원큐로 프로그램(SW) 하나를 만든다. 기준가: 프로그램 1건 3,900원.
export const PACKS = {
  single:   { name: '프로그램 1건 만들기', price: 3900, credits: 1 },
  light:    { name: '프로그램 5건 · 5% 할인', price: 18500, credits: 5 },
  standard: { name: '프로그램 10건 · 10% 할인', price: 35100, credits: 10 },
  pro:      { name: '프로그램 30건 · 15% 할인', price: 99400, credits: 30 },
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
