const CACHE_NAME = 'sketch-ai-v1';
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/sw.js'
];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(URLS_TO_CACHE);
        }).catch(() => {
            // تجاوز الأخطاء إذا لم تكن الملفات موجودة
            self.skipWaiting();
        })
    );
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// استراتيجية Fetch
self.addEventListener('fetch', (event) => {
    // تخطي طلبات الـ POST وطلبات خارج الموقع
    if (event.request.method !== 'GET') {
        return;
    }

    // للصور من API خارجي، حاول الشبكة أولاً ثم الكاش
    if (event.request.url.includes('pollinations.ai')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => response)
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // للموارد المحلية، استخدم الكاش أولاً ثم الشبكة
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        }).catch(() => {
            return fetch(event.request);
        })
    );
});
