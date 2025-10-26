import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { AcademicCapIcon, ClockIcon, SparklesIcon } from "@heroicons/react/24/outline";

import { Flashcard } from "@/components/cards/Flashcard";
import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/store/authStore";
import type { Card as CardModel, DeckDetail, StudySession } from "@/types/api";

const studyModes = [
  { label: "Review", value: "review" as const, description: "Adaptive scheduling with grading (1-5)" },
  { label: "Practice", value: "practice" as const, description: "Random order, endless flow" },
  { label: "Exam", value: "exam" as const, description: "Timed mode with scoring" }
];

const cardTypeOptions: { label: string; value: CardModel["type"] }[] = [
  { label: "Basic", value: "basic" },
  { label: "Multiple choice", value: "multiple_choice" },
  { label: "Short answer", value: "short_answer" },
  { label: "Cloze", value: "cloze" }
];

const buildCardPayload = (form: {
  type: CardModel["type"];
  prompt: string;
  answer: string;
  explanation: string;
  options: string;
}) => {
  const base = {
    type: form.type,
    prompt: form.prompt.trim(),
    answer: form.answer.trim(),
    explanation: form.explanation.trim() ? form.explanation.trim() : null
  };

  if (form.type === "multiple_choice") {
    const options = form.options
      .split(/\r?\n/)
      .map((option) => option.trim())
      .filter(Boolean);
    return { ...base, options };
  }

  return { ...base, options: null };
};

export const DeckDetailPage = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [isCardModalOpen, setCardModalOpen] = useState(false);
  const [cardFormError, setCardFormError] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<CardModel | null>(null);
  const [cardForm, setCardForm] = useState({
    type: "basic" as CardModel["type"],
    prompt: "",
    answer: "",
    explanation: "",
    options: ""
  });

  const deckQuery = useQuery({
    queryKey: ["deck", deckId],
    queryFn: async () => {
      const { data } = await apiClient.get<DeckDetail>(`/decks/${deckId}`);
      return data;
    },
    enabled: Boolean(deckId)
  });

  const startSession = useMutation({
    mutationFn: async (mode: "review" | "practice" | "exam") => {
      const { data } = await apiClient.post<StudySession>("/study/sessions", {
        deck_id: Number(deckId),
        mode,
        config: mode === "exam" ? { time_limit_seconds: 600 } : { endless: mode === "practice" }
      });
      return data;
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["due-review"] });
      navigate(`/app/study/${session.id}`);
    }
  });

  const deck = deckQuery.data;

  const closeCardModal = () => {
    setCardModalOpen(false);
    setCardFormError(null);
    setEditingCard(null);
    setCardForm({ type: "basic", prompt: "", answer: "", explanation: "", options: "" });
  };

  const createCardMutation = useMutation({
    mutationFn: async () => {
      if (!deckId) return null;
      const payload = buildCardPayload(cardForm);
      const { data } = await apiClient.post(`/decks/${deckId}/cards`, payload);
      return data;
    },
    onSuccess: () => {
      closeCardModal();
      queryClient.invalidateQueries({ queryKey: ["deck", deckId] });
    },
    onError: () => {
      setCardFormError("Unable to create the card right now. Please check the details and try again.");
    }
  });

  const updateCardMutation = useMutation({
    mutationFn: async (cardId: number) => {
      const payload = buildCardPayload(cardForm);
      const { data } = await apiClient.put(`/cards/${cardId}`, payload);
      return data;
    },
    onSuccess: () => {
      closeCardModal();
      queryClient.invalidateQueries({ queryKey: ["deck", deckId] });
    },
    onError: () => {
      setCardFormError("Unable to update the card right now. Please try again later.");
    }
  });

  const deleteCardMutation = useMutation({
    mutationFn: async (cardId: number) => {
      await apiClient.delete(`/cards/${cardId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deck", deckId] });
    }
  });

  const handleCardSubmit = () => {
    if (!cardForm.prompt.trim() || !cardForm.answer.trim()) {
      setCardFormError("Prompt and answer are required.");
      return;
    }

    setCardFormError(null);
    if (editingCard) {
      updateCardMutation.mutate(editingCard.id);
    } else {
      createCardMutation.mutate();
    }
  };

  const openCreateCardModal = () => {
    setEditingCard(null);
    setCardForm({ type: "basic", prompt: "", answer: "", explanation: "", options: "" });
    setCardFormError(null);
    setCardModalOpen(true);
  };

  const openEditCardModal = (card: CardModel) => {
    setEditingCard(card);
    setCardForm({
      type: card.type,
      prompt: card.prompt,
      answer: card.answer,
      explanation: card.explanation ?? "",
      options: Array.isArray(card.options) ? card.options.join("\n") : ""
    });
    setCardFormError(null);
    setCardModalOpen(true);
  };

  const cardStats = useMemo(() => {
    if (!deck) return { total: 0, types: {} as Record<string, number> };
    const stats: Record<string, number> = {};
    deck.cards.forEach((card) => {
      stats[card.type] = (stats[card.type] ?? 0) + 1;
    });
    return { total: deck.cards.length, types: stats };
  }, [deck]);

  if (deckQuery.isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-4 border-slate-300 border-t-brand-500 dark:border-slate-700 dark:border-t-brand-300" />
      </div>
    );
  }

  if (!deck) {
    return <p className="text-sm text-slate-500">Deck not found.</p>;
  }

  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-white p-8 shadow-card shadow-brand-500/15 dark:bg-slate-900">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-300">
              Deck overview
            </span>
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">{deck.title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-300">{deck.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {deck.tags.map((tag) => (
                <span key={tag.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  #{tag.name}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-400">
              Created {new Date(deck.created_at).toLocaleDateString()} • Last updated {new Date(deck.updated_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-col gap-4 rounded-3xl bg-slate-100/80 p-6 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            <div className="flex items-center justify-between">
              <span>Total cards</span>
              <span className="text-lg font-semibold text-brand-600 dark:text-brand-300">{cardStats.total}</span>
            </div>
            {Object.entries(cardStats.types).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                <span>{type.replace("_", " ")}</span>
                <span className="font-semibold text-slate-600 dark:text-slate-200">{count}</span>
              </div>
            ))}
            <div className="mt-2 rounded-2xl bg-white/70 p-4 text-xs text-slate-500 shadow-sm dark:bg-slate-900/80 dark:text-slate-300">
              <p className="font-semibold text-slate-700 dark:text-white">Owner</p>
              <p>{deck.owner_user_id ? (deck.owner_user_id === user?.id ? "You" : `User #${deck.owner_user_id}`) : "Flash-Decks"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {studyModes.map((mode) => (
          <button
            key={mode.value}
            type="button"
            onClick={() => startSession.mutate(mode.value)}
            className="flex h-full flex-col justify-between rounded-3xl bg-white p-6 text-left shadow-card shadow-brand-500/15 transition hover:-translate-y-1 hover:shadow-brand-500/25 dark:bg-slate-900"
            disabled={startSession.isPending}
          >
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-300">
                {mode.label} mode
              </span>
              <p className="text-sm text-slate-500 dark:text-slate-300">{mode.description}</p>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold text-brand-600 dark:text-brand-300">
              {startSession.isPending ? "Preparing..." : "Start session"}
              <AcademicCapIcon className="size-5" />
            </div>
          </button>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Cards</h2>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-3 py-1 dark:bg-slate-800/50">
              <ClockIcon className="size-4" /> Estimated {Math.ceil(cardStats.total * 0.35)} min
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-3 py-1 dark:bg-slate-800/50">
              <SparklesIcon className="size-4" /> Tap cards to flip
            </span>
            <button
              type="button"
              onClick={openCreateCardModal}
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-brand-500/20 transition hover:bg-brand-600"
            >
              + Add card
            </button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {deck.cards.map((card) => (
            <div key={card.id} className="rounded-3xl bg-white p-4 shadow-card shadow-brand-500/10 dark:bg-slate-900">
              <Flashcard card={card} />
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => openEditCardModal(card)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-500 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteCardMutation.mutate(card.id)}
                  className="rounded-full border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300"
                  disabled={deleteCardMutation.isPending}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {deck.cards.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No cards yet. Use “Add card” to start building this deck.
            </div>
          )}
        </div>
      </section>

      {isCardModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {editingCard ? "Edit card" : "Add a new card"}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Define the prompt and answer. Switch the type for multiple choice or cloze cards when needed.
            </p>

            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                handleCardSubmit();
              }}
            >
              <div>
                <label htmlFor="card-type" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Card type
                </label>
                <select
                  id="card-type"
                  value={cardForm.type}
                  onChange={(event) => setCardForm((prev) => ({ ...prev, type: event.target.value as CardModel["type"] }))}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {cardTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="card-prompt" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Prompt
                </label>
                <textarea
                  id="card-prompt"
                  value={cardForm.prompt}
                  onChange={(event) => setCardForm((prev) => ({ ...prev, prompt: event.target.value }))}
                  rows={3}
                  required
                  placeholder="What is the definition of homeostasis?"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label htmlFor="card-answer" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Answer
                </label>
                <textarea
                  id="card-answer"
                  value={cardForm.answer}
                  onChange={(event) => setCardForm((prev) => ({ ...prev, answer: event.target.value }))}
                  rows={3}
                  required
                  placeholder="The body's ability to maintain a stable internal environment."
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label htmlFor="card-explanation" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Explanation (optional)
                </label>
                <textarea
                  id="card-explanation"
                  value={cardForm.explanation}
                  onChange={(event) => setCardForm((prev) => ({ ...prev, explanation: event.target.value }))}
                  rows={2}
                  placeholder="Useful context to remember the answer"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              {cardForm.type === "multiple_choice" ? (
                <div>
                  <label htmlFor="card-options" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Options (one per line)
                  </label>
                  <textarea
                    id="card-options"
                    value={cardForm.options}
                    onChange={(event) => setCardForm((prev) => ({ ...prev, options: event.target.value }))}
                    rows={3}
                    placeholder={"Option A\nOption B\nOption C"}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              ) : null}

              {cardFormError ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
                  {cardFormError}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!createCardMutation.isPending && !updateCardMutation.isPending) {
                      closeCardModal();
                    }
                  }}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={createCardMutation.isPending || updateCardMutation.isPending}
                >
                  {createCardMutation.isPending || updateCardMutation.isPending
                    ? "Saving..."
                    : editingCard
                      ? "Save changes"
                      : "Create card"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};
