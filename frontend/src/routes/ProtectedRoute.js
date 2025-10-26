import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
export const ProtectedRoute = () => {
    const { user, isHydrated, isLoadingUser } = useAuth();
    const location = useLocation();
    if (!isHydrated || isLoadingUser) {
        return (_jsx("div", { className: "flex h-screen items-center justify-center", children: _jsx("div", { className: "size-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500 dark:border-slate-700 dark:border-t-brand-400" }) }));
    }
    if (!user) {
        return _jsx(Navigate, { to: "/login", state: { from: location }, replace: true });
    }
    return _jsx(Outlet, {});
};
