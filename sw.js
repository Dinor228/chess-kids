// 小棋童学国际象棋 · Service Worker
// 作用：把整个应用缓存到设备上，iPad「添加到主屏幕」后可完全离线游玩。
// 策略：
//   - 首次访问预缓存外壳（/、index.html、图标、清单）
//   - 带哈希的构建产物：缓存优先（新版本发布时文件名变化，天然不会读到旧代码）
//   - 页面导航：网络优先、失败回退缓存的 index.html（离线也能启动）
const VERSION = 'chess-kids-v1';

// 基础路径从注册作用域推算：根路径部署是 '/'，
// GitHub Pages 子路径部署（如 /chess-kids/）也能正确缓存
const BASE = new URL('.', self.registration.scope).pathname;

const PRECACHE = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.webmanifest',
  BASE + 'icon.svg',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png',
  BASE + 'icon-maskable-512.png',
  BASE + 'apple-touch-icon.png',
  BASE + 'favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
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

  // 页面导航：网络优先，离线时用缓存的外壳启动
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

  // 静态资源：缓存优先，未命中再取网络并写回缓存
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
