// 🚀 FREE PERFORMANCE OPTIMIZATION - SERVICE WORKER REGISTRATION
// Registers the service worker for caching and offline support

export class ServiceWorkerManager {
  static async register() {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      try {
        console.log('[SW] Registering service worker...');

        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('[SW] Service worker registered successfully:', registration.scope);

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available
                console.log('[SW] New version available, refreshing...');
                window.location.reload();
              }
            });
          }
        });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          console.log('[SW] Message from service worker:', event.data);
        });

        return registration;
      } catch (error) {
        console.error('[SW] Service worker registration failed:', error);
      }
    } else {
      console.log('[SW] Service workers not supported');
    }
  }

  static async unregister() {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('[SW] Service worker unregistered');
      }
    }
  }

  static async invalidateCache(url: string) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'INVALIDATE_CACHE',
        url
      });
    }
  }

  static async getCacheStats() {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const stats: Record<string, number> = {};

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        stats[cacheName] = keys.length;
      }

      return stats;
    }
    return {};
  }
}

// Auto-register on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    ServiceWorkerManager.register();
  });
}

export default ServiceWorkerManager;
