// GET /api/pay-cron — 매일 1회 실행(Vercel Cron). 구독 만료가 임박한 사용자에게 빌링키로 자동 재결제.
//
// vercel.json 의 crons 설정으로 매일 호출됩니다.
// 보호: CRON_SECRET 환경변수가 있으면 'Authorization: Bearer <CRON_SECRET>' 헤더를 요구.
// 필요한 환경변수: PORTONE_API_SECRET (+ 선택 CRON_SECRET, PAY_PRICE, PAY_NAME)

import { json, env, sb } from './_lib.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  // Vercel Cron 인증(설정된 경우에만 체크)
  const cronSecret = env('CRON_SECRET', '');
  if (cronSecret) {
    const auth = req.headers.get('authorization') || '';
    if (auth !== `Bearer ${cronSecret}`) return json({ error: 'unauthorized' }, 401);
  }

  let secret;
  try { secret = env('PORTONE_API_SECRET'); } catch { return json({ ok: true, skipped: 'no_payment_keys' }); }

  // 오늘 결제일이 도래한(또는 지난) 구독자 목록 — SECURITY DEFINER RPC
  const res = await sb('rpc/due_subscriptions', {
    method: 'POST',
    body: JSON.stringify({ grace: 0 }),
  });
  if (!res.ok) return json({ error: 'due_query_failed' }, 500);
  const due = await res.json();
  if (!Array.isArray(due) || due.length === 0) return json({ ok: true, charged: 0 });

  let charged = 0, failed = 0;
  for (const row of due) {
    const price = Number(row.plan_price || 9900);
    const paymentId = `mallo-${row.id}-${Date.now()}`;
    const pay = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}/billing-key`, {
      method: 'POST',
      headers: { authorization: `PortOne ${secret}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        billingKey: row.billing_key,
        orderName: `말로 ${row.plan || ''} 구독`.trim(),
        customer: { id: row.id, email: row.email },
        amount: { total: price },
        currency: 'KRW',
      }),
    });
    if (pay.ok) {
      await sb('rpc/activate_subscription', {
        method: 'POST',
        body: JSON.stringify({ uid: row.id, p_billing_key: row.billing_key, p_days: 30, p_price: price, p_limit: row.monthly_limit, p_plan: row.plan }),
      });
      charged++;
    } else {
      // 결제 실패 → 구독 해지 처리
      await sb('rpc/cancel_subscription', {
        method: 'POST',
        body: JSON.stringify({ uid: row.id }),
      });
      failed++;
    }
  }

  return json({ ok: true, charged, failed });
}
