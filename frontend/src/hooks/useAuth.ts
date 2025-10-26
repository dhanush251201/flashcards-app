import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/store/authStore";

type Credentials = {
  email: string;
  password: string;
};

type SignupPayload = Credentials & {
  full_name?: string;
};

export const useAuth = () => {
  const { accessToken, refreshToken, user, setTokens, setUser, clear, isHydrated } = useAuthStore();
  const queryClient = useQueryClient();

  const userQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await apiClient.get("/me");
      return data;
    },
    enabled: Boolean(accessToken),
    staleTime: 1000 * 60 * 5
  });

  useEffect(() => {
    if (userQuery.data) {
      setUser(userQuery.data);
    }
  }, [userQuery.data, setUser]);

  useEffect(() => {
    if (userQuery.isError) {
      clear();
    }
  }, [userQuery.isError, clear]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: Credentials) => {
      const params = new URLSearchParams();
      params.append("username", email);
      params.append("password", password);
      const { data } = await apiClient.post("/auth/login", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      return data;
    },
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    }
  });

  const signupMutation = useMutation({
    mutationFn: async ({ email, password, full_name }: SignupPayload) => {
      const { data } = await apiClient.post("/auth/signup", {
        email,
        password,
        full_name
      });
      return data;
    },
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post("/auth/logout");
    },
    onSuccess: () => {
      clear();
      queryClient.clear();
    }
  });

  return {
    accessToken,
    refreshToken,
    user,
    isHydrated,
    isLoadingUser: userQuery.isLoading && Boolean(accessToken),
    login: loginMutation.mutateAsync,
    signup: signupMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    loginStatus: loginMutation.status,
    signupStatus: signupMutation.status,
    loginError: loginMutation.error as AxiosError | null,
    signupError: signupMutation.error as AxiosError | null
  };
};
