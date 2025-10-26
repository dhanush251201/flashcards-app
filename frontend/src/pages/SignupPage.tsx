import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { ThemeToggle } from "@/components/navigation/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";

type SignupForm = {
  full_name: string;
  email: string;
  password: string;
};

export const SignupPage = () => {
  const navigate = useNavigate();
  const { signup, signupStatus, user, signupError } = useAuth();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<SignupForm>({
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

  const onSubmit = async (data: SignupForm) => {
    await signup(data);
  };

  const passwordValue = watch("password");
  const isStrongPassword = passwordValue.length >= 8;
  const signupErrorMessage = signupError
    ? ((signupError.response?.data as { detail?: string })?.detail ??
        "We couldn't create the account. Please try again or use a different email.")
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <header className="flex items-center justify-between px-6 py-6 sm:px-12">
        <Link to="/" className="text-lg font-semibold text-slate-700 dark:text-slate-200">
          Flash-Decks
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 pb-16 sm:px-12 lg:flex-row">
        <section className="flex flex-1 flex-col justify-center">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Create your account</h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Start with curated decks, or build your own. Your first week is on us — no credit card required.
          </p>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div>
              <label htmlFor="full_name" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Full name
              </label>
              <input
                id="full_name"
                type="text"
                placeholder="Alex Morgan"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                {...register("full_name", { required: "Name is required" })}
              />
              {errors.full_name && <p className="mt-1 text-xs text-rose-500">{errors.full_name.message}</p>}
            </div>

            <div>
              <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
                placeholder="At least 8 characters"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 8, message: "Use at least 8 characters" }
                })}
              />
              <p className={`mt-1 text-xs ${isStrongPassword ? "text-emerald-500" : "text-slate-400"}`}>
                {isStrongPassword ? "Strong password" : "Make sure it includes numbers & letters"}
              </p>
              {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password.message}</p>}
            </div>

            {signupErrorMessage ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                {signupErrorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={signupStatus === "pending"}
            >
              {signupStatus === "pending" ? "Creating account..." : "Create account"}
            </button>
          </form>
        </section>

        <aside className="flex flex-1 flex-col justify-center rounded-3xl bg-white/70 p-8 shadow-card shadow-brand-500/10 dark:bg-slate-900/80">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your new learning HQ</h2>
          <ul className="mt-6 space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <li>• Daily review plan built from SM-2 scheduling.</li>
            <li>• Smart practice sessions with instant feedback.</li>
            <li>• Progress dashboards, streak tracking, and heatmaps.</li>
            <li>• Collaborate on shared decks with your study group.</li>
          </ul>
          <p className="mt-8 text-xs text-slate-400 dark:text-slate-500">
            By signing up you agree to our terms of service and privacy policy. We’ll never sell your data.
          </p>
        </aside>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
        Already using Flash-Decks?{" "}
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-300">
          Log in here
        </Link>
      </footer>
    </div>
  );
};
