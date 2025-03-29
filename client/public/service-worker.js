// Service Worker for Volunteer Tracker PWA
const CACHE_NAME = 'volunteer-tracker-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.svg',
  '/icon-512x512.svg',
  '/icon-maskable-192x192.svg',
  '/icon-maskable-512x512.svg'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first with cache fallback strategy
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Handle API requests differently (network only)
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(error => {
          console.log('Network request failed for API:', error);
          
          // For GET requests, try to return cached responses as fallback
          if (event.request.method === 'GET') {
            return caches.match(event.request);
          }
          
          // Otherwise, return a custom offline response for API
          return new Response(
            JSON.stringify({ 
              error: 'You are offline. This action will be synchronized when you reconnect.'
            }),
            { 
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }
  
  // For normal page requests, try network first then cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache the fetched response for future
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          if (event.request.method === 'GET') {
            cache.put(event.request, responseClone);
          }
        });
        return response;
      })
      .catch(() => {
        // If network fails, try to serve from cache
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // If the request is for an HTML page, return the offline page
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/');
            }
            
            // Return 404 for other resources
            return new Response('Not found', { status: 404 });
          });
      })
  );
});

// Listen for sync events (background sync)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-events') {
    event.waitUntil(syncEvents());
  } else if (event.tag === 'sync-volunteers') {
    event.waitUntil(syncVolunteers());
  }
});

// Sync events data when back online
async function syncEvents() {
  try {
    // Get pending events from IndexedDB or localStorage
    const pendingEvents = await getPendingEvents();
    
    // Process each pending event
    for (const event of pendingEvents) {
      try {
        // Try to send to server
        const response = await fetch('/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(event)
        });
        
        if (response.ok) {
          // Remove from pending queue
          await removePendingEvent(event.id);
        }
      } catch (error) {
        console.error('Failed to sync event:', error);
      }
    }
  } catch (error) {
    console.error('Error during events sync:', error);
  }
}

// Sync volunteers data when back online
async function syncVolunteers() {
  try {
    // Get pending volunteers from IndexedDB or localStorage
    const pendingVolunteers = await getPendingVolunteers();
    
    // Process each pending volunteer
    for (const volunteer of pendingVolunteers) {
      try {
        // Try to send to server
        const response = await fetch('/api/volunteers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(volunteer)
        });
        
        if (response.ok) {
          // Remove from pending queue
          await removePendingVolunteer(volunteer.id);
        }
      } catch (error) {
        console.error('Failed to sync volunteer:', error);
      }
    }
  } catch (error) {
    console.error('Error during volunteers sync:', error);
  }
}

// Helper functions for IndexedDB operations (simplified - would need implementation)
async function getPendingEvents() {
  // This would be implemented to get pending events from IndexedDB
  // For simplicity, return empty array in this example
  return [];
}

async function removePendingEvent(id) {
  // This would be implemented to remove the event from IndexedDB
  console.log('Removed pending event:', id);
}

async function getPendingVolunteers() {
  // This would be implemented to get pending volunteers from IndexedDB
  // For simplicity, return empty array in this example
  return [];
}

async function removePendingVolunteer(id) {
  // This would be implemented to remove the volunteer from IndexedDB
  console.log('Removed pending volunteer:', id);
}

// Periodic sync (if supported)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'google-sheets-sync') {
    event.waitUntil(syncGoogleSheets());
  }
});

// Function to trigger Google Sheets sync
async function syncGoogleSheets() {
  try {
    const response = await fetch('/api/admin/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('Google Sheets sync completed successfully');
    } else {
      console.error('Google Sheets sync failed with status:', response.status);
    }
  } catch (error) {
    console.error('Error during Google Sheets sync:', error);
  }
}