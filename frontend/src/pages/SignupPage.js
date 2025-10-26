import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/navigation/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
export const SignupPage = () => {
    const navigate = useNavigate();
    const { signup, signupStatus, user, signupError } = useAuth();
    const { register, handleSubmit, watch, formState: { errors } } = useForm({
        defaultValues: {
            full_name: "",
            email: "",
            password: ""
        }
    });
    useEffect(() => {
        if (user) {
            navigate("/app/dashboard", { replace: true });
        }
    }, [user, navigate]);
    const onSubmit = async (data) => {
        await signup(data);
    };
    const passwordValue = watch("password");
    const isStrongPassword = passwordValue.length >= 8;
    const signupErrorMessage = signupError
        ? (signupError.response?.data?.detail ??
            "We couldn't create the account. Please try again or use a different email.")
        : null;
    return (_jsxs("div", { className: "flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950", children: [_jsxs("header", { className: "flex items-center justify-between px-6 py-6 sm:px-12", children: [_jsx(Link, { to: "/", className: "text-lg font-semibold text-slate-700 dark:text-slate-200", children: "Flash-Decks" }), _jsx(ThemeToggle, {})] }), _jsxs("main", { className: "mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 pb-16 sm:px-12 lg:flex-row", children: [_jsxs("section", { className: "flex flex-1 flex-col justify-center", children: [_jsx("h1", { className: "text-3xl font-semibold text-slate-900 dark:text-white", children: "Create your account" }), _jsx("p", { className: "mt-3 text-sm text-slate-500 dark:text-slate-400", children: "Start with curated decks, or build your own. Your first week is on us \u2014 no credit card required." }), _jsxs("form", { className: "mt-8 space-y-6", onSubmit: handleSubmit(onSubmit), noValidate: true, children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "full_name", className: "text-sm font-medium text-slate-700 dark:text-slate-200", children: "Full name" }), _jsx("input", { id: "full_name", type: "text", placeholder: "Alex Morgan", className: "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100", ...register("full_name", { required: "Name is required" }) }), errors.full_name && _jsx("p", { className: "mt-1 text-xs text-rose-500", children: errors.full_name.message })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "text-sm font-medium text-slate-700 dark:text-slate-200", children: "Email" }), _jsx("input", { id: "email", type: "email", placeholder: "you@example.com", className: "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100", ...register("email", { required: "Email is required" }) }), errors.email && _jsx("p", { className: "mt-1 text-xs text-rose-500", children: errors.email.message })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "text-sm font-medium text-slate-700 dark:text-slate-200", children: "Password" }), _jsx("input", { id: "password", type: "password", placeholder: "At least 8 characters", className: "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100", ...register("password", {
                                                    required: "Password is required",
                                                    minLength: { value: 8, message: "Use at least 8 characters" }
                                                }) }), _jsx("p", { className: `mt-1 text-xs ${isStrongPassword ? "text-emerald-500" : "text-slate-400"}`, children: isStrongPassword ? "Strong password" : "Make sure it includes numbers & letters" }), errors.password && _jsx("p", { className: "mt-1 text-xs text-rose-500", children: errors.password.message })] }), signupErrorMessage ? (_jsx("p", { className: "rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300", children: signupErrorMessage })) : null, _jsx("button", { type: "submit", className: "w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-70", disabled: signupStatus === "pending", children: signupStatus === "pending" ? "Creating account..." : "Create account" })] })] }), _jsxs("aside", { className: "flex flex-1 flex-col justify-center rounded-3xl bg-white/70 p-8 shadow-card shadow-brand-500/10 dark:bg-slate-900/80", children: [_jsx("h2", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: "Your new learning HQ" }), _jsxs("ul", { className: "mt-6 space-y-4 text-sm text-slate-600 dark:text-slate-300", children: [_jsx("li", { children: "\u2022 Daily review plan built from SM-2 scheduling." }), _jsx("li", { children: "\u2022 Smart practice sessions with instant feedback." }), _jsx("li", { children: "\u2022 Progress dashboards, streak tracking, and heatmaps." }), _jsx("li", { children: "\u2022 Collaborate on shared decks with your study group." })] }), _jsx("p", { className: "mt-8 text-xs text-slate-400 dark:text-slate-500", children: "By signing up you agree to our terms of service and privacy policy. We\u2019ll never sell your data." })] })] }), _jsxs("footer", { className: "px-6 py-6 text-center text-xs text-slate-400 dark:text-slate-500", children: ["Already using Flash-Decks?", " ", _jsx(Link, { to: "/login", className: "font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-300", children: "Log in here" })] })] }));
};
