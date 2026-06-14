// POST /api/subscribe — 포트원(PortOne) 정기결제 시작
//
// 흐름:
//   1) 프론트에서 PortOne.requestIssueBillingKey 로 카카오페이 결제수단 등록(지문 1회) → billingKey 발급
//   2) 이 엔드포인트로 billingKey 전달 → 서버가 첫 달 결제(빌링키 결제) 실행
//   3) 결제 성공 시 Supabase에서 구독 활성화(activate_subscription, 30일 연장)
//   4) 이후 매달 자동결제는 /api/pay-cron 이 빌링키로 재결제
//
// 필요한 서버 환경변수(Vercel): PORTONE_API_SECRET, PAY_PRICE(선택, 기본 9900), PAY_NAME(선택)

import { json, env, getUser, sb } from './_lib.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: '허용되지 않은 요청이에요' }, 405);

  const user = await getUser(req);
  if (!user) return json({ error: '로그인이 필요해요' }, 401);

  let body;
  try { body = await req.json(); } catch { return json({ error: '요청 형식이 잘못됐어요' }, 400); }
  const billingKey = (body?.billingKey || '').toString().trim();
  if (!billingKey) return json({ error: '결제수단 등록 정보가 없어요' }, 400);

  // 결제 키 미설정(베타) 상태면 결제 진행 불가
  let secret;
  try { secret = env('PORTONE_API_SECRET'); } catch { return json({ error: '결제가 아직 준비 중이에요' }, 503); }

  const price = Number(env('PAY_PRICE', '9900'));
  const orderName = env('PAY_NAME', '말로 월 구독');
  const paymentId = `mallo-${user.id}-${Date.now()}`;

  // 첫 달 빌링키 결제
  const pay = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}/billing-key`, {
    method: 'POST',
    headers: { authorization: `PortOne ${secret}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      billingKey,
      orderName,
      customer: { id: user.id, email: user.email },
      amount: { total: price },
      currency: 'KRW',
    }),
  });

  if (!pay.ok) {
    const detail = await pay.text().catch(() => '');
    return json({ error: '결제에 실패했어요. 카카오페이 잔액/한도를 확인해 주세요.', detail: detail.slice(0, 300) }, 402);
  }

  // 구독 활성화(빌링키 저장 + 30일 연장 + 이번 달 사용량 초기화) — SECURITY DEFINER RPC
  const act = await sb('rpc/activate_subscription', {
    method: 'POST',
    body: JSON.stringify({ uid: user.id, p_billing_key: billingKey, p_days: 30 }),
  });
  if (!act.ok) {
    const detail = await act.text().catch(() => '');
    // 결제는 됐지만 활성화 실패 — 로그 남기고 사용자에겐 성공 안내(고객센터 보정)
    return json({ ok: true, warn: 'activated_pending', detail: detail.slice(0, 200) });
  }

  return json({ ok: true });
}
