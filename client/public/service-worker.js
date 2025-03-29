/* eslint-disable no-restricted-globals */

// Cache name with version
const CACHE_NAME = 'volunteer-tracker-v1';

// Assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
  '/icons/maskable_icon.svg'
];

// API endpoints to cache
const API_CACHE_NAME = 'volunteer-tracker-api-v1';
const API_ENDPOINTS = [
  '/api/volunteers',
  '/api/events'
];

// IndexedDB setup for offline data storage
const DB_NAME = 'volunteer-tracker-offline';
const DB_VERSION = 1;
const STORES = {
  PENDING_OPERATIONS: 'pendingOperations',
  VOLUNTEERS: 'volunteers',
  EVENTS: 'events'
};

// Install event - cache static files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheAllowlist = [CACHE_NAME, API_CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheAllowlist.includes(cacheName)) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests and browser extensions
  if (
    event.request.method !== 'GET' ||
    url.protocol === 'chrome-extension:' ||
    url.hostname === 'extension'
  ) {
    return;
  }
  
  // API requests handling
  if (url.pathname.startsWith('/api/')) {
    // Network first, then cache for API requests
    event.respondWith(handleApiRequest(event.request));
    return;
  }
  
  // Static assets handling (cache first)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200) {
            return response;
          }
          
          // Clone the response to cache it and return it
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        })
        .catch(() => {
          // Fallback for HTML requests (return index.html)
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/');
          }
          return new Response('Network error happened', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
    })
  );
});

// Handle API requests (network first, then cache)
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    // Clone the response to store in cache and return the original
    const responseToCache = networkResponse.clone();
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, responseToCache);
      
      // If it's one of our tracked API endpoints, also store in IndexedDB
      if (API_ENDPOINTS.some(endpoint => request.url.includes(endpoint))) {
        const data = await responseToCache.clone().json();
        const db = await openDatabase();
        const tx = db.transaction(
          request.url.includes('/api/volunteers') ? STORES.VOLUNTEERS : STORES.EVENTS,
          'readwrite'
        );
        const store = tx.objectStore(
          request.url.includes('/api/volunteers') ? STORES.VOLUNTEERS : STORES.EVENTS
        );
        
        // Clear existing data and add new data
        await store.clear();
        if (Array.isArray(data)) {
          for (const item of data) {
            await store.put(item);
          }
        } else {
          await store.put(data);
        }
        
        await tx.complete;
        db.close();
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network request failed, trying cache', error);
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not in cache, try IndexedDB for API endpoints
    if (API_ENDPOINTS.some(endpoint => request.url.includes(endpoint))) {
      try {
        const db = await openDatabase();
        const tx = db.transaction(
          request.url.includes('/api/volunteers') ? STORES.VOLUNTEERS : STORES.EVENTS,
          'readonly'
        );
        const store = tx.objectStore(
          request.url.includes('/api/volunteers') ? STORES.VOLUNTEERS : STORES.EVENTS
        );
        
        // Get all data from store
        const data = await store.getAll();
        db.close();
        
        if (data && data.length > 0) {
          return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (dbError) {
        console.error('[Service Worker] IndexedDB access error', dbError);
      }
    }
    
    // Fallback response
    return new Response(JSON.stringify({ error: 'You are offline and no cached data is available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Background sync for pending operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-volunteers') {
    event.waitUntil(syncVolunteers());
  } else if (event.tag === 'sync-events') {
    event.waitUntil(syncEvents());
  }
});

async function syncEvents() {
  const pendingOperations = await getPendingOperations('events');
  
  for (const operation of pendingOperations) {
    try {
      const response = await fetch(operation.url, {
        method: operation.method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: operation.body ? JSON.stringify(operation.body) : undefined
      });
      
      if (response.ok) {
        // Remove from pending operations if successful
        await removePendingOperation('events', operation.id);
        
        // Notify the client about the successful sync
        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({
            type: 'SYNC_SUCCESS',
            operationType: 'events',
            operation: operation
          });
        }
      }
    } catch (error) {
      console.error('[Service Worker] Sync failed for event operation', error);
    }
  }
}

async function syncVolunteers() {
  const pendingOperations = await getPendingOperations('volunteers');
  
  for (const operation of pendingOperations) {
    try {
      const response = await fetch(operation.url, {
        method: operation.method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: operation.body ? JSON.stringify(operation.body) : undefined
      });
      
      if (response.ok) {
        // Remove from pending operations if successful
        await removePendingOperation('volunteers', operation.id);
        
        // Notify the client about the successful sync
        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({
            type: 'SYNC_SUCCESS',
            operationType: 'volunteers',
            operation: operation
          });
        }
      }
    } catch (error) {
      console.error('[Service Worker] Sync failed for volunteer operation', error);
    }
  }
}

async function getPendingOperations(type) {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORES.PENDING_OPERATIONS, 'readonly');
    const store = tx.objectStore(STORES.PENDING_OPERATIONS);
    const operations = await store.getAll();
    db.close();
    
    return operations.filter(op => op.type === type);
  } catch (error) {
    console.error('[Service Worker] Error getting pending operations', error);
    return [];
  }
}

async function removePendingOperation(type, id) {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORES.PENDING_OPERATIONS, 'readwrite');
    const store = tx.objectStore(STORES.PENDING_OPERATIONS);
    await store.delete(id);
    await tx.complete;
    db.close();
  } catch (error) {
    console.error('[Service Worker] Error removing pending operation', error);
  }
}

// Open IndexedDB database
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      reject(new Error('Failed to open database'));
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.PENDING_OPERATIONS)) {
        const pendingStore = db.createObjectStore(STORES.PENDING_OPERATIONS, { keyPath: 'id' });
        pendingStore.createIndex('type', 'type', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.VOLUNTEERS)) {
        db.createObjectStore(STORES.VOLUNTEERS, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.EVENTS)) {
        const eventsStore = db.createObjectStore(STORES.EVENTS, { keyPath: 'id' });
        eventsStore.createIndex('volunteerId', 'volunteerId', { unique: false });
      }
    };
  });
}

// Push notification handling
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Volunteer Tracker';
  const options = {
    body: data.body || 'New update available',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-72x72.svg',
    data: data.data || {}
  };
  
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Customize click behavior based on notification data
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientsArr) => {
      // Check if a window is already open and focus it
      const hadWindowToFocus = clientsArr.some((windowClient) => {
        if (windowClient.url === urlToOpen) {
          return windowClient.focus();
        }
        return false;
      });
      
      // If no window is open, open a new one
      if (!hadWindowToFocus) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});