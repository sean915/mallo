// POST /api/proxy — 생성된 도구가 window.말로.fetch 로 호출하는 외부 API 중계.
// 보안: 로그인 필요 + 허용 호스트(화이트리스트)만 + 키 필요한 제공자는 서버 env 키 주입.
import { json, env, getUser } from './_lib.js';

export const config = { runtime: 'edge' };

export default async function handler(req){
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const user = await getUser(req);
  if (!user) return json({ error: '로그인이 필요해요' }, 401);
  let body; try { body = await req.json(); } catch (e) { return json({ error: '잘못된 요청이에요' }, 400); }
  const target = (body && body.url) ? String(body.url) : '';
  if (target.slice(0, 8).toLowerCase() !== 'https://') return json({ error: 'https 주소만 허용돼요' }, 400);
  let u; try { u = new URL(target); } catch (e) { return json({ error: 'URL 형식이 올바르지 않아요' }, 400); }
  const host = u.hostname.toLowerCase();
  const allow = env('PROXY_ALLOWED_HOSTS', 'www.googleapis.com,youtube.googleapis.com').split(',').map(function(h){ return h.trim().toLowerCase(); }).filter(Boolean);
  if (allow.indexOf(host) === -1) return json({ error: '허용되지 않은 API 주소예요: ' + host }, 403);
  // 유튜브 데이터 API 등: 서버 키 주입 (코드에 키 노출 없이)
  if (host.indexOf('googleapis.com') !== -1 && u.pathname.indexOf('/youtube/') !== -1 && !u.searchParams.get('key')) {
    const yk = env('YOUTUBE_API_KEY', '');
    if (yk) u.searchParams.set('key', yk);
  }
  const method = (body.method || 'GET').toUpperCase();
  const headers = (body.headers && typeof body.headers === 'object') ? body.headers : {};
  delete headers.host; delete headers.cookie; delete headers.authorization;
  let res;
  try {
    res = await fetch(u.toString(), { method: method, headers: headers, body: (method === 'GET' || method === 'HEAD') ? undefined : JSON.stringify(body.body || {}) });
  } catch (e) { return json({ error: '외부 호출에 실패했어요' }, 502); }
  const ct = res.headers.get('content-type') || '';
  let text = await res.text();
  if (text.length > 200000) text = text.slice(0, 200000);
  return new Response(JSON.stringify({ status: res.status, contentType: ct, body: text }), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
