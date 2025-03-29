import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { registerBackgroundSync } from "./serviceWorker";

// Unique ID generator for pending operations
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Store pending operations when offline
async function storePendingOperation(type: 'events' | 'volunteers', method: string, url: string, data?: unknown) {
  if ('indexedDB' in window) {
    try {
      const dbName = 'volunteer-tracker-offline';
      const dbVersion = 1;
      const storeName = 'pendingOperations';
      
      const request = indexedDB.open(dbName, dbVersion);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
        }
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        
        const operation = {
          id: generateId(),
          type,
          method,
          url,
          body: data,
          timestamp: Date.now()
        };
        
        store.add(operation);
        
        tx.oncomplete = () => {
          db.close();
          // Try to register background sync
          registerBackgroundSync(`sync-${type}`);
        };
      };
    } catch (error) {
      console.error('Failed to store pending operation:', error);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Check if data contains a password field, if so add it as a header
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  
  // If there's a password field in the data, add it as a header
  if (data && typeof data === 'object' && 'password' in data) {
    headers['X-ADMIN-PASSWORD'] = (data as any).password;
    
    // For GET requests, add password as a query parameter
    if (method === 'GET' && !url.includes('?')) {
      url = `${url}?password=${encodeURIComponent((data as any).password)}`;
    }
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data && method !== 'GET' ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // If fetch fails due to network error (offline)
    if (!navigator.onLine && method !== 'GET') {
      // Store the operation for later sync
      const type = url.includes('events') ? 'events' : 'volunteers';
      await storePendingOperation(type, method, url, data);
      
      // Create a mock response for optimistic UI updates
      const mockResponse = new Response(JSON.stringify({
        id: -Math.floor(Math.random() * 1000), // Temporary negative ID
        ...data,
        _offlineCreated: true
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
      return mockResponse;
    }
    
    // Rethrow for other errors
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, queryFnContext }) => {
    // Check if second element in query key is an object with password
    const adminPassword = queryFnContext?.meta?.adminPassword || 
                        (queryKey.length > 1 && typeof queryKey[1] === 'object' && 
                         queryKey[1] !== null && 'password' in queryKey[1]) ? 
                        (queryKey[1] as any).password : null;
    
    let url = queryKey[0] as string;
    
    // Add password as query parameter if it exists
    if (adminPassword) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}password=${encodeURIComponent(adminPassword)}`;
    }
    
    const headers: Record<string, string> = {};
    if (adminPassword) {
      headers['X-ADMIN-PASSWORD'] = adminPassword;
    }
    
    try {
      const res = await fetch(url, {
        credentials: "include",
        headers
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      // If offline, try to get data from IndexedDB
      if (!navigator.onLine && 'indexedDB' in window) {
        try {
          const dbName = 'volunteer-tracker-offline';
          const dbVersion = 1;
          
          // Determine which store to use based on the URL
          const storeName = url.includes('/events') ? 'events' : 
                           url.includes('/volunteers') ? 'volunteers' : null;
          
          if (storeName) {
            return new Promise((resolve, reject) => {
              const request = indexedDB.open(dbName, dbVersion);
              
              request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
              };
              
              request.onsuccess = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                
                // Check if the store exists
                if (!db.objectStoreNames.contains(storeName)) {
                  db.close();
                  reject(new Error(`Store ${storeName} not found`));
                  return;
                }
                
                try {
                  const tx = db.transaction(storeName, 'readonly');
                  const store = tx.objectStore(storeName);
                  
                  // Handle specific ID queries
                  const idMatch = url.match(/\/(\d+)$/);
                  if (idMatch && idMatch[1]) {
                    const id = parseInt(idMatch[1], 10);
                    const request = store.get(id);
                    
                    request.onsuccess = () => {
                      if (request.result) {
                        resolve(request.result);
                      } else {
                        reject(new Error(`Item with ID ${id} not found in offline storage`));
                      }
                    };
                  } else {
                    // Return all items from the store
                    const request = store.getAll();
                    
                    request.onsuccess = () => {
                      resolve(request.result || []);
                    };
                  }
                  
                  tx.oncomplete = () => {
                    db.close();
                  };
                } catch (txError) {
                  db.close();
                  reject(txError);
                }
              };
            });
          }
        } catch (dbError) {
          console.error('IndexedDB access error:', dbError);
        }
      }
      
      // Rethrow the original error if we couldn't get data from IndexedDB
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
