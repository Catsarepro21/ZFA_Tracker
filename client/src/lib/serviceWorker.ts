// Service worker registration and related utilities

// Check if running in Electron
const isElectron = () => {
  // Renderer process
  if (typeof window !== 'undefined' && typeof window.process === 'object' && window.process.type === 'renderer') {
    return true;
  }
  // Main process
  if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron) {
    return true;
  }
  // Detect the user agent when the `nodeIntegration` option is set to true
  if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
    return true;
  }
  return false;
};

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/) ||
    window.location.hostname.endsWith('.replit.app')
);

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

export function register(config?: Config): void {
  // Skip service worker registration in Electron
  if (isElectron()) {
    console.log('Running in Electron, skipping service worker registration');
    return;
  }
  
  if ('serviceWorker' in navigator) {
    // The URL constructor is available in all browsers that support SW
    const publicUrl = new URL(window.location.href);

    // Check if the service worker can be found. If not, reload the page
    fetch('/service-worker.js')
      .then(() => {
        // Service worker script exists, proceed with registration
        const swUrl = '/service-worker.js';
        registerValidSW(swUrl, config);
      })
      .catch(() => {
        console.warn(
          'No service worker script found. Service worker will not be registered.'
        );
      });
  }
}

function registerValidSW(swUrl: string, config?: Config): void {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      // Check for updates to the service worker at appropriate times
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched
              console.log('New content is available and will be used when the page is reloaded.');
              
              // Execute callback
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // Content has been cached for offline use.
              console.log('Content is cached for offline use.');
              
              // Execute callback
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('Error during service worker registration:', error);
    });
}

export function unregister(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

// Check if the app can be installed (PWA criteria met)
export function checkInstallable(): Promise<boolean> {
  return new Promise((resolve) => {
    // In Electron, the app is already "installed" as a desktop app
    if (isElectron()) {
      resolve(false);
      return;
    }
    
    if (!window.matchMedia('(display-mode: browser)').matches) {
      // Already installed
      resolve(false);
      return;
    }
    
    // Use the beforeinstallprompt event to check
    let deferredPrompt: any = null;
    
    const handler = (e: any) => {
      // Prevent the browser's default install prompt
      e.preventDefault();
      // Store the event for later use
      deferredPrompt = e;
      // App can be installed
      resolve(true);
      
      // Clean up
      window.removeEventListener('beforeinstallprompt', handler);
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    
    // If no event fired after a timeout, assume not installable
    setTimeout(() => {
      if (!deferredPrompt) {
        resolve(false);
        window.removeEventListener('beforeinstallprompt', handler);
      }
    }, 3000);
  });
}

// Trigger the installation prompt
export function promptInstall(): Promise<boolean> {
  return new Promise((resolve) => {
    const handler = (e: any) => {
      // Prevent the browser's default install prompt
      e.preventDefault();
      
      // Hide the custom "Add to Home Screen" prompt
      const installPrompt = e;
      
      // Show the browser's install prompt
      installPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      installPrompt.userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
          resolve(true);
        } else {
          console.log('User dismissed the install prompt');
          resolve(false);
        }
      });
      
      // Clean up the event listener
      window.removeEventListener('beforeinstallprompt', handler);
    };
    
    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', handler);
  });
}

// Background sync for offline operations
export async function registerBackgroundSync(tag: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    console.warn('Background sync not supported');
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(tag);
    return true;
  } catch (error) {
    console.error('Error registering background sync:', error);
    return false;
  }
}

// Check online status
export function useOnlineStatus(): boolean {
  return navigator.onLine;
}

// Handle push notification subscriptions
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported');
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }
    
    // Subscribe to push manager
    const options = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        // This would need to be replaced with a real VAPID public key
        'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
      )
    };
    
    const subscription = await registration.pushManager.subscribe(options);
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return null;
  }
}

// Helper function for push notifications
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}