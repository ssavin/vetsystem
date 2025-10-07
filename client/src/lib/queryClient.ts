import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch (error) {
    console.error("Failed to refresh token:", error);
    return false;
  }
}

async function throwIfResNotOk(res: Response, originalRequest?: () => Promise<Response>) {
  if (!res.ok) {
    // If we get a 401 and this isn't already a refresh request, try to refresh token
    if (res.status === 401 && originalRequest && !res.url.includes('/api/auth/refresh')) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry original request with new token
        const retryRes = await originalRequest();
        if (retryRes.ok) {
          return retryRes;
        }
        // If retry also failed, throw error based on retry response
        const retryText = (await retryRes.text()) || retryRes.statusText;
        throw new Error(`${retryRes.status}: ${retryText}`);
      }
    }
    
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return res;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const makeRequest = async () => fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  const res = await makeRequest();
  return await throwIfResNotOk(res, makeRequest);
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const makeRequest = async () => fetch(url, {
      credentials: "include",
    });

    const res = await makeRequest();

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      // Try to refresh token first
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry request with new token
        const retryRes = await makeRequest();
        if (retryRes.ok) {
          return await retryRes.json();
        }
      }
      return null;
    }

    const finalRes = await throwIfResNotOk(res, makeRequest);
    return await finalRes.json();
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
