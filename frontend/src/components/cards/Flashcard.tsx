import { useState } from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";

import type { Card } from "@/types/api";

type FlashcardProps = {
  card: Card;
  flipped?: boolean;
  onToggle?: () => void;
};

export const Flashcard = ({ card, flipped, onToggle }: FlashcardProps) => {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const isControlled = typeof flipped === "boolean";
  const isFlipped = isControlled ? flipped : internalFlipped;

  return (
    <button
      type="button"
      onClick={() => {
        if (isControlled) {
          onToggle?.();
        } else {
          setInternalFlipped((prev) => !prev);
        }
      }}
      className="group relative h-56 w-full overflow-hidden rounded-3xl bg-gradient-to-br from-white to-slate-50 p-[2px] text-left transition-transform hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:from-slate-900 dark:to-slate-950"
    >
      <div className="glass-panel flex h-full w-full flex-col justify-between rounded-[26px] p-6 text-slate-700 transition-colors duration-300 dark:text-slate-200">
        {!isFlipped ? (
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-300">
              Prompt
            </span>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {card.type === "cloze"
                ? card.prompt.split(/(\[BLANK\])/gi).map((part, i) =>
                    part.match(/\[BLANK\]/i)
                      ? <span key={i} className="inline-block mx-1 px-4 py-0.5 bg-brand-100 border-b-2 border-brand-400 dark:bg-brand-900/30 dark:border-brand-500">____</span>
                      : <span key={i}>{part}</span>
                  )
                : card.prompt
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
              Answer
            </span>
            <p className="text-lg font-medium text-slate-900 dark:text-white">{card.answer}</p>
            {card.explanation && <p className="text-sm text-slate-500 dark:text-slate-300">{card.explanation}</p>}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-300">
            <SparklesIcon className="size-4" /> Tap to flip
          </span>
          <span className="text-[11px] uppercase tracking-wide">{card.type}</span>
        </div>
      </div>
    </button>
  );
};
