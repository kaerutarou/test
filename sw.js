// Service Worker for JavaScriptクイズゲーム
const CACHE_NAME = 'quiz-game-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './quiz_icon_192.png',
  './quiz_icon_512.png'
];

// インストール時: 静的リソースをキャッシュ
self.addEventListener('install', (event) => {
  console.log('[Service Worker] インストール中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] キャッシュを開きました');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] すべてのリソースをキャッシュしました');
        return self.skipWaiting(); // 即座にアクティブ化
      })
  );
});

// アクティベート時: 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] アクティベート中...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] 古いキャッシュを削除:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] アクティベート完了');
      return self.clients.claim(); // すぐに制御を開始
    })
  );
});

// フェッチ時: キャッシュファースト戦略（オフライン対応）
self.addEventListener('fetch', (event) => {
  // data/quizzes.json は動的読み込み（ファイル選択）に任せるため、キャッシュしない
  if (event.request.url.includes('data/quizzes.json')) {
    // ネットワーク経由で取得（キャッシュなし）
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュにあればそれを返す
        if (response) {
          console.log('[Service Worker] キャッシュから返却:', event.request.url);
          return response;
        }

        // キャッシュになければネットワークから取得
        console.log('[Service Worker] ネットワークから取得:', event.request.url);
        return fetch(event.request).then((response) => {
          // 有効なレスポンスでない場合はそのまま返す
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // レスポンスをキャッシュに保存（将来の利用のため）
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // オフラインでキャッシュもない場合
        console.log('[Service Worker] オフライン、かつキャッシュなし');
        // 必要に応じてオフラインページを返すことも可能
      })
  );
});
