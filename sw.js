// 체온·혈압 노트 — 오프라인 캐시
// 앱 파일을 바꿀 때마다 VERSION을 올리면 휴대폰이 새 버전을 받아요.
const VERSION = "v1";
const SHELL = `shell-${VERSION}`;
const FONTS = "fonts";
const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 글꼴: 캐시 먼저, 없으면 받아서 저장
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(FONTS).then((c) =>
        c.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }))
      ).catch(() => Response.error())
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // 페이지: 인터넷이 되면 새 버전, 안 되면 저장된 버전
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(SHELL).then((c) => c.put("./index.html", copy)); return res; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // 그 밖의 앱 파일: 캐시 먼저
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
