const CACHE_NAME = 'mathwinner-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/globals.css',
  '/manifest.json',
  '/file.svg',
  '/globe.svg',
  '/next.svg',
  '/vercel.svg',
  '/window.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Let the browser handle standard API or large file uploads normally
  if (event.request.url.includes('/api/v1/chapters/upload') || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request).then((response) => {
        // Cache static page files, chunks, fonts, etc. dynamically
        const isStaticAsset = event.request.url.includes('/_next/') || 
                              event.request.url.includes('/static/') ||
                              event.request.url.match(/\.(js|css|png|jpg|jpeg|svg|woff2|json)$/);
                              
        if (isStaticAsset && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // If offline and request is page layout
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
