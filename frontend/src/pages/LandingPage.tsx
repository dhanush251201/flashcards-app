import { Link } from "react-router-dom";
import { ArrowRightIcon, BoltIcon, ChartBarIcon, ClockIcon } from "@heroicons/react/24/outline";

import { ThemeToggle } from "@/components/navigation/ThemeToggle";

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <header className="relative z-20">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/30">
              FD
            </span>
            <span className="tracking-tight text-slate-900 dark:text-slate-50">Flash-Decks</span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              to="/login"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-brand-500 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-300"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600"
            >
              Sign up
            </Link>
          </div>
        </nav>
      </header>

      <main className="isolate mx-auto flex max-w-6xl flex-col gap-24 px-6 pb-24 pt-10">
        <section className="grid gap-12 lg:grid-cols-[1.3fr,1fr] lg:items-center">
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-600 shadow-card shadow-brand-500/10 ring-1 ring-brand-500/20 dark:bg-slate-900/70 dark:text-brand-300">
              Spaced repetition done right
            </span>
            <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl dark:text-slate-50">
              Retain more. Study smarter. Fall in love with learning again.
            </h1>
            <p className="max-w-xl text-lg text-slate-600 dark:text-slate-300">
              Flash-Decks combines adaptive scheduling, handcrafted decks, and beautiful analytics to keep you on
              track. Master anything with guided reviews, practice drills, and exam simulations.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/signup"
                className="flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600"
              >
                Start learning free <ArrowRightIcon className="size-4" />
              </Link>
              <a
                href="#features"
                className="flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-300"
              >
                Explore the platform <ArrowRightIcon className="size-4" />
              </a>
            </div>
            <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {[
                { label: "Decks", value: "200+" },
                { label: "Active learners", value: "12k" },
                { label: "Avg. retention", value: "93%" },
                { label: "Daily cards reviewed", value: "65k" }
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-white/60 p-4 shadow-card shadow-brand-500/10 dark:bg-slate-900/60">
                  <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{stat.label}</dt>
                  <dd className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative flex">
            <div className="relative w-full overflow-hidden rounded-3xl bg-slate-900 text-white shadow-2xl shadow-brand-500/20">
              <div className="absolute -top-20 -left-16 size-40 rounded-full bg-brand-500/30 blur-3xl" aria-hidden />
              <div className="absolute -bottom-24 -right-10 size-48 rounded-full bg-sky-400/20 blur-3xl" aria-hidden />
              <div className="space-y-4 p-8">
                <div className="glass-panel flex items-center justify-between rounded-2xl px-4 py-3">
                  <div>
                    <p className="text-xs text-slate-300">Due today</p>
                    <p className="text-2xl font-bold text-white">32 cards</p>
                  </div>
                  <span className="rounded-full bg-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-200">
                    +12%
                  </span>
                </div>
                <div className="glass-panel rounded-2xl p-4">
                  <p className="text-sm text-slate-300">Daily streak</p>
                  <p className="text-3xl font-bold text-white">42 days</p>
                  <div className="mt-3 h-2 rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-gradient-to-r from-brand-400 to-sky-400" style={{ width: "78%" }} />
                  </div>
                </div>
                <div className="space-y-3 rounded-2xl bg-white/10 p-4">
                  {[
                    { deck: "Advanced Biology", progress: 68 },
                    { deck: "Spanish Essentials", progress: 84 },
                    { deck: "Algorithms", progress: 45 }
                  ].map((item) => (
                    <div key={item.deck} className="rounded-xl bg-white/5 p-3">
                      <div className="flex items-center justify-between text-sm font-medium text-white">
                        <span>{item.deck}</span>
                        <span>{item.progress}%</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-white/10">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-brand-400 to-sky-400"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="grid gap-8 lg:grid-cols-3">
          {[
            {
              icon: BoltIcon,
              title: "Adaptive reviews",
              body: "An SM-2 inspired scheduler keeps the right cards at your fingertips and powers personalized pacing."
            },
            {
              icon: ChartBarIcon,
              title: "Rich analytics",
              body: "Understand your streaks, strengths, and blind spots with dashboards designed to boost motivation."
            },
            {
              icon: ClockIcon,
              title: "Flexible study modes",
              body: "Switch between review, practice, and timed exam prep in seconds and sync across any device."
            }
          ].map((feature) => (
            <div
              key={feature.title}
              className="group rounded-3xl bg-white/80 p-6 shadow-card shadow-brand-500/10 transition hover:-translate-y-1 hover:shadow-brand-500/20 dark:bg-slate-900/70"
            >
              <feature.icon className="size-10 rounded-xl bg-brand-500/10 p-2 text-brand-500 transition group-hover:bg-brand-500 group-hover:text-white" />
              <h3 className="mt-6 text-xl font-semibold text-slate-900 dark:text-slate-50">{feature.title}</h3>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{feature.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-200/60 bg-white/60 py-12 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
          <p>&copy; {new Date().getFullYear()} Flash-Decks. Stay curious.</p>
          <div className="flex gap-4">
            <Link to="/login" className="hover:text-brand-600 dark:hover:text-brand-300">
              Log in
            </Link>
            <Link to="/signup" className="hover:text-brand-600 dark:hover:text-brand-300">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

