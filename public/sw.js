/**
 * Service Worker for PWA Push Notifications
 * Place in public/sw.js
 */

// Cache management
const CACHE_NAME = 'dirq-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((error) => {
        console.error('Cache addAll error:', error);
      });
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Network first for API calls
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      }).catch(() => {
        return caches.match(request).then((response) => {
          return response || new Response('Network error happened', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
    );
    return;
  }

  // Cache first for other resources
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(request).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      });
    }).catch(() => {
      return new Response('Network error happened', {
        status: 408,
        headers: { 'Content-Type': 'text/plain' }
      });
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Dirq Notification',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'dirq-notification',
    requireInteraction: false
  };

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: {
        deepLink: notificationData.data?.deepLink,
        notificationId: notificationData.data?.notificationId,
        priority: notificationData.data?.priority
      },
      actions: [
        {
          action: 'open',
          title: 'Open'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ]
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { action, notification } = event;

  if (action === 'close') {
    return;
  }

  const deepLink = notification.data?.deepLink || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          // App is open, focus it and navigate
          client.focus();
          client.postMessage({
            type: 'NAVIGATE',
            deepLink: deepLink
          });
          return;
        }
      }
      // App not open, open it
      if (clients.openWindow) {
        return clients.openWindow(deepLink);
      }
    })
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      fetch('/api/notifications/sync')
        .then((response) => response.json())
        .then((data) => {
          console.log('Notifications synced:', data);
        })
        .catch((error) => {
          console.error('Sync error:', error);
        })
    );
  }
});

// Periodic background sync (for checking notifications periodically)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-notifications') {
    event.waitUntil(
      fetch('/api/notifications/check')
        .then((response) => response.json())
        .then((data) => {
          if (data.notifications && data.notifications.length > 0) {
            // Send message to all clients
            self.clients.matchAll().then((clients) => {
              clients.forEach((client) => {
                client.postMessage({
                  type: 'NEW_NOTIFICATIONS',
                  notifications: data.notifications
                });
              });
            });
          }
        })
        .catch((error) => {
          console.error('Periodic sync error:', error);
        })
    );
  }
});
