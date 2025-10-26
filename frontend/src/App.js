import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { PublicOnlyRoute } from "@/routes/PublicOnlyRoute";
import { DashboardPage } from "@/pages/DashboardPage";
import { DeckDetailPage } from "@/pages/DeckDetailPage";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { StudySessionPage } from "@/pages/StudySessionPage";
import { AppShell } from "@/components/layout/AppShell";
const App = () => {
    return (_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(LandingPage, {}) }), _jsxs(Route, { element: _jsx(PublicOnlyRoute, {}), children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/signup", element: _jsx(SignupPage, {}) })] }), _jsxs(Route, { path: "/app", element: _jsx(ProtectedRoute, {}), children: [_jsx(Route, { element: _jsx(AppShell, { children: _jsx(DashboardPage, {}) }), path: "dashboard" }), _jsx(Route, { element: _jsx(AppShell, { children: _jsx(DeckDetailPage, {}) }), path: "decks/:deckId" }), _jsx(Route, { element: _jsx(AppShell, { children: _jsx(StudySessionPage, {}) }), path: "study/:sessionId" }), _jsx(Route, { path: "", element: _jsx(Navigate, { to: "/app/dashboard", replace: true }) })] }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }));
};
export default App;
