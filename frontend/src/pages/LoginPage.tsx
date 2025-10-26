import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { ThemeToggle } from "@/components/navigation/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";

type LoginForm = {
  email: string;
  password: string;
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginStatus, user, loginError } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginForm>({
    defaultValues: {
      email: "",
      password: ""
    }
  });

  useEffect(() => {
    if (user) {
      const redirectPath = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? "/app/dashboard";
      navigate(redirectPath, { replace: true });
    }
  }, [user, navigate, location.state]);

  const onSubmit = async (data: LoginForm) => {
    await login(data);
  };

  const loginErrorMessage = loginError
    ? ((loginError.response?.data as { detail?: string })?.detail ??
        "Unable to sign in. Please check your credentials and try again.")
    : null;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr,1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-sky-400 p-12 text-white lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent)]" />
        <header className="relative z-10 flex items-center gap-3 text-lg font-semibold">
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/20">FD</span>
          Flash-Decks
        </header>
        <div className="relative z-10 space-y-6">
          <p className="text-2xl font-semibold leading-relaxed">
            “Flash-Decks keeps my medical revision on track. The dashboards and reminders make it impossible to forget!”
          </p>
          <p className="text-sm font-medium text-brand-50/80">— Priya Patel, Med Student</p>
        </div>
        <footer className="relative z-10 text-xs text-brand-50/80">
          Adaptive spaced repetition, immersive practice, and exam simulations in one workspace.
        </footer>
      </div>

      <div className="flex flex-col bg-slate-50 px-6 pb-10 pt-8 dark:bg-slate-950 sm:px-12">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold text-slate-700 dark:text-slate-200">
            Flash-Decks
          </Link>
          <ThemeToggle />
        </div>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="rounded-3xl bg-white p-8 shadow-card shadow-brand-500/10 dark:bg-slate-900 dark:shadow-brand-500/5">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Log in to continue your learning flow.</p>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
              <div>
                <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  {...register("email", { required: "Email is required" })}
                />
                {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  {...register("password", { required: "Password is required" })}
                />
                {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password.message}</p>}
              </div>

              {loginErrorMessage ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                  {loginErrorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={loginStatus === "pending"}
              >
                {loginStatus === "pending" ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No account?{" "}
              <Link to="/signup" className="font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-300">
                Join now
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};
