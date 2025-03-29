import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
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
    headers['X-Admin-Password'] = (data as any).password;
    
    // For GET requests, add password as a query parameter
    if (method === 'GET' && !url.includes('?')) {
      url = `${url}?password=${encodeURIComponent((data as any).password)}`;
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data && method !== 'GET' ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
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
      headers['X-Admin-Password'] = adminPassword;
    }
    
    const res = await fetch(url, {
      credentials: "include",
      headers
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
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
