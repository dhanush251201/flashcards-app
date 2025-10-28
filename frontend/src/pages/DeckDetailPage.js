import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { AcademicCapIcon, ClockIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { Flashcard } from "@/components/cards/Flashcard";
import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "@/store/authStore";
const studyModes = [
    { label: "Review", value: "review", description: "Adaptive scheduling with grading (1-5)" },
    { label: "Practice", value: "practice", description: "Random order, endless flow" },
    { label: "Exam", value: "exam", description: "Timed mode with scoring" }
];
const cardTypeOptions = [
    { label: "Basic", value: "basic" },
    { label: "Multiple choice", value: "multiple_choice" },
    { label: "Short answer", value: "short_answer" },
    { label: "Cloze", value: "cloze" }
];
const buildCardPayload = (form) => {
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
        return { ...base, options, cloze_data: null };
    }
    if (form.type === "short_answer") {
        // For short answer, options field contains acceptable answers (one per line)
        const acceptableAnswers = form.options
            .split(/\r?\n/)
            .map((option) => option.trim())
            .filter(Boolean);
        return { ...base, options: acceptableAnswers.length > 0 ? acceptableAnswers : null, cloze_data: null };
    }
    if (form.type === "cloze") {
        // Parse cloze answers - format: one answer per line, or multiple acceptable answers separated by |
        const blankAnswers = form.clozeAnswers
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
        const blanks = blankAnswers.map((answerLine) => {
            const multipleAnswers = answerLine.split("|").map((a) => a.trim()).filter(Boolean);
            return {
                answer: multipleAnswers.length > 1 ? multipleAnswers : multipleAnswers[0] || ""
            };
        });
        return {
            ...base,
            options: null,
            cloze_data: { blanks }
        };
    }
    return { ...base, options: null, cloze_data: null };
};
export const DeckDetailPage = () => {
    const { deckId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const user = useAuthStore((state) => state.user);
    const [isCardModalOpen, setCardModalOpen] = useState(false);
    const [cardFormError, setCardFormError] = useState(null);
    const [editingCard, setEditingCard] = useState(null);
    const [cardForm, setCardForm] = useState({
        type: "basic",
        prompt: "",
        answer: "",
        explanation: "",
        options: "",
        clozeAnswers: ""
    });
    const deckQuery = useQuery({
        queryKey: ["deck", deckId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/decks/${deckId}`);
            return data;
        },
        enabled: Boolean(deckId)
    });
    const startSession = useMutation({
        mutationFn: async (mode) => {
            const { data } = await apiClient.post("/study/sessions", {
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
        setCardForm({ type: "basic", prompt: "", answer: "", explanation: "", options: "", clozeAnswers: "" });
    };
    const createCardMutation = useMutation({
        mutationFn: async () => {
            if (!deckId)
                return null;
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
        mutationFn: async (cardId) => {
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
        mutationFn: async (cardId) => {
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
        // Validate cloze cards
        if (cardForm.type === "cloze") {
            const blankCount = (cardForm.prompt.match(/\[BLANK\]/gi) || []).length;
            const answerLines = cardForm.clozeAnswers.split(/\r?\n/).filter((line) => line.trim()).length;
            if (blankCount === 0) {
                setCardFormError("Cloze cards must have at least one [BLANK] in the prompt.");
                return;
            }
            if (!cardForm.clozeAnswers.trim()) {
                setCardFormError("Please provide answers for all blanks.");
                return;
            }
            if (blankCount !== answerLines) {
                setCardFormError(`Mismatch: Found ${blankCount} blank(s) but ${answerLines} answer(s). Please provide one answer per line for each blank.`);
                return;
            }
        }
        setCardFormError(null);
        if (editingCard) {
            updateCardMutation.mutate(editingCard.id);
        }
        else {
            createCardMutation.mutate();
        }
    };
    const openCreateCardModal = () => {
        setEditingCard(null);
        setCardForm({ type: "basic", prompt: "", answer: "", explanation: "", options: "", clozeAnswers: "" });
        setCardFormError(null);
        setCardModalOpen(true);
    };
    const openEditCardModal = (card) => {
        setEditingCard(card);
        // For cloze cards, extract answers from cloze_data
        let clozeAnswers = "";
        if (card.type === "cloze" && card.cloze_data?.blanks) {
            clozeAnswers = card.cloze_data.blanks
                .map((blank) => {
                if (Array.isArray(blank.answer)) {
                    return blank.answer.join(" | ");
                }
                return blank.answer;
            })
                .join("\n");
        }
        setCardForm({
            type: card.type,
            prompt: card.prompt,
            answer: card.answer,
            explanation: card.explanation ?? "",
            options: Array.isArray(card.options) ? card.options.join("\n") : "",
            clozeAnswers
        });
        setCardFormError(null);
        setCardModalOpen(true);
    };
    const cardStats = useMemo(() => {
        if (!deck)
            return { total: 0, types: {} };
        const stats = {};
        deck.cards.forEach((card) => {
            stats[card.type] = (stats[card.type] ?? 0) + 1;
        });
        return { total: deck.cards.length, types: stats };
    }, [deck]);
    if (deckQuery.isLoading) {
        return (_jsx("div", { className: "flex h-72 items-center justify-center", children: _jsx("div", { className: "size-10 animate-spin rounded-full border-4 border-slate-300 border-t-brand-500 dark:border-slate-700 dark:border-t-brand-300" }) }));
    }
    if (!deck) {
        return _jsx("p", { className: "text-sm text-slate-500", children: "Deck not found." });
    }
    return (_jsxs("div", { className: "space-y-10", children: [_jsx("section", { className: "rounded-3xl bg-white p-8 shadow-card shadow-brand-500/15 dark:bg-slate-900", children: _jsxs("div", { className: "flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between", children: [_jsxs("div", { className: "space-y-4", children: [_jsx("span", { className: "inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-300", children: "Deck overview" }), _jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-semibold text-slate-900 dark:text-white", children: deck.title }), _jsx("p", { className: "mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-300", children: deck.description })] }), _jsx("div", { className: "flex flex-wrap gap-2", children: deck.tags.map((tag) => (_jsxs("span", { className: "rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300", children: ["#", tag.name] }, tag.id))) }), _jsxs("p", { className: "text-xs text-slate-400", children: ["Created ", new Date(deck.created_at).toLocaleDateString(), " \u2022 Last updated ", new Date(deck.updated_at).toLocaleDateString()] })] }), _jsxs("div", { className: "flex flex-col gap-4 rounded-3xl bg-slate-100/80 p-6 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { children: "Total cards" }), _jsx("span", { className: "text-lg font-semibold text-brand-600 dark:text-brand-300", children: cardStats.total })] }), Object.entries(cardStats.types).map(([type, count]) => (_jsxs("div", { className: "flex items-center justify-between text-xs uppercase tracking-wide text-slate-400", children: [_jsx("span", { children: type.replace("_", " ") }), _jsx("span", { className: "font-semibold text-slate-600 dark:text-slate-200", children: count })] }, type))), _jsxs("div", { className: "mt-2 rounded-2xl bg-white/70 p-4 text-xs text-slate-500 shadow-sm dark:bg-slate-900/80 dark:text-slate-300", children: [_jsx("p", { className: "font-semibold text-slate-700 dark:text-white", children: "Owner" }), _jsx("p", { children: deck.owner_user_id ? (deck.owner_user_id === user?.id ? "You" : `User #${deck.owner_user_id}`) : "Flash-Decks" })] })] })] }) }), _jsx("section", { className: "grid gap-6 lg:grid-cols-3", children: studyModes.map((mode) => (_jsxs("button", { type: "button", onClick: () => startSession.mutate(mode.value), className: "flex h-full flex-col justify-between rounded-3xl bg-white p-6 text-left shadow-card shadow-brand-500/15 transition hover:-translate-y-1 hover:shadow-brand-500/25 dark:bg-slate-900", disabled: startSession.isPending, children: [_jsxs("div", { className: "space-y-3", children: [_jsxs("span", { className: "inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-600 dark:text-brand-300", children: [mode.label, " mode"] }), _jsx("p", { className: "text-sm text-slate-500 dark:text-slate-300", children: mode.description })] }), _jsxs("div", { className: "flex items-center justify-between text-sm font-semibold text-brand-600 dark:text-brand-300", children: [startSession.isPending ? "Preparing..." : "Start session", _jsx(AcademicCapIcon, { className: "size-5" })] })] }, mode.value))) }), _jsxs("section", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-semibold text-slate-900 dark:text-white", children: "Cards" }), _jsxs("div", { className: "flex items-center gap-3 text-xs text-slate-500", children: [_jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-3 py-1 dark:bg-slate-800/50", children: [_jsx(ClockIcon, { className: "size-4" }), " Estimated ", Math.ceil(cardStats.total * 0.35), " min"] }), _jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-3 py-1 dark:bg-slate-800/50", children: [_jsx(SparklesIcon, { className: "size-4" }), " Tap cards to flip"] }), _jsx("button", { type: "button", onClick: openCreateCardModal, className: "inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-brand-500/20 transition hover:bg-brand-600", children: "+ Add card" })] })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-3", children: [deck.cards.map((card) => (_jsxs("div", { className: "rounded-3xl bg-white p-4 shadow-card shadow-brand-500/10 dark:bg-slate-900", children: [_jsx(Flashcard, { card: card }), _jsxs("div", { className: "mt-4 flex items-center justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => openEditCardModal(card), className: "rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-500 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300", children: "Edit" }), _jsx("button", { type: "button", onClick: () => deleteCardMutation.mutate(card.id), className: "rounded-full border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300", disabled: deleteCardMutation.isPending, children: "Delete" })] })] }, card.id))), deck.cards.length === 0 && (_jsx("div", { className: "rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400", children: "No cards yet. Use \u201CAdd card\u201D to start building this deck." }))] })] }), isCardModalOpen ? (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto", children: _jsxs("div", { className: "w-full max-w-xl my-8 rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900 max-h-[90vh] overflow-y-auto", children: [_jsx("h3", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: editingCard ? "Edit card" : "Add a new card" }), _jsx("p", { className: "mt-1 text-sm text-slate-500 dark:text-slate-400", children: "Define the prompt and answer. Switch the type for multiple choice or cloze cards when needed." }), _jsxs("form", { className: "mt-6 space-y-4", onSubmit: (event) => {
                                event.preventDefault();
                                handleCardSubmit();
                            }, children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "card-type", className: "text-sm font-medium text-slate-700 dark:text-slate-200", children: "Card type" }), _jsx("select", { id: "card-type", value: cardForm.type, onChange: (event) => setCardForm((prev) => ({ ...prev, type: event.target.value })), className: "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100", children: cardTypeOptions.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "card-prompt", className: "text-sm font-medium text-slate-700 dark:text-slate-200", children: "Prompt" }), _jsx("textarea", { id: "card-prompt", value: cardForm.prompt, onChange: (event) => setCardForm((prev) => ({ ...prev, prompt: event.target.value })), rows: 3, required: true, placeholder: "What is the definition of homeostasis?", className: "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "card-answer", className: "text-sm font-medium text-slate-700 dark:text-slate-200", children: "Answer" }), _jsx("textarea", { id: "card-answer", value: cardForm.answer, onChange: (event) => setCardForm((prev) => ({ ...prev, answer: event.target.value })), rows: 3, required: true, placeholder: "The body's ability to maintain a stable internal environment.", className: "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "card-explanation", className: "text-sm font-medium text-slate-700 dark:text-slate-200", children: "Explanation (optional)" }), _jsx("textarea", { id: "card-explanation", value: cardForm.explanation, onChange: (event) => setCardForm((prev) => ({ ...prev, explanation: event.target.value })), rows: 2, placeholder: "Useful context to remember the answer", className: "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" })] }), cardForm.type === "multiple_choice" && (_jsxs("div", { children: [_jsx("label", { htmlFor: "card-options", className: "text-sm font-medium text-slate-700 dark:text-slate-200", children: "Options (one per line)" }), _jsx("textarea", { id: "card-options", value: cardForm.options, onChange: (event) => setCardForm((prev) => ({ ...prev, options: event.target.value })), rows: 3, placeholder: "Option A\nOption B\nOption C", className: "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" })] })), cardForm.type === "short_answer" && (_jsxs("div", { children: [_jsx("label", { htmlFor: "card-acceptable-answers", className: "text-sm font-medium text-slate-700 dark:text-slate-200", children: "Acceptable Answers (one per line, optional)" }), _jsx("p", { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: "If left empty, only the main answer will be accepted. Add variations here for partial credit." }), _jsx("textarea", { id: "card-acceptable-answers", value: cardForm.options, onChange: (event) => setCardForm((prev) => ({ ...prev, options: event.target.value })), rows: 3, placeholder: "Paris\nParís\nCapital of France", className: "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" })] })), cardForm.type === "cloze" && (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10", children: [_jsx("p", { className: "text-xs font-semibold text-blue-700 dark:text-blue-300", children: "How to create cloze cards:" }), _jsxs("ul", { className: "mt-2 space-y-1 text-xs text-blue-600 dark:text-blue-300", children: [_jsx("li", { children: "\u2022 Use [BLANK] in your prompt where answers should go" }), _jsx("li", { children: "\u2022 Enter one answer per line below (in order of appearance)" }), _jsx("li", { children: "\u2022 For multiple acceptable answers, separate with | (e.g., \"Paris | Par\u00EDs\")" })] }), _jsx("p", { className: "mt-2 text-xs text-blue-600 dark:text-blue-300", children: "Example: \"The capital of France is [BLANK] and it's known for the [BLANK] Tower.\"" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "card-cloze-answers", className: "text-sm font-medium text-slate-700 dark:text-slate-200", children: "Answers for Blanks (one per line, in order)" }), _jsx("textarea", { id: "card-cloze-answers", value: cardForm.clozeAnswers, onChange: (event) => setCardForm((prev) => ({ ...prev, clozeAnswers: event.target.value })), rows: 4, required: cardForm.type === "cloze", placeholder: "Paris | París\nEiffel", className: "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" })] }), cardForm.prompt && (_jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900", children: [_jsx("p", { className: "text-xs font-semibold text-slate-600 dark:text-slate-400", children: "Preview:" }), _jsx("p", { className: "mt-2 text-sm text-slate-700 dark:text-slate-300", children: cardForm.prompt.split(/(\[BLANK\])/gi).map((part, i) => part.match(/\[BLANK\]/i) ? (_jsx("span", { className: "inline-block rounded bg-brand-100 px-2 py-0.5 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300", children: "_____" }, i)) : (_jsx("span", { children: part }, i))) })] }))] })), cardFormError ? (_jsx("p", { className: "rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300", children: cardFormError })) : null, _jsxs("div", { className: "flex items-center justify-end gap-3 pt-2", children: [_jsx("button", { type: "button", onClick: () => {
                                                if (!createCardMutation.isPending && !updateCardMutation.isPending) {
                                                    closeCardModal();
                                                }
                                            }, className: "rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-300", children: "Cancel" }), _jsx("button", { type: "submit", className: "rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70", disabled: createCardMutation.isPending || updateCardMutation.isPending, children: createCardMutation.isPending || updateCardMutation.isPending
                                                ? "Saving..."
                                                : editingCard
                                                    ? "Save changes"
                                                    : "Create card" })] })] })] }) })) : null] }));
};
