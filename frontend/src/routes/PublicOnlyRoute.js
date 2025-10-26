import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
export const PublicOnlyRoute = () => {
    const { user, isHydrated } = useAuthStore((state) => ({
        user: state.user,
        isHydrated: state.isHydrated
    }));
    if (!isHydrated) {
        return (_jsx("div", { className: "flex h-screen items-center justify-center", children: _jsx("div", { className: "size-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500 dark:border-slate-700 dark:border-t-brand-300" }) }));
    }
    if (user) {
        return _jsx(Navigate, { to: "/app/dashboard", replace: true });
    }
    return _jsx(Outlet, {});
};
