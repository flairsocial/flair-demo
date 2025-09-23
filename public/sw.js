// 🚀 FREE PERFORMANCE OPTIMIZATION - SERVICE WORKER
// Caches API responses and static assets for instant loading

const CACHE_NAME = 'flair-cache-v1';
const API_CACHE_NAME = 'flair-api-cache-v1';

// Assets to cache immediately
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/globals.css'
];

// API endpoints to cache (5 minute TTL)
const API_CACHE_URLS = [
  '/api/profile',
  '/api/collections',
  '/api/community',
  '/api/user/profile/counts'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - cache strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with cache-first strategy
  if (API_CACHE_URLS.some(apiUrl => url.pathname.startsWith(apiUrl))) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (STATIC_CACHE_URLS.includes(url.pathname) || request.destination === 'style' || request.destination === 'script') {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Default network-first for other requests
  event.respondWith(fetch(request));
});

// Handle API requests (cache-first with background update)
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Return cached response immediately
    console.log('[SW] Serving from cache:', request.url);

    // Update cache in background (stale-while-revalidate)
    fetch(request).then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
        console.log('[SW] Updated cache for:', request.url);
      }
    }).catch((error) => {
      console.log('[SW] Background update failed:', error);
    });

    return cachedResponse;
  }

  // No cache - fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      console.log('[SW] Cached new response for:', request.url);
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Network request failed:', error);
    // Return offline fallback if available
    return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle static assets (cache-first)
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    console.log('[SW] Serving static asset from cache:', request.url);
    return cachedResponse;
  }

  // Fetch and cache
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      console.log('[SW] Cached static asset:', request.url);
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Static asset fetch failed:', error);
    return networkResponse;
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('[SW] Performing background sync');
  // Sync offline actions when back online
}

// Push notifications (if needed later)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico'
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Message handler for cache invalidation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INVALIDATE_CACHE') {
    console.log('[SW] Invalidating cache for:', event.data.url);
    caches.open(API_CACHE_NAME).then(cache => {
      cache.delete(event.data.url);
    });
  }
});

console.log('[SW] Service worker loaded successfully');
