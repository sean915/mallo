// 말로 도구 — 설치형 웹앱(PWA)용 최소 서비스워커
// 설치 가능 조건을 충족시키는 용도. 네트워크는 기본 동작에 맡김(오프라인 캐싱은 추후).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* 기본 네트워크 처리 */ });
