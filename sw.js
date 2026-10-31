// 小棋童学国际象棋 · Service Worker（由 vite 插件在构建时生成，勿手改）
// 与旧版的关键区别：安装时就把 index.html + 当次全部哈希 JS/CSS/图标/清单预缓存，
// 首次访问即拥有完整离线包 —— iPad「添加到主屏幕」后离线启动不再白屏。
// VERSION 为资产内容哈希：每次发布自动换代，激活时清除所有旧缓存。
const VERSION = 'chess-kids-12399b8a337b';
const BASE = new URL('.', self.registration.scope).pathname;
const PRECACHE = ["index.html","assets/index-C0I8Y9Un.css","assets/index-DLsrrkSd.js","apple-touch-icon.png","favicon.svg","icon-192.png","icon-512.png","icon-maskable-512.png","icon.svg","manifest.webmanifest"].map((p) => BASE + p);

self.addEventListener('install', (event) => {
  // 逐项 add（不用 addAll：WebKit 对 addAll 的重复项/重定向更敏感，易静默挂起）
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  // 页面导航：网络优先拿最新版；离线回退到预缓存的 index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(BASE + 'index.html', copy));
          return res;
        })
        .catch(() => caches.match(BASE + 'index.html')),
    );
    return;
  }

  // 静态资源（哈希文件名，内容变必改名）：缓存优先，未命中回源并写回
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(event.request, copy));
        }
        return res;
      });
    }),
  );
});
