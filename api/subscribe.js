// POST /api/subscribe — 포트원(PortOne) 정기결제 시작 (플랜 선택)
//
// 흐름:
//   1) 프론트에서 카카오페이 결제수단 등록(지문 1회) → billingKey 발급
//   2) 여기서 선택한 플랜 금액으로 첫 달 결제(빌링키 결제) 실행
//   3) 성공 시 구독 활성화: 플랜·가격·월 한도 저장, 30일 연장
//   4) 매달 자동결제는 /api/pay-cron 이 같은 빌링키·플랜 가격으로 재결제
//
// 필요한 서버 환경변수(Vercel): PORTONE_API_SECRET

import { json, env, getUser, sb, PLANS } from './_lib.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: '허용되지 않은 요청이에요' }, 405);

  const user = await getUser(req);
  if (!user) return json({ error: '로그인이 필요해요' }, 401);

  let body;
  try { body = await req.json(); } catch { return json({ error: '요청 형식이 잘못됐어요' }, 400); }
  const billingKey = (body?.billingKey || '').toString().trim();
  if (!billingKey) return json({ error: '결제수단 등록 정보가 없어요' }, 400);

  const plan = PLANS[body?.planId] || PLANS.light;

  let secret;
  try { secret = env('PORTONE_API_SECRET'); } catch { return json({ error: '결제가 아직 준비 중이에요' }, 503); }

  const orderName = `말로 ${plan.name} 구독`;
  const paymentId = `mallo-${user.id}-${Date.now()}`;

  const pay = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}/billing-key`, {
    method: 'POST',
    headers: { authorization: `PortOne ${secret}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      billingKey,
      orderName,
      customer: { id: user.id, email: user.email },
      amount: { total: plan.price },
      currency: 'KRW',
    }),
  });

  if (!pay.ok) {
    const detail = await pay.text().catch(() => '');
    return json({ error: '결제에 실패했어요. 카카오페이 잔액/한도를 확인해 주세요.', detail: detail.slice(0, 300) }, 402);
  }

  // 구독 활성화 (플랜·가격·월 한도 저장 + 30일 연장)
  const act = await sb('rpc/activate_subscription', {
    method: 'POST',
    body: JSON.stringify({
      uid: user.id,
      p_billing_key: billingKey,
      p_days: 30,
      p_price: plan.price,
      p_limit: plan.limit,
      p_plan: body?.planId in PLANS ? body.planId : 'light',
    }),
  });
  if (!act.ok) {
    const detail = await act.text().catch(() => '');
    return json({ ok: true, warn: 'activated_pending', detail: detail.slice(0, 200) });
  }

  return json({ ok: true, plan: plan.name });
}
