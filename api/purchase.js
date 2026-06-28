// POST /api/purchase — AI 크레딧 단건결제 검증 후 잔여 건수 충전
//
// 흐름:
//   1) 프론트에서 PortOne 단건결제(requestPayment, 카카오페이) 성공 → paymentId 수신
//   2) 여기서 PortOne API로 실제 결제 상태·금액·구매자·상품 정보를 검증
//   3) add_credits()로 잔여 크레딧 충전(같은 paymentId면 중복 충전 안 됨 = 멱등)
//
// 필요한 서버 환경변수: PORTONE_API_SECRET
import { json, env, getUser, sb, PACKS } from './_lib.js';

export const config = { runtime: 'edge' };

function parseCustomData(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try { return JSON.parse(value); } catch { return null; }
}

function readCustomerId(pay) {
  return pay?.customer?.id || pay?.customer?.customerId || pay?.customerId || '';
}

function readOrderName(pay) {
  return String(pay?.orderName || pay?.order_name || '');
}

function readProducts(pay) {
  return Array.isArray(pay?.products) ? pay.products : [];
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: '허용되지 않은 요청이에요' }, 405);

  const user = await getUser(req);
  if (!user) return json({ error: '로그인이 필요해요' }, 401);

  let body;
  try { body = await req.json(); } catch { return json({ error: '요청 형식이 잘못됐어요' }, 400); }
  const paymentId = (body?.paymentId || '').toString().trim();
  const packId = (body?.packId || '').toString().trim();
  const pack = PACKS[packId];
  if (!paymentId || !pack) return json({ error: '결제 정보를 확인할 수 없어요' }, 400);

  let secret;
  try { secret = env('PORTONE_API_SECRET'); } catch { return json({ error: '결제가 아직 준비 중이에요' }, 503); }

  // 1) PortOne에서 실제 결제 내역 조회
  let pay;
  try {
    const res = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
      headers: { authorization: `PortOne ${secret}` },
    });
    if (!res.ok) {
      const d = await res.text().catch(() => '');
      console.error('[purchase] lookup failed', res.status, d.slice(0, 300));
      return json({ error: '결제 확인에 실패했어요. 잠시 후 다시 시도해 주세요.' }, 502);
    }
    pay = await res.json();
  } catch (e) {
    return json({ error: '결제 확인 중 오류가 났어요.' }, 502);
  }

  // 2) 검증: 결제 완료 + 금액 일치 + 구매자/상품 일치
  if (pay?.status !== 'PAID') return json({ error: '결제가 완료되지 않았어요.' }, 402);

  const paid = Number(pay?.amount?.total ?? 0);
  if (paid !== pack.price) {
    console.error('[purchase] amount mismatch', { paymentId, paid, expected: pack.price });
    return json({ error: '결제 금액이 일치하지 않아요.' }, 400);
  }

  const buyerId = readCustomerId(pay);
  if (buyerId && buyerId !== user.id) {
    console.error('[purchase] buyer mismatch', { paymentId, buyerId, userId: user.id });
    return json({ error: '결제자 정보가 일치하지 않아요.' }, 403);
  }

  const custom = parseCustomData(pay?.customData ?? pay?.custom_data);
  if (custom) {
    if (custom.packId && custom.packId !== packId) return json({ error: '결제 상품 정보가 일치하지 않아요.' }, 400);
    if (custom.userId && custom.userId !== user.id) return json({ error: '결제자 정보가 일치하지 않아요.' }, 403);
    if (custom.credits && Number(custom.credits) !== pack.credits) return json({ error: '크레딧 수량이 일치하지 않아요.' }, 400);
  }

  const orderName = readOrderName(pay);
  if (orderName && !orderName.includes(String(pack.credits))) {
    console.error('[purchase] orderName mismatch', { paymentId, orderName, credits: pack.credits });
    return json({ error: '주문 정보가 일치하지 않아요.' }, 400);
  }

  const products = readProducts(pay);
  if (products.length > 0) {
    const product = products.find((p) => p?.id === packId || p?.tag === 'mallo-generation-pack') || products[0];
    const productAmount = Number(product?.amount ?? 0);
    if (productAmount && productAmount !== pack.price) return json({ error: '상품 금액이 일치하지 않아요.' }, 400);
  }

  // 3) 충전(멱등) — 같은 paymentId 재요청 시 중복 충전 안 됨
  const add = await sb('rpc/add_credits', {
    method: 'POST',
    body: JSON.stringify({
      uid: user.id,
      p_payment_id: paymentId,
      p_pack: packId,
      p_credits: pack.credits,
      p_amount: pack.price,
    }),
  });
  if (!add.ok) {
    const d = await add.text().catch(() => '');
    console.error('[purchase] add_credits failed', d.slice(0, 300));
    return json({ error: '충전 처리에 실패했어요. 결제는 정상이니 고객센터로 문의해 주세요.' }, 500);
  }
  const result = await add.json().catch(() => ({}));
  return json({ ok: true, paymentId, packId, credits_added: pack.credits, ...result });
}
