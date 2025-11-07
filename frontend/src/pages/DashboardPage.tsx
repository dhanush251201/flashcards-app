import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dayjs } from "@/lib/dayjs";
import { BookmarkIcon, CalendarIcon, ChartBarIcon, FireIcon, PlayCircleIcon, PlusIcon, RectangleStackIcon } from "@heroicons/react/24/outline";

import { DeckCard } from "@/components/decks/DeckCard";
import { apiClient } from "@/lib/apiClient";
import type { DeckSummary, DueReviewCard, DeckDetail } from "@/types/api";

interface ActivityData {
  date: string;
  count: number;
}

export const DashboardPage = () => {
  const navigate = useNavigate();
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

  const { data: activityData = [] } = useQuery({
    queryKey: ["activity"],
    queryFn: async () => {
      const { data } = await apiClient.get<ActivityData[]>("/study/activity?days=7");
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

  const filteredDecks = useMemo(() => {
    if (viewFilter === "due") {
      return decks.filter((deck) => deck.due_count > 0);
    }
    if (viewFilter === "pinned") {
      // Filter pinned decks when backend support is added
      return decks.filter((deck) => (deck as any).is_pinned);
    }
    return decks;
  }, [decks, viewFilter]);

  const totalDue = dueCards.length;
  const totalDecks = decks.length;
  const totalCards = decks.reduce((sum, deck) => sum + deck.card_count, 0);

  // Dashboard view - Overview with stats and quick actions
  if (!viewFilter) {
    return (
      <>
        <div className="grid gap-6 pb-10 lg:grid-cols-[1fr,300px]">
          <div className="space-y-6">
          {/* Hero Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 p-6 text-white shadow-lg shadow-brand-500/30">
              <FireIcon className="size-8 opacity-80" />
              <p className="mt-4 text-3xl font-bold">{totalDue}</p>
              <p className="mt-1 text-sm opacity-90">Cards due today</p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-slate-900">
              <RectangleStackIcon className="size-8 text-slate-400" />
              <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">{totalDecks}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Active decks</p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-slate-900">
              <ChartBarIcon className="size-8 text-slate-400" />
              <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">{totalCards}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Total cards</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl bg-white p-6 shadow-card dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Quick start</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  const dueDeck = decks.find((deck) => deck.due_count > 0);
                  if (!dueDeck) {
                    alert("No decks have cards due right now. Create or study a deck first.");
                    return;
                  }
                  apiClient
                    .post("/study/sessions", { deck_id: dueDeck.id, mode: "review", config: { endless: false } })
                    .then((response) => {
                      window.location.href = `/app/study/${response.data.id}`;
                    })
                    .catch(() => {
                      alert("Unable to start a review session right now. Please try again later.");
                    });
                }}
                className="flex items-center gap-3 rounded-xl border-2 border-brand-200 bg-brand-50 p-4 text-left transition hover:border-brand-400 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:hover:border-brand-500/50"
              >
                <PlayCircleIcon className="size-8 text-brand-600 dark:text-brand-400" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Start Review</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Study due cards</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setCreateDeckOpen(true)}
                className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
              >
                <PlusIcon className="size-8 text-slate-600 dark:text-slate-400" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">New Deck</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Create flashcards</p>
                </div>
              </button>
            </div>
          </div>

          {/* Recommended Decks */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Recommended for you</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {decks.slice(0, 4).map((deck) => (
                <DeckCard key={deck.id} deck={deck} />
              ))}
              {decks.length === 0 && (
                <div className="col-span-2 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No decks yet. Create your first deck to start studying.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Recent Activity */}
        <aside className="space-y-6">
          <div className="rounded-2xl bg-white p-5 shadow-card dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Activity</h3>
              <span className="text-xs text-slate-400">7 days</span>
            </div>
            <div className="space-y-2">
              {activityData.map((entry) => (
                <div key={entry.date} className="flex items-center gap-3">
                  <div className="w-12 text-xs text-slate-500">
                    {dayjs(entry.date).format("ddd")}
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                      style={{ width: `${Math.min(entry.count * 5, 100)}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-xs font-semibold text-brand-600 dark:text-brand-400">
                    {entry.count}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Due */}
          {dueCards.length > 0 && (
            <div className="rounded-2xl bg-white p-5 shadow-card dark:bg-slate-900">
              <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Coming up</h3>
              <div className="space-y-2">
                {dueCards.slice(0, 3).map((item) => (
                  <div
                    key={`${item.deck_id}-${item.card_id}`}
                    className="rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/60"
                  >
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      Deck {item.deck_id}
                    </p>
                    <p className="mt-1 text-[11px] text-brand-600 dark:text-brand-400">
                      {dayjs(item.due_at).fromNow()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
        </div>
        <CreateDeckModal
          isOpen={isCreateDeckOpen}
          onClose={() => setCreateDeckOpen(false)}
          newDeckTitle={newDeckTitle}
          setNewDeckTitle={setNewDeckTitle}
          newDeckDescription={newDeckDescription}
          setNewDeckDescription={setNewDeckDescription}
          newDeckTags={newDeckTags}
          setNewDeckTags={setNewDeckTags}
          createDeckMutation={createDeckMutation}
        />
      </>
    );
  }

  // All Decks view - Full grid layout
  if (viewFilter === "all") {
    return (
      <>
        <div className="space-y-6 pb-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">All Decks</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Browse and manage your {totalDecks} deck{totalDecks !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateDeckOpen(true)}
            className="flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600"
          >
            <PlusIcon className="size-4" />
            New Deck
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} />
          ))}
          {decks.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No decks yet. Create your first deck to start studying.
            </div>
          )}
        </div>
        </div>
        <CreateDeckModal
          isOpen={isCreateDeckOpen}
          onClose={() => setCreateDeckOpen(false)}
          newDeckTitle={newDeckTitle}
          setNewDeckTitle={setNewDeckTitle}
          newDeckDescription={newDeckDescription}
          setNewDeckDescription={setNewDeckDescription}
          newDeckTags={newDeckTags}
          setNewDeckTags={setNewDeckTags}
          createDeckMutation={createDeckMutation}
        />
      </>
    );
  }

  // Due view - Priority focused layout
  if (viewFilter === "due") {
    return (
      <>
        <div className="space-y-6 pb-10">
        <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 p-8 text-white shadow-xl shadow-rose-500/30">
          <div className="flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                <FireIcon className="size-4" />
                Needs attention
              </div>
              <h1 className="mt-4 text-3xl font-bold">{totalDue} cards due</h1>
              <p className="mt-2 text-sm opacity-90">
                {filteredDecks.length} deck{filteredDecks.length !== 1 ? "s" : ""} waiting for review
              </p>
            </div>
            {filteredDecks.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const dueDeck = filteredDecks[0];
                  apiClient
                    .post("/study/sessions", { deck_id: dueDeck.id, mode: "review", config: { endless: false } })
                    .then((response) => {
                      window.location.href = `/app/study/${response.data.id}`;
                    });
                }}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-rose-600 shadow-lg transition hover:bg-rose-50"
              >
                Start Now
              </button>
            )}
          </div>
        </div>

        {filteredDecks.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDecks.map((deck) => (
              <DeckCard key={deck.id} deck={deck} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
            <FireIcon className="mx-auto size-12 text-slate-300 dark:text-slate-600" />
            <p className="mt-4 font-medium text-slate-900 dark:text-white">All caught up!</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              No cards due right now. Great work!
            </p>
          </div>
        )}
        </div>
        <CreateDeckModal
          isOpen={isCreateDeckOpen}
          onClose={() => setCreateDeckOpen(false)}
          newDeckTitle={newDeckTitle}
          setNewDeckTitle={setNewDeckTitle}
          newDeckDescription={newDeckDescription}
          setNewDeckDescription={setNewDeckDescription}
          newDeckTags={newDeckTags}
          setNewDeckTags={setNewDeckTags}
          createDeckMutation={createDeckMutation}
        />
      </>
    );
  }

  // Pinned view - Favorites style layout
  if (viewFilter === "pinned") {
    return (
      <>
        <div className="space-y-6 pb-10">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/10">
            <BookmarkIcon className="size-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pinned Decks</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Your favorite decks for quick access
            </p>
          </div>
        </div>

        {filteredDecks.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDecks.map((deck) => (
              <DeckCard key={deck.id} deck={deck} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
            <BookmarkIcon className="mx-auto size-12 text-slate-300 dark:text-slate-600" />
            <p className="mt-4 font-medium text-slate-900 dark:text-white">No pinned decks yet</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Pin your favorite decks to access them quickly
            </p>
          </div>
        )}
        </div>
        <CreateDeckModal
          isOpen={isCreateDeckOpen}
          onClose={() => setCreateDeckOpen(false)}
          newDeckTitle={newDeckTitle}
          setNewDeckTitle={setNewDeckTitle}
          newDeckDescription={newDeckDescription}
          setNewDeckDescription={setNewDeckDescription}
          newDeckTags={newDeckTags}
          setNewDeckTags={setNewDeckTags}
          createDeckMutation={createDeckMutation}
        />
      </>
    );
  }

  return null;
};

// Create Deck Modal Component (shared across all views)
const CreateDeckModal = ({
  isOpen,
  onClose,
  newDeckTitle,
  setNewDeckTitle,
  newDeckDescription,
  setNewDeckDescription,
  newDeckTags,
  setNewDeckTags,
  createDeckMutation
}: any) => {
  if (!isOpen) return null;

  return (
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
                  onClose();
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
  );
};
