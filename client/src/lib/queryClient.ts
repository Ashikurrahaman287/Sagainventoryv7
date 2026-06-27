import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const data = await res.json();
      errorMessage = data.error || data.message || res.statusText;
    } catch {
      errorMessage = (await res.text()) || res.statusText;
    }
    const err: any = new Error(errorMessage);
    err.status = res.status;
    throw err;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401 }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const res = await fetch(url, { credentials: "include" });

    if (res.status === 401) {
      if (on401 === "returnNull") return null as any;
      // Signal all other queries to re-check auth status
      queryClient.setQueryData(["/api/auth/status"], { authenticated: false });
      const err: any = new Error("Session expired. Please log in again.");
      err.status = 401;
      throw err;
    }

    await throwIfResNotOk(res);
    return res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 30 * 1000,
      retry: (failureCount, error: any) => {
        // Don't retry auth errors
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
