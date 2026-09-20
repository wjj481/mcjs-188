/* MCJS 1.8.8 离线缓存 Service Worker */
const CACHE_VERSION = 'mcjs-188-v1';
const CACHE_NAME = CACHE_VERSION;

const PRECACHE_URLS = [
  './',
  'index.html',
  'classes.js',
  'assets.epk',
  'favicon.png',
  'lang/zh_CN.lang'
];

// 安装：预缓存全部游戏资源（首次完整下载，之后秒开）
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// 激活：清理旧版本缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 请求：缓存优先，失败回退网络，网络失败回退缓存
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 不缓存跨域请求（relay、联机、分析脚本走网络）
  if (url.origin !== self.location.origin) return;

  // 资源请求：缓存优先
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.epk') ||
      url.pathname.endsWith('.lang') || url.pathname.endsWith('.png')) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return resp;
        });
      })
    );
    return;
  }

  // 页面请求：网络优先（保证拿到最新页面），失败回退缓存
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(req).then((c) => c || caches.match('./')))
    );
  }
});
