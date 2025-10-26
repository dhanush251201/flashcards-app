import { useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dayjs } from "@/lib/dayjs";
import { CalendarIcon, FireIcon, PlayCircleIcon } from "@heroicons/react/24/outline";

import { DeckCard } from "@/components/decks/DeckCard";
import { apiClient } from "@/lib/apiClient";
import type { DeckSummary, DueReviewCard, DeckDetail } from "@/types/api";

const activityHeatmap = Array.from({ length: 30 }, (_, index) => {
  const date = dayjs().subtract(index, "day");
  return {
    date: date.format("YYYY-MM-DD"),
    count: Math.floor(Math.random() * 20)
  };
});

export const DashboardPage = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [isCreateDeckOpen, setCreateDeckOpen] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [newDeckDescription, setNewDeckDescription] = useState("");
  const [newDeckTags, setNewDeckTags] = useState<string>("");

  const viewFilter = searchParams.get("view");

  const { data: decks = [] } = useQuery({
    queryKey: ["decks", viewFilter],
    queryFn: async () => {
      const { data } = await apiClient.get<DeckSummary[]>("/decks");
      return data;
    }
  });

  const { data: dueCards = [] } = useQuery({
    queryKey: ["due-review"],
    queryFn: async () => {
      const { data } = await apiClient.get<DueReviewCard[]>("/study/reviews/due");
      return data;
    }
  });

  const createDeckMutation = useMutation({
    mutationFn: async () => {
      const tagNames = newDeckTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      const { data } = await apiClient.post<DeckDetail>("/decks", {
        title: newDeckTitle,
        description: newDeckDescription,
        tag_names: tagNames
      });
      return data;
    },
    onSuccess: () => {
      setCreateDeckOpen(false);
      setNewDeckTitle("");
      setNewDeckDescription("");
      setNewDeckTags("");
      queryClient.invalidateQueries({ queryKey: ["decks"] });
    }
  });

  const quickActions = useMemo(
    () => [
      {
        title: "Start adaptive review",
        description: "Review all cards due today across decks",
        icon: PlayCircleIcon,
        action: () => {
          const dueDeck = decks.find((deck) => deck.due_count > 0);
          if (!dueDeck) {
            alert("No decks have cards due right now. Create or study a deck first.");
            return;
          }
          apiClient
            .post("/study/sessions", {
              deck_id: dueDeck.id,
              mode: "review",
              config: { endless: false }
            })
            .then((response) => {
              const sessionId = response.data.id;
              window.location.href = `/app/study/${sessionId}`;
            })
            .catch(() => {
              alert("Unable to start a review session right now. Please try again later.");
            });
        }
      },
      {
        title: "Add a custom deck",
        description: "Import cards or create them from scratch",
        icon: CalendarIcon,
        action: () => setCreateDeckOpen(true)
      }
    ],
    [decks]
  );

  const filteredDecks = useMemo(() => {
    if (viewFilter === "due") {
      return decks.filter((deck) => deck.due_count > 0);
    }
    return decks;
  }, [decks, viewFilter]);

  const totalDue = dueCards.length;

  return (
    <div className="space-y-10 pb-10">
      <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-3xl bg-white p-8 shadow-card shadow-brand-500/15 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-600 dark:text-brand-300">Due today</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{totalDue} cards</h2>
              <p className="mt-3 max-w-md text-sm text-slate-500 dark:text-slate-400">
                Keep the streak alive! Review due cards to maintain high retention and unlock smart recommendations.
              </p>
            </div>
            <FireIcon className="size-14 rounded-3xl bg-brand-500/10 p-3 text-brand-500" />
          </div>
          <div className="mt-8 grid gap-3 text-sm">
            {dueCards.slice(0, 5).map((item) => (
              <div
                key={`${item.deck_id}-${item.card_id}`}
                className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3 text-slate-600 dark:bg-slate-800/70 dark:text-slate-300"
              >
                <span>
                  Card #{item.card_id} • Deck {item.deck_id}
                </span>
                <span className="text-xs font-semibold text-brand-600 dark:text-brand-300">
                  Due {dayjs(item.due_at).fromNow()}
                </span>
              </div>
            ))}
            {dueCards.length === 0 && <p className="text-sm text-slate-400">Nothing due today — exploration time!</p>}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-card shadow-brand-500/15 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Quick actions</h3>
          <div className="mt-4 space-y-3">
            {quickActions.map((action) => (
              <button
                key={action.title}
                type="button"
                onClick={action.action}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm text-slate-600 transition hover:border-brand-500 hover:bg-brand-500/5 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-400 dark:hover:text-brand-300"
              >
                <div className="flex items-center gap-3">
                  <action.icon className="size-5 text-brand-500" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">{action.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{action.description}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-500">Start</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr,1fr]">
        <div className="rounded-3xl bg-white p-6 shadow-card shadow-brand-500/15 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent activity</h3>
            <span className="text-xs uppercase text-slate-400">Last 30 days</span>
          </div>
          <div className="mt-6 grid grid-cols-10 gap-2">
            {activityHeatmap.map((entry) => (
              <div key={entry.date} className="rounded-lg bg-slate-100 p-2 text-center dark:bg-slate-800/60">
                <div className="text-xs font-semibold text-brand-500">{entry.count}</div>
                <div className="mt-2 h-16 overflow-hidden rounded-full bg-brand-500/10">
                  <div
                    className="h-full w-full rounded-full bg-gradient-to-b from-brand-400 to-sky-400"
                    style={{ transform: `translateY(${100 - Math.min(entry.count * 5, 100)}%)` }}
                  />
                </div>
                <p className="mt-2 text-[10px] text-slate-400">
                  {dayjs(entry.date).format("MMM D")}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-card shadow-brand-500/15 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {viewFilter === "due" ? "Due decks" : "Recommended decks"}
          </h3>
          <div className="mt-4 grid gap-4">
            {filteredDecks.slice(0, 3).map((deck) => (
              <DeckCard key={deck.id} deck={deck} />
            ))}
            {filteredDecks.length === 0 && <p className="text-sm text-slate-400">No decks to show yet.</p>}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">All decks</h2>
          <span className="text-sm text-slate-500">{filteredDecks.length} decks</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDecks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
          {filteredDecks.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No decks yet. Create your first deck to start studying.
            </div>
          )}
        </div>
      </section>

      {isCreateDeckOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Create a new deck</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Give your deck a name and optional tags. You can add cards after it is created.
            </p>

            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!newDeckTitle.trim()) {
                  return;
                }
                createDeckMutation.mutate();
              }}
            >
              <div>
                <label htmlFor="deck-title" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Deck title
                </label>
                <input
                  id="deck-title"
                  value={newDeckTitle}
                  onChange={(event) => setNewDeckTitle(event.target.value)}
                  placeholder="e.g. Organic Chemistry Basics"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label htmlFor="deck-description" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Description (optional)
                </label>
                <textarea
                  id="deck-description"
                  value={newDeckDescription}
                  onChange={(event) => setNewDeckDescription(event.target.value)}
                  rows={3}
                  placeholder="Briefly describe what this deck covers"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label htmlFor="deck-tags" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Tags (comma separated)
                </label>
                <input
                  id="deck-tags"
                  value={newDeckTags}
                  onChange={(event) => setNewDeckTags(event.target.value)}
                  placeholder="biology, exam prep"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              {createDeckMutation.isError ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                  Unable to create the deck right now. Please check your inputs and try again.
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!createDeckMutation.isPending) {
                      setCreateDeckOpen(false);
                    }
                  }}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={createDeckMutation.isPending}
                >
                  {createDeckMutation.isPending ? "Creating..." : "Create deck"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};
