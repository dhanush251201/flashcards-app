/**
 * Component to display flagged cards section in deck detail page
 */

import { useQuery } from "@tanstack/react-query";
import { FlagIcon } from "@heroicons/react/24/solid";
import { flaggedCardsApi } from "@/lib/flaggedCardsApi";
import { Flashcard } from "@/components/cards/Flashcard";
import { FlagButton } from "@/components/cards/FlagButton";
import type { Card } from "@/types/api";

interface FlaggedCardsSectionProps {
  deckId: number;
}

export const FlaggedCardsSection = ({ deckId }: FlaggedCardsSectionProps) => {
  const { data: flaggedCards, isLoading } = useQuery({
    queryKey: ["flaggedCards", deckId],
    queryFn: () => flaggedCardsApi.getFlaggedCardsForDeck(deckId)
  });

  if (isLoading) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-card dark:bg-slate-900">
        <div className="flex items-center gap-3 mb-6">
          <FlagIcon className="h-6 w-6 text-yellow-500" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Flagged Questions</h2>
        </div>
        <div className="flex justify-center py-8">
          <div className="size-8 animate-spin rounded-full border-4 border-slate-300 border-t-brand-500 dark:border-slate-700 dark:border-t-brand-300" />
        </div>
      </div>
    );
  }

  if (!flaggedCards || flaggedCards.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-8 shadow-card dark:bg-slate-900">
        <div className="flex items-center gap-3 mb-6">
          <FlagIcon className="h-6 w-6 text-yellow-500" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Flagged Questions</h2>
        </div>
        <div className="text-center py-8">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <FlagIcon className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No flagged questions yet. Flag questions during study sessions to review them later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white p-8 shadow-card dark:bg-slate-900">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FlagIcon className="h-6 w-6 text-yellow-500" />
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Flagged Questions</h2>
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            {flaggedCards.length} {flaggedCards.length === 1 ? "card" : "cards"}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {flaggedCards.map((card: Card) => (
          <div
            key={card.id}
            className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/50"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                    {card.type === "basic" && "Basic"}
                    {card.type === "multiple_choice" && "Multiple Choice"}
                    {card.type === "short_answer" && "Short Answer"}
                    {card.type === "cloze" && "Cloze"}
                  </span>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {card.prompt}
                  </div>
                  {card.type === "multiple_choice" && card.options && (
                    <div className="mt-2 space-y-1">
                      {card.options.map((option, idx) => (
                        <div
                          key={idx}
                          className={`text-xs px-2 py-1 rounded ${
                            option === card.answer
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {option}
                        </div>
                      ))}
                    </div>
                  )}
                  {card.type !== "multiple_choice" && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                      <span className="font-semibold">Answer:</span> {card.answer}
                    </div>
                  )}
                  {card.explanation && (
                    <div className="text-xs text-slate-500 dark:text-slate-500 mt-2 italic">
                      {card.explanation}
                    </div>
                  )}
                </div>
              </div>
              <FlagButton
                cardId={card.id}
                deckId={deckId}
                isFlagged={true}
                size="sm"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
