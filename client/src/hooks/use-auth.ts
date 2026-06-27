import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";

interface AuthStatus {
  authenticated: boolean;
}

export function useAuth() {
  const { data, isLoading, isError } = useQuery<AuthStatus>({
    queryKey: ["/api/auth/status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 2 * 60 * 1000, // re-check every 2 min
    refetchOnWindowFocus: true,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("POST", "/api/auth/login", { password });
      return res.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/status"], { authenticated: true });
      // Invalidate all cached data so fresh data loads after login
      queryClient.invalidateQueries();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      // Clear all cached data on logout
      queryClient.clear();
      queryClient.setQueryData(["/api/auth/status"], { authenticated: false });
    },
  });

  return {
    isAuthenticated: data?.authenticated === true,
    isLoading,
    isError,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error as Error | null,
    isLoggingOut: logoutMutation.isPending,
  };
}
