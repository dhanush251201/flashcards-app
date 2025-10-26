import { create } from "zustand";
import { persist } from "zustand/middleware";
export const useAuthStore = create()(persist((set) => ({
    accessToken: null,
    refreshToken: null,
    user: null,
    isHydrated: false,
    setTokens: (access, refresh) => set(() => ({
        accessToken: access,
        refreshToken: refresh
    })),
    setUser: (user) => set(() => ({
        user
    })),
    clear: () => set(() => ({
        accessToken: null,
        refreshToken: null,
        user: null
    })),
    markHydrated: () => set(() => ({
        isHydrated: true
    }))
}), {
    name: "flashdecks-auth",
    partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user
    }),
    onRehydrateStorage: () => (state) => {
        state?.markHydrated();
    }
}));
