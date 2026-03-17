import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useMemo } from "react";

export function useAuth() {
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (result) => {
      utils.auth.me.setData(undefined, result.user ?? null);
      await utils.auth.me.invalidate();
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const loginWithPassword = useCallback(async (identifier: string, password: string) => {
    return loginMutation.mutateAsync({ identifier, password });
  }, [loginMutation]);

  const state = useMemo(() => {
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(meQuery.data)
    );
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading,
      error: meQuery.error ?? logoutMutation.error ?? loginMutation.error ?? null,
      authSubmitting: loginMutation.isPending || logoutMutation.isPending,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    loginMutation.error,
    loginMutation.isPending,
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  return {
    ...state,
    loginWithPassword,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
