import { useState } from "react";
import { Link } from "react-router-dom";
import { Bars3Icon, BellIcon } from "@heroicons/react/24/outline";

import { ThemeToggle } from "@/components/navigation/ThemeToggle";
import { SidebarNav } from "@/components/navigation/SidebarNav";
import { useAuth } from "@/hooks/useAuth";

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-100/80 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-50">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200 bg-white/90 px-6 py-8 shadow-xl shadow-brand-500/5 backdrop-blur-lg transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900/90 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Link to="/app/dashboard" className="text-lg font-semibold text-slate-900 dark:text-white">
            Flash-Decks
          </Link>
          <button
            className="rounded-full border border-slate-200 p-1 text-slate-500 transition hover:text-brand-600 dark:border-slate-700 dark:text-slate-300 lg:hidden"
            onClick={() => setMobileOpen(false)}
            type="button"
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>
        <div className="mt-8">
          <SidebarNav />
        </div>
        <div className="mt-12 space-y-3 rounded-3xl bg-slate-100 p-4 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
          <p className="font-semibold text-slate-700 dark:text-white">Quick tip</p>
          <p className="leading-relaxed">
            Press <span className="rounded bg-white px-1.5 py-0.5 text-xs shadow-sm dark:bg-slate-900">Space</span> to flip cards and
            <span className="rounded bg-white px-1.5 py-0.5 text-xs shadow-sm dark:bg-slate-900">1-5</span> to grade.
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen w-full flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 px-4 py-4 sm:px-6 lg:px-12 backdrop-blur-lg dark:border-slate-800/80 dark:bg-slate-950/70">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                className="flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-brand-500 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 lg:hidden"
                type="button"
                onClick={() => setMobileOpen((prev) => !prev)}
                aria-label="Open navigation"
              >
                <Bars3Icon className="size-5" />
              </button>
              <div className="hidden text-sm text-slate-500 dark:text-slate-400 lg:block">
                <p className="font-semibold text-slate-800 dark:text-white">Welcome back{user?.full_name ? `, ${user.full_name}` : ""}</p>
                <span>Stay consistent and your streak will thrive.</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex">
                <span className="text-xs uppercase tracking-wider text-slate-400">Streak</span>
                <span className="ml-2 text-base font-semibold text-brand-600 dark:text-brand-300">42 🔥</span>
              </div>
              <button className="relative flex size-10 items-center justify-center rounded-full bg-white text-slate-500 shadow-card transition hover:text-brand-600 dark:bg-slate-900 dark:text-slate-300">
                <BellIcon className="size-5" />
                <span className="absolute -top-1 -right-1 inline-flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">
                  3
                </span>
              </button>
              <ThemeToggle />
              <div className="flex items-center gap-3 rounded-full bg-white px-3 py-2 text-sm shadow-card dark:bg-slate-900">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">{user?.full_name ?? user?.email}</p>
                  <button
                    type="button"
                    onClick={() => {
                      logout().catch(() => {
                        // Silently ignore logout errors for UX; session will clear on next login attempt.
                      });
                    }}
                    className="text-xs font-medium text-brand-600 hover:text-brand-500 dark:text-brand-300"
                  >
                    Log out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 bg-slate-100/60 px-4 py-8 sm:px-6 lg:px-12 dark:bg-slate-950">
          <div className="flex w-full flex-col space-y-10">{children}</div>
        </main>
      </div>
    </div>
  );
};
