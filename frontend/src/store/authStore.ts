import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthUser = {
  id: number;
  email: string;
  full_name?: string | null;
  role: "USER" | "ADMIN";
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isHydrated: boolean;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: AuthUser | null) => void;
  clear: () => void;
  markHydrated: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isHydrated: false,
      setTokens: (access, refresh) =>
        set(() => ({
          accessToken: access,
          refreshToken: refresh
        })),
      setUser: (user) =>
        set(() => ({
          user
        })),
      clear: () =>
        set(() => ({
          accessToken: null,
          refreshToken: null,
          user: null
        })),
      markHydrated: () =>
        set(() => ({
          isHydrated: true
        }))
    }),
    {
      name: "flashdecks-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      }
    }
  )
);

