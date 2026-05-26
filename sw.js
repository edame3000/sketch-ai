const CACHE_NAME = 'sketch-ai-v2';
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/sw.js'
];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache opened and files cached');
                // نسخ الملفات الموجودة فقط
                return Promise.allSettled(
                    URLS_TO_CACHE.map(url => cache.add(url).catch(err => 
                        console.log(`Could not cache ${url}: ${err.message}`)
                    ))
                );
            })
            .then(() => self.skipWaiting()) // تفعيل فوري
            .catch((error) => console.log('Install failed:', error))
    );
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).catch(error => console.log('Activation failed:', error))
    );
    self.clients.claim();
});

// استراتيجية Fetch محسّنة
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const { url, method } = request;

    // 1️⃣ تخطي طلبات غير GET
    if (method !== 'GET') {
        return;
    }

    // 2️⃣ معالجة خاصة لطلبات API الخارجية
    // Together AI, Deep AI, Replicate, Canvas/Image APIs
    if (
        url.includes('api.together.xyz') ||
        url.includes('api.deepai.org') ||
        url.includes('api.replicate.com') ||
        url.includes('cdn.openai.com') ||
        url.includes('replicate.delivery') ||
        url.includes('images.replicate.delivery')
    ) {
        // شبكة أولاً ثم كاش (Network First Strategy)
        event.respondWith(
            fetch(request, {
                mode: 'cors',
                credentials: 'omit'
            })
                .then((response) => {
                    // تخزين الصور المولدة
                    if (response.status === 200 && response.headers.get('content-type')?.includes('image')) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch((error) => {
                    console.log('API request failed, trying cache:', url, error);
                    // الرجوع للكاش عند الفشل
                    return caches.match(request)
                        .then(cachedResponse => cachedResponse || createPlaceholderImage());
                })
        );
        return;
    }

    // 3️⃣ للموارد المحلية (HTML, JS, CSS, etc)
    // استخدم الكاش أولاً ثم الشبكة (Cache First Strategy)
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                return fetch(request)
                    .then((response) => {
                        // تخزين الموارد الناجحة
                        if (!response || response.status !== 200 || response.type === 'error') {
                            return response;
                        }

                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, responseClone);
                        });

                        return response;
                    })
                    .catch((error) => {
                        console.log('Fetch failed:', url, error);
                        // إرجاع صفحة offline إذا كانت موجودة
                        return caches.match('/index.html')
                            .catch(() => new Response('Offline', { status: 503 }));
                    });
            })
            .catch((error) => {
                console.log('Cache match failed:', error);
                return fetch(request).catch(() => 
                    new Response('Offline', { status: 503 })
                );
            })
    );
});

// إنشاء صورة placeholder
function createPlaceholderImage() {
    try {
        const canvas = new OffscreenCanvas(512, 512);
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#667cea';
        ctx.fillRect(0, 0, 512, 512);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ Offline', 256, 256);
        
        return canvas.convertToBlob({ type: 'image/png' })
            .then(blob => new Response(blob, {
                headers: { 'Content-Type': 'image/png' }
            }));
    } catch (error) {
        console.log('Placeholder creation failed:', error);
        return new Response('Error', { status: 503 });
    }
}

// معالج الرسائل من الـ client
self.addEventListener('message', (event) => {
    console.log('Message received in SW:', event.data);
    
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
    
    if (event.data.action === 'clearCache') {
        caches.delete(CACHE_NAME).then(() => {
            event.ports[0].postMessage({ success: true });
        });
    }
});
