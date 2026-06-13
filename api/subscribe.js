// POST /api/subscribe — 구독 처리
//
// ⚠️ 현재는 데모입니다: 호출하면 바로 subscribed=true 처리.
// 실서비스 연동 방법 (토스페이먼츠 빌링/정기결제):
//   1. 프론트에서 토스 결제위젯으로 카드 등록 → billingKey 발급
//   2. 이 엔드포인트에서 billingKey 검증 후 subscribed=true + billing_key 저장
//   3. Vercel Cron(매일)으로 결제일 도래 사용자에게 빌링키 결제 실행 (9,900원)
//   4. 결제 실패 시 subscribed=false 처리 + 이메일 안내
// 문서: https://docs.tosspayments.com/guides/v2/billing

import { json, getUser, sb } from './_lib.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: '허용되지 않은 요청이에요' }, 405);
  const user = await getUser(req);
  if (!user) return json({ error: '로그인이 필요해요' }, 401);

  // TODO: 토스페이먼츠 billingKey 검증 로직이 여기에 들어감
  const res = await sb(`profiles?id=eq.${user.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ subscribed: true }),
  });
  if (!res.ok) return json({ error: '구독 처리에 실패했어요' }, 500);

  return json({ ok: true, demo: true });
}
