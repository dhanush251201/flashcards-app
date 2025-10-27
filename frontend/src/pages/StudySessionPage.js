import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, ArrowRightIcon, PauseIcon, PlayIcon } from "@heroicons/react/24/outline";
import { Flashcard } from "@/components/cards/Flashcard";
import { apiClient } from "@/lib/apiClient";
const normalize = (value) => (value ?? "").trim().toLowerCase();
export const StudySessionPage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [cardIndex, setCardIndex] = useState(0);
    const [isAutoFlip, setIsAutoFlip] = useState(false);
    const [flipped, setFlipped] = useState(false);
    const [userAnswer, setUserAnswer] = useState(null);
    const sessionQuery = useQuery({
        queryKey: ["session", sessionId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/study/sessions/${sessionId}`);
            return data;
        },
        enabled: Boolean(sessionId)
    });
    const deckQuery = useQuery({
        queryKey: ["deck", sessionQuery.data?.deck_id],
        queryFn: async () => {
            const { data } = await apiClient.get(`/decks/${sessionQuery.data?.deck_id}`);
            return data;
        },
        enabled: Boolean(sessionQuery.data?.deck_id)
    });
    const answerMutation = useMutation({
        mutationFn: async ({ cardId, quality, userAnswer: submittedAnswer }) => {
            const { data } = await apiClient.post(`/study/sessions/${sessionId}/answer`, {
                card_id: cardId,
                quality,
                user_answer: submittedAnswer ?? null
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["due-review"] });
        }
    });
    const finishMutation = useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.post(`/study/sessions/${sessionId}/finish`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
            navigate("/app/dashboard");
        }
    });
    const cards = deckQuery.data?.cards ?? [];
    const currentCard = cards[cardIndex];
    const sessionMode = sessionQuery.data?.mode ?? "review";
    const isReviewMode = sessionMode === "review";
    const multipleChoiceOptions = useMemo(() => {
        if (!currentCard || currentCard.type !== "multiple_choice") {
            return [];
        }
        if (!Array.isArray(currentCard.options)) {
            return [];
        }
        return currentCard.options.filter((option) => Boolean(option && option.trim()));
    }, [currentCard]);
    const isMultipleChoice = multipleChoiceOptions.length > 0;
    const selectedIsCorrect = isMultipleChoice && userAnswer !== null && normalize(userAnswer) === normalize(currentCard?.answer);
    const readyForNext = isMultipleChoice ? userAnswer !== null : flipped;
    useEffect(() => {
        if (isAutoFlip) {
            setFlipped(true);
        }
    }, [cardIndex, isAutoFlip]);
    useEffect(() => {
        if (!isAutoFlip) {
            setFlipped(false);
        }
    }, [isAutoFlip]);
    useEffect(() => {
        setUserAnswer(null);
    }, [currentCard?.id]);
    useEffect(() => {
        if (isMultipleChoice && userAnswer) {
            setFlipped(true);
        }
    }, [isMultipleChoice, userAnswer]);
    const handleSelectOption = (option) => {
        if (answerMutation.isPending)
            return;
        setUserAnswer(option);
    };
    const deriveQuality = () => {
        if (!isReviewMode)
            return null;
        if (isMultipleChoice && userAnswer !== null) {
            return selectedIsCorrect ? 5 : 2;
        }
        return flipped ? 3 : 1;
    };
    const handleNext = async () => {
        if (!currentCard || answerMutation.isPending || !readyForNext)
            return;
        const quality = deriveQuality();
        await answerMutation.mutateAsync({
            cardId: currentCard.id,
            quality,
            userAnswer
        });
        setFlipped(false);
        setUserAnswer(null);
        if (cardIndex >= cards.length - 1) {
            await finishMutation.mutateAsync();
        }
        else {
            setCardIndex((prev) => Math.min(prev + 1, cards.length - 1));
        }
    };
    if (sessionQuery.isLoading || deckQuery.isLoading) {
        return (_jsx("div", { className: "flex h-72 items-center justify-center", children: _jsx("div", { className: "size-10 animate-spin rounded-full border-4 border-slate-300 border-t-brand-500 dark:border-slate-700 dark:border-t-brand-300" }) }));
    }
    if (!currentCard) {
        return (_jsxs("div", { className: "rounded-3xl bg-white p-10 text-center text-sm text-slate-500 shadow-card dark:bg-slate-900", children: [_jsx("p", { children: "No cards available in this deck yet." }), _jsxs("button", { type: "button", onClick: () => navigate(`/app/decks/${sessionQuery.data?.deck_id ?? ""}`), className: "mt-4 inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/30", children: ["Back to deck ", _jsx(ArrowLeftIcon, { className: "size-4" })] })] }));
    }
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("header", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-slate-400", children: "Study session" }), _jsx("h1", { className: "text-2xl font-semibold text-slate-900 dark:text-white", children: deckQuery.data?.title }), _jsxs("p", { className: "text-sm text-slate-500 dark:text-slate-300", children: ["Card ", cardIndex + 1, " of ", cards.length] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("button", { type: "button", onClick: () => setIsAutoFlip((prev) => !prev), className: `flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${isAutoFlip
                                    ? "border-brand-500 bg-brand-500/10 text-brand-600"
                                    : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900"}`, children: [isAutoFlip ? _jsx(PauseIcon, { className: "size-4" }) : _jsx(PlayIcon, { className: "size-4" }), " Auto flip"] }), _jsx("button", { type: "button", onClick: () => finishMutation.mutateAsync(), className: "rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-500/10 dark:border-rose-500/40 dark:text-rose-300", children: "End session" })] })] }), _jsx("div", { className: "rounded-3xl bg-white p-8 shadow-card shadow-brand-500/15 dark:bg-slate-900", children: _jsxs("div", { className: "mx-auto max-w-2xl space-y-6", children: [_jsx(Flashcard, { card: currentCard, flipped: flipped, onToggle: () => setFlipped((prev) => !prev) }), isMultipleChoice && (_jsxs("div", { className: "rounded-3xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500", children: "Choose an answer" }), _jsx("div", { className: "mt-3 grid gap-2", children: multipleChoiceOptions.map((option, index) => {
                                        const isSelected = userAnswer === option;
                                        return (_jsxs("button", { type: "button", onClick: () => handleSelectOption(option), className: `flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${isSelected
                                                ? "border-brand-400 bg-white text-brand-700 shadow-sm dark:border-brand-500/60 dark:bg-slate-900 dark:text-brand-200"
                                                : "border-transparent bg-white text-slate-600 hover:border-brand-200 hover:text-brand-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-500/40"}`, disabled: answerMutation.isPending, children: [_jsx("span", { children: option }), isSelected && _jsx(ArrowRightIcon, { className: "size-4 text-brand-500 dark:text-brand-200" })] }, `${option}-${index}`));
                                    }) }), userAnswer && (_jsx("div", { className: `mt-4 rounded-2xl px-4 py-3 text-sm ${selectedIsCorrect
                                        ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                                        : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"}`, children: selectedIsCorrect ? "Great job! You picked the correct answer." : _jsxs("span", { children: ["Correct answer: ", currentCard.answer] }) }))] })), _jsxs("div", { className: "flex items-center justify-between text-xs text-slate-400", children: [_jsx("button", { type: "button", onClick: () => setFlipped((prev) => !prev), className: "text-sm font-medium text-brand-600 hover:text-brand-500 dark:text-brand-300", children: flipped
                                        ? isMultipleChoice
                                            ? "Hide explanation"
                                            : "Hide answer"
                                        : isMultipleChoice
                                            ? "Show explanation"
                                            : "Reveal answer" }), _jsxs("div", { children: [cardIndex + 1, "/", cards.length] })] }), _jsxs("div", { className: "flex flex-col gap-3 rounded-3xl bg-slate-100/70 p-4 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between", children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400", children: "Progress" }), _jsx("div", { className: "flex items-center gap-3", children: _jsxs("button", { type: "button", onClick: handleNext, disabled: !readyForNext || answerMutation.isPending, className: "inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60", children: [cardIndex === cards.length - 1 ? "Finish session" : "Next card", _jsx(ArrowRightIcon, { className: "size-4" })] }) })] })] }) })] }));
};
