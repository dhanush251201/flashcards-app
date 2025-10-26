import { Link } from "react-router-dom";
import { ArrowRightIcon, ClockIcon } from "@heroicons/react/24/outline";

import type { DeckSummary } from "@/types/api";

export const DeckCard = ({ deck }: { deck: DeckSummary }) => {
  return (
    <Link
      to={`/app/decks/${deck.id}`}
      className="group flex h-full flex-col justify-between rounded-3xl bg-white p-6 shadow-card shadow-brand-500/10 transition hover:-translate-y-1 hover:shadow-brand-500/20 dark:bg-slate-900"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-400">
          <span>{deck.card_count} cards</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-brand-600 dark:text-brand-300">
            <ClockIcon className="size-4" /> {deck.due_count} due
          </span>
        </div>
        <h3 className="text-xl font-semibold text-slate-900 transition group-hover:text-brand-600 dark:text-slate-50 dark:group-hover:text-brand-300">
          {deck.title}
        </h3>
        <p className="text-sm text-slate-500 line-clamp-3 dark:text-slate-400">
          {deck.description ?? "Stay on track with fresh cards and adaptive scheduling."}
        </p>
        <div className="flex flex-wrap gap-2">
          {deck.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-600 dark:text-brand-300"
            >
              {tag.name}
            </span>
          ))}
          {deck.tags.length > 3 && <span className="text-xs text-slate-400">+{deck.tags.length - 3} more</span>}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between text-sm font-medium text-brand-600 dark:text-brand-300">
        View deck
        <ArrowRightIcon className="size-4 transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
};

