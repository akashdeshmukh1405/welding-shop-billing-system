// ==============================================================================
// Service Worker for Jai Mata Di Billing System PWA
// Compliant with PWABuilder & Android Chrome requirements
// Strict Security: ZERO caching of API routes, Auth, Invoices, Payments, or PDFs
// ==============================================================================

const CACHE_NAME = 'jmd-billing-static-v1';

// Static assets to pre-cache on install for instant app launch
const STATIC_PRECACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/branding/jaimatadi-logo.jpg',
];

// Patterns that MUST NEVER BE CACHED (Strict Security Rule)
function shouldBypassCache(url, request) {
  // Only GET requests can ever be cached
  if (request.method !== 'GET') {
    return true;
  }

  const pathname = url.pathname;

  // 1. Never cache any API endpoints
  if (pathname.startsWith('/api/')) {
    return true;
  }

  // 2. Never cache authentication pages or actions
  if (pathname.includes('/login') || pathname.includes('/logout') || pathname.includes('/auth')) {
    return true;
  }

  // 3. Never cache dynamic financial data, customer details, or PDF generation
  if (
    pathname.includes('/pdf') ||
    pathname.includes('/bills/') ||
    pathname.includes('/customers/') ||
    pathname.endsWith('.pdf')
  ) {
    return true;
  }

  // 4. Never cache Supabase endpoints or external services
  if (url.origin !== self.location.origin) {
    return true;
  }

  return false;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_PRECACHE))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[PWA SW] Pre-caching encountered non-critical error:', err);
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Strictly bypass service worker for sensitive data, APIs, auth, and external requests
  if (shouldBypassCache(url, request)) {
    return; // Standard network fetch, zero cache interference
  }

  // Cache-first for static icons and branding images
  if (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/branding/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Network-first with fallback for HTML navigation
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request).then((cached) => {
          return cached || caches.match('/');
        });
      })
    );
    return;
  }

  // Stale-while-revalidate for static scripts/styles
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
