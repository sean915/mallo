// GET /api/manifest?t=<도구ID>&name=<이름> — 도구별 설치형 웹앱 매니페스트
// 도구마다 별개의 앱으로 설치되도록 id/start_url 을 도구별로 다르게 발급.
export const config = { runtime: 'edge' };

export default function handler(req) {
  const url = new URL(req.url);
  const t = (url.searchParams.get('t') || '').slice(0, 64);
  const name = (url.searchParams.get('name') || '내 도구').slice(0, 40);
  const start = t ? `/?t=${encodeURIComponent(t)}` : '/';
  const manifest = {
    id: start,
    name: `${name} · 말로`,
    short_name: name.slice(0, 12),
    start_url: start,
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#3182f6',
    lang: 'ko',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { 'content-type': 'application/manifest+json; charset=utf-8', 'cache-control': 'no-cache' },
  });
}
