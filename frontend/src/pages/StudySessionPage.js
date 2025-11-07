import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, ArrowRightIcon, PauseIcon, PlayIcon } from "@heroicons/react/24/outline";
import { Flashcard } from "@/components/cards/Flashcard";
import { apiClient } from "@/lib/apiClient";
const normalize = (value) => (value ?? "").trim().toLowerCase();
// Fisher-Yates shuffle algorithm
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};
export const StudySessionPage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [cardIndex, setCardIndex] = useState(0);
    const [isAutoFlip, setIsAutoFlip] = useState(false);
    const [flipped, setFlipped] = useState(false);
    const [userAnswer, setUserAnswer] = useState(null);
    const [shortAnswerInput, setShortAnswerInput] = useState("");
    const [clozeAnswers, setClozeAnswers] = useState([]);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [shuffledCards, setShuffledCards] = useState([]);
    const [llmFeedback, setLlmFeedback] = useState(null);
    // Exam mode state
    const [examAnswers, setExamAnswers] = useState(new Map());
    const [examResults, setExamResults] = useState(new Map());
    const [isSubmittingExam, setIsSubmittingExam] = useState(false);
    const [showExamResults, setShowExamResults] = useState(false);
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
            console.log("=== Mutation starting ===");
            const { data } = await apiClient.post(`/study/sessions/${sessionId}/answer`, {
                card_id: cardId,
                quality,
                user_answer: submittedAnswer ?? null
            });
            console.log("=== Mutation received data ===", data);
            console.log("llm_feedback in response:", data.llm_feedback);
            return data;
        },
        onSuccess: (data) => {
            console.log("=== onSuccess called ===");
            console.log("data.llm_feedback:", data.llm_feedback);
            queryClient.invalidateQueries({ queryKey: ["due-review"] });
            // Store LLM feedback if available
            if (data.llm_feedback) {
                console.log("Setting llmFeedback state to:", data.llm_feedback);
                setLlmFeedback(data.llm_feedback);
            }
            else {
                console.log("No llm_feedback in response data");
                setLlmFeedback(null);
            }
        }
    });
    const statisticsMutation = useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.get(`/study/sessions/${sessionId}/statistics`);
            return data;
        },
        onSuccess: () => {
            setShowSummaryModal(true);
        }
    });
    const finishMutation = useMutation({
        mutationFn: async () => {
            const { data } = await apiClient.post(`/study/sessions/${sessionId}/finish`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
        }
    });
    const sessionMode = sessionQuery.data?.mode ?? "review";
    const isReviewMode = sessionMode === "review";
    const isPracticeMode = sessionMode === "practice";
    const isExamMode = sessionMode === "exam";
    const isEndless = sessionQuery.data?.config?.endless ?? false;
    // Get cards with defensive filtering for exam mode
    const cards = useMemo(() => {
        const baseCards = shuffledCards.length > 0 ? shuffledCards : deckQuery.data?.cards ?? [];
        // In exam mode, always filter out basic cards as a safety measure
        if (isExamMode) {
            const filtered = baseCards.filter(card => card.type === "multiple_choice" || card.type === "short_answer" || card.type === "cloze");
            console.log("=== Defensive filter applied ===");
            console.log("Base cards:", baseCards.length);
            console.log("Filtered cards:", filtered.length);
            console.log("Filtered types:", filtered.map(c => c.type));
            return filtered;
        }
        return baseCards;
    }, [shuffledCards, deckQuery.data?.cards, isExamMode]);
    const currentCard = cards[cardIndex];
    // Shuffle cards for practice mode on initial load
    useEffect(() => {
        if (isPracticeMode && deckQuery.data?.cards && shuffledCards.length === 0) {
            setShuffledCards(shuffleArray(deckQuery.data.cards));
        }
    }, [isPracticeMode, deckQuery.data?.cards, shuffledCards.length]);
    // Filter and shuffle cards for exam mode - only include MCQ, short answer, and cloze questions
    useEffect(() => {
        if (isExamMode && deckQuery.data?.cards && shuffledCards.length === 0) {
            console.log("=== Filtering cards for exam mode ===");
            console.log("Total cards in deck:", deckQuery.data.cards.length);
            console.log("Card types:", deckQuery.data.cards.map(c => ({ id: c.id, type: c.type })));
            const examEligibleCards = deckQuery.data.cards.filter(card => card.type === "multiple_choice" || card.type === "short_answer" || card.type === "cloze");
            console.log("Exam eligible cards:", examEligibleCards.length);
            console.log("Filtered card types:", examEligibleCards.map(c => ({ id: c.id, type: c.type })));
            if (examEligibleCards.length === 0) {
                console.warn("No exam-eligible questions found in this deck");
            }
            setShuffledCards(shuffleArray(examEligibleCards));
            console.log("=== Exam cards filtered and shuffled ===");
        }
    }, [isExamMode, deckQuery.data?.cards, shuffledCards.length]);
    const multipleChoiceOptions = useMemo(() => {
        if (!currentCard || currentCard.type !== "multiple_choice") {
            return [];
        }
        if (!Array.isArray(currentCard.options)) {
            return [];
        }
        return currentCard.options.filter((option) => Boolean(option && option.trim()));
    }, [currentCard]);
    const clozeText = useMemo(() => {
        if (!currentCard || currentCard.type !== "cloze")
            return null;
        return currentCard.prompt;
    }, [currentCard]);
    const clozeBlanksCount = useMemo(() => {
        if (!currentCard?.cloze_data?.blanks)
            return 0;
        return currentCard.cloze_data.blanks.length;
    }, [currentCard]);
    const isMultipleChoice = multipleChoiceOptions.length > 0;
    const isShortAnswer = currentCard?.type === "short_answer";
    const isCloze = currentCard?.type === "cloze";
    const selectedIsCorrect = isMultipleChoice && userAnswer !== null && normalize(userAnswer) === normalize(currentCard?.answer);
    const readyForNext = useMemo(() => {
        if (isMultipleChoice)
            return userAnswer !== null;
        if (isShortAnswer)
            return userAnswer !== null;
        if (isCloze)
            return userAnswer !== null && clozeAnswers.length === clozeBlanksCount;
        return flipped;
    }, [isMultipleChoice, isShortAnswer, isCloze, userAnswer, flipped, clozeAnswers.length, clozeBlanksCount]);
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
        setShortAnswerInput("");
        setLlmFeedback(null);
        // Initialize cloze answers array with empty strings for each blank
        if (currentCard?.type === "cloze" && currentCard.cloze_data?.blanks) {
            setClozeAnswers(new Array(currentCard.cloze_data.blanks.length).fill(""));
        }
        else {
            setClozeAnswers([]);
        }
    }, [currentCard?.id, currentCard?.type, currentCard?.cloze_data]);
    useEffect(() => {
        if ((isMultipleChoice || isShortAnswer || isCloze) && userAnswer) {
            setFlipped(true);
        }
    }, [isMultipleChoice, isShortAnswer, isCloze, userAnswer]);
    const handleSelectOption = async (option) => {
        if (answerMutation.isPending || !currentCard)
            return;
        setUserAnswer(option);
        // In Exam mode, just store the answer and move to next question
        if (isExamMode) {
            console.log("Exam mode - storing MC answer locally");
            setExamAnswers(prev => new Map(prev).set(currentCard.id, option));
            // Auto-advance to next question after short delay
            setTimeout(() => {
                handleNextExamQuestion();
            }, 500);
            return;
        }
        // In Practice mode, submit immediately for auto-grading
        // In Review mode, wait for user to click Next and provide quality rating
        if (!isReviewMode) {
            const quality = deriveQuality();
            await answerMutation.mutateAsync({
                cardId: currentCard.id,
                quality,
                userAnswer: option
            });
        }
    };
    const handleSubmitShortAnswer = async () => {
        console.log("=== handleSubmitShortAnswer called ===");
        console.log("isPending:", answerMutation.isPending);
        console.log("shortAnswerInput:", shortAnswerInput);
        console.log("currentCard:", currentCard?.id);
        console.log("isReviewMode:", isReviewMode);
        console.log("isExamMode:", isExamMode);
        if (answerMutation.isPending || !shortAnswerInput.trim() || !currentCard)
            return;
        const answer = shortAnswerInput.trim();
        // In Exam mode, just store the answer and move to next question
        if (isExamMode) {
            console.log("Exam mode - storing answer locally");
            setUserAnswer(answer);
            setExamAnswers(prev => new Map(prev).set(currentCard.id, answer));
            // Auto-advance to next question after short delay
            setTimeout(() => {
                handleNextExamQuestion();
            }, 500);
            return;
        }
        // In Practice mode, submit immediately for LLM evaluation
        // In Review mode, set answer and wait for user to click Next
        if (!isReviewMode) {
            console.log("Calling API to submit answer immediately");
            const quality = deriveQuality();
            // Set userAnswer BEFORE calling API so the input gets disabled and UI shows it's processing
            setUserAnswer(answer);
            await answerMutation.mutateAsync({
                cardId: currentCard.id,
                quality,
                userAnswer: answer
            });
            console.log("API call completed");
        }
        else {
            console.log("Review mode - skipping immediate submission");
            setUserAnswer(answer);
        }
    };
    const handleSubmitCloze = async () => {
        if (answerMutation.isPending || !currentCard)
            return;
        // Check if all blanks are filled
        if (clozeAnswers.some(a => !a || !a.trim())) {
            console.log("Some blanks not filled:", clozeAnswers);
            return;
        }
        const answersJson = JSON.stringify(clozeAnswers);
        console.log("Setting user answer:", answersJson);
        console.log("Current card cloze_data:", currentCard?.cloze_data);
        // In Exam mode, just store the answer and move to next question
        if (isExamMode) {
            console.log("Exam mode - storing cloze answer locally");
            setUserAnswer(answersJson);
            setExamAnswers(prev => new Map(prev).set(currentCard.id, answersJson));
            // Auto-advance to next question after short delay
            setTimeout(() => {
                handleNextExamQuestion();
            }, 500);
            return;
        }
        // In Practice mode, submit immediately for LLM evaluation
        // In Review mode, set answer and wait for user to click Next
        if (!isReviewMode) {
            const quality = deriveQuality();
            // Set userAnswer BEFORE calling API so inputs get disabled and UI shows it's processing
            setUserAnswer(answersJson);
            await answerMutation.mutateAsync({
                cardId: currentCard.id,
                quality,
                userAnswer: answersJson
            });
        }
        else {
            setUserAnswer(answersJson);
        }
    };
    const handleClozeInputChange = (index, value) => {
        const newAnswers = [...clozeAnswers];
        newAnswers[index] = value;
        setClozeAnswers(newAnswers);
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
        console.log("=== handleNext called ===");
        console.log("currentCard type:", currentCard?.type);
        console.log("isReviewMode:", isReviewMode);
        console.log("userAnswer:", userAnswer);
        if (!currentCard || answerMutation.isPending || !readyForNext)
            return;
        // Determine if we need to submit the answer now
        // Submit if:
        // 1. REVIEW mode: Always submit on next (user provides quality rating)
        // 2. BASIC cards in Practice/Exam: Submit on next (no auto-grading)
        // 3. MC/SHORT_ANSWER/CLOZE in Practice/Exam: Already submitted immediately, skip
        const shouldSubmitNow = isReviewMode ||
            currentCard.type === "basic";
        console.log("shouldSubmitNow:", shouldSubmitNow);
        if (shouldSubmitNow) {
            console.log("Submitting answer in handleNext");
            const quality = deriveQuality();
            await answerMutation.mutateAsync({
                cardId: currentCard.id,
                quality,
                userAnswer
            });
        }
        else {
            console.log("Skipping submission in handleNext (already submitted)");
        }
        setFlipped(false);
        setUserAnswer(null);
        setShortAnswerInput("");
        setClozeAnswers([]);
        setLlmFeedback(null);
        // For practice mode, loop cards infinitely
        if (isPracticeMode && isEndless) {
            if (cardIndex >= cards.length - 1) {
                // Reshuffle and restart
                setShuffledCards(shuffleArray(cards));
                setCardIndex(0);
            }
            else {
                setCardIndex((prev) => prev + 1);
            }
        }
        else {
            // For other modes, finish when reaching the end
            if (cardIndex >= cards.length - 1) {
                await finishMutation.mutateAsync();
                navigate("/app/dashboard");
            }
            else {
                setCardIndex((prev) => Math.min(prev + 1, cards.length - 1));
            }
        }
    };
    const handleNextExamQuestion = () => {
        // Clear current answer state
        setFlipped(false);
        setUserAnswer(null);
        setShortAnswerInput("");
        setClozeAnswers([]);
        setLlmFeedback(null);
        // Move to next question
        if (cardIndex < cards.length - 1) {
            setCardIndex((prev) => prev + 1);
        }
    };
    const handleSubmitExam = async () => {
        if (isSubmittingExam)
            return;
        console.log("=== Submitting exam ===");
        console.log("Total answers:", examAnswers.size);
        console.log("Total cards:", cards.length);
        setIsSubmittingExam(true);
        try {
            const results = new Map();
            // Submit all answers sequentially to ensure proper processing
            for (const card of cards) {
                const userAnswer = examAnswers.get(card.id);
                if (userAnswer !== undefined) {
                    console.log(`Submitting answer for card ${card.id}`);
                    const { data } = await apiClient.post(`/study/sessions/${sessionId}/answer`, {
                        card_id: card.id,
                        quality: null,
                        user_answer: userAnswer
                    });
                    // Store result with LLM feedback if available
                    results.set(card.id, {
                        ...data,
                        llm_feedback: data.llm_feedback
                    });
                }
            }
            console.log("All answers submitted, results:", results.size);
            setExamResults(results);
            setIsSubmittingExam(false);
            setShowExamResults(true);
            // Finish the session
            await finishMutation.mutateAsync();
        }
        catch (error) {
            console.error("Error submitting exam:", error);
            setIsSubmittingExam(false);
            alert("Error submitting exam. Please try again.");
        }
    };
    const handleEndSession = async () => {
        if (isPracticeMode) {
            // Fetch statistics first
            await statisticsMutation.mutateAsync();
            // Then finish the session
            await finishMutation.mutateAsync();
        }
        else if (isExamMode && examAnswers.size < cards.length) {
            // If exam mode and not all questions answered, confirm exit
            if (confirm("You haven't answered all questions. Are you sure you want to end the exam?")) {
                await finishMutation.mutateAsync();
                navigate("/app/dashboard");
            }
        }
        else {
            await finishMutation.mutateAsync();
            navigate("/app/dashboard");
        }
    };
    const handleCloseSummary = () => {
        setShowSummaryModal(false);
        navigate("/app/dashboard");
    };
    if (sessionQuery.isLoading || deckQuery.isLoading) {
        return (_jsx("div", { className: "flex h-72 items-center justify-center", children: _jsx("div", { className: "size-10 animate-spin rounded-full border-4 border-slate-300 border-t-brand-500 dark:border-slate-700 dark:border-t-brand-300" }) }));
    }
    if (!currentCard) {
        return (_jsxs("div", { className: "rounded-3xl bg-white p-10 text-center text-sm text-slate-500 shadow-card dark:bg-slate-900", children: [isExamMode ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20", children: _jsx("svg", { className: "size-8 text-amber-600 dark:text-amber-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" }) }) }), _jsx("p", { className: "text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2", children: "No Exam Questions Available" }), _jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400 mb-4", children: "This deck contains only basic flashcards. Exams require multiple choice, short answer, or cloze questions." })] })) : (_jsx("p", { children: "No cards available in this deck yet." })), _jsxs("button", { type: "button", onClick: () => navigate(`/app/decks/${sessionQuery.data?.deck_id ?? ""}`), className: "mt-4 inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/30", children: ["Back to deck ", _jsx(ArrowLeftIcon, { className: "size-4" })] })] }));
    }
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("header", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-slate-400", children: isExamMode ? "Exam Session" : isPracticeMode ? "Practice Session" : "Study Session" }), _jsx("h1", { className: "text-2xl font-semibold text-slate-900 dark:text-white", children: deckQuery.data?.title }), _jsxs("p", { className: "text-sm text-slate-500 dark:text-slate-300", children: [isExamMode ? "Question" : "Card", " ", cardIndex + 1, " of ", cards.length] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [!isExamMode && (_jsxs("button", { type: "button", onClick: () => setIsAutoFlip((prev) => !prev), className: `flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${isAutoFlip
                                    ? "border-brand-500 bg-brand-500/10 text-brand-600"
                                    : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900"}`, children: [isAutoFlip ? _jsx(PauseIcon, { className: "size-4" }) : _jsx(PlayIcon, { className: "size-4" }), " Auto flip"] })), _jsx("button", { type: "button", onClick: handleEndSession, disabled: statisticsMutation.isPending || finishMutation.isPending, className: "rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-500/10 dark:border-rose-500/40 dark:text-rose-300 disabled:opacity-50", children: statisticsMutation.isPending || finishMutation.isPending ? "Ending..." : "End session" })] })] }), _jsx("div", { className: "rounded-3xl bg-white p-8 shadow-card shadow-brand-500/15 dark:bg-slate-900", children: _jsxs("div", { className: "mx-auto max-w-2xl space-y-6", children: [!isCloze && (_jsx(Flashcard, { card: currentCard, flipped: flipped, onToggle: () => setFlipped((prev) => !prev) })), isMultipleChoice && (_jsxs("div", { className: "rounded-3xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500", children: "Choose an answer" }), _jsx("div", { className: "mt-3 grid gap-2", children: multipleChoiceOptions.map((option, index) => {
                                        const isSelected = userAnswer === option;
                                        return (_jsxs("button", { type: "button", onClick: () => handleSelectOption(option), className: `flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${isSelected
                                                ? "border-brand-400 bg-white text-brand-700 shadow-sm dark:border-brand-500/60 dark:bg-slate-900 dark:text-brand-200"
                                                : "border-transparent bg-white text-slate-600 hover:border-brand-200 hover:text-brand-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-500/40"}`, disabled: answerMutation.isPending, children: [_jsx("span", { children: option }), isSelected && _jsx(ArrowRightIcon, { className: "size-4 text-brand-500 dark:text-brand-200" })] }, `${option}-${index}`));
                                    }) }), userAnswer && !isExamMode && (_jsx("div", { className: `mt-4 rounded-2xl px-4 py-3 text-sm ${selectedIsCorrect
                                        ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                                        : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"}`, children: selectedIsCorrect ? "Great job! You picked the correct answer." : _jsxs("span", { children: ["Correct answer: ", currentCard.answer] }) })), userAnswer && isExamMode && (_jsx("div", { className: "mt-4 rounded-2xl bg-brand-50/50 px-4 py-3 text-sm dark:bg-brand-900/10", children: _jsxs("div", { className: "flex items-center gap-2 text-brand-600 dark:text-brand-400", children: [_jsx("svg", { className: "size-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" }) }), _jsx("span", { className: "font-medium", children: "Answer recorded! Moving to next question..." })] }) }))] })), isShortAnswer && (_jsxs("div", { className: "rounded-3xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500", children: "Type your answer" }), _jsxs("div", { className: "mt-3 space-y-3", children: [_jsx("input", { type: "text", value: shortAnswerInput, onChange: (e) => setShortAnswerInput(e.target.value), onKeyDown: (e) => {
                                                if (e.key === "Enter" && shortAnswerInput.trim()) {
                                                    handleSubmitShortAnswer();
                                                }
                                            }, placeholder: "Enter your answer...", disabled: userAnswer !== null || answerMutation.isPending, className: "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500" }), !userAnswer && (_jsx("button", { type: "button", onClick: handleSubmitShortAnswer, disabled: !shortAnswerInput.trim() || answerMutation.isPending, className: "inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60", children: "Submit Answer" }))] }), userAnswer && !isExamMode && (_jsx("div", { className: "mt-4 space-y-2", children: answerMutation.isPending && !isReviewMode ? (_jsx("div", { className: "rounded-2xl bg-brand-50/50 px-4 py-3 text-sm dark:bg-brand-900/10", children: _jsxs("div", { className: "flex items-center gap-2 text-brand-600 dark:text-brand-400", children: [_jsxs("svg", { className: "size-4 animate-spin", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] }), _jsx("span", { className: "font-medium", children: "Checking your answer with AI..." })] }) })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex items-center justify-between", children: _jsx("span", { className: `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${llmFeedback
                                                        ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                                                        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`, children: llmFeedback ? (_jsxs(_Fragment, { children: [_jsx("svg", { className: "size-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 10V3L4 14h7v7l9-11h-7z" }) }), "AI Generated"] })) : (_jsxs(_Fragment, { children: [_jsx("svg", { className: "size-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" }) }), "Exact Match"] })) }) }), _jsx("div", { className: `rounded-2xl px-4 py-3 text-sm ${llmFeedback
                                                    ? answerMutation.data?.is_correct
                                                        ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                                                        : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
                                                    : normalize(userAnswer) === normalize(currentCard.answer) ||
                                                        (currentCard.options && currentCard.options.some((opt) => normalize(opt) === normalize(userAnswer)))
                                                        ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                                                        : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"}`, children: llmFeedback ? (_jsxs("div", { children: [_jsxs("p", { className: "font-semibold", children: ["Your answer: ", userAnswer] }), _jsx("p", { className: "mt-2", children: llmFeedback })] })) : normalize(userAnswer) === normalize(currentCard.answer) ||
                                                    (currentCard.options && currentCard.options.some((opt) => normalize(opt) === normalize(userAnswer))) ? ("Great job! Your answer is correct.") : (_jsxs("div", { children: [_jsxs("p", { className: "font-semibold", children: ["Your answer: ", userAnswer] }), _jsxs("p", { className: "mt-1", children: ["Correct answer", currentCard.options && currentCard.options.length > 1 ? "s" : "", ":", " ", currentCard.options && currentCard.options.length > 0 ? currentCard.options.join(", ") : currentCard.answer] })] })) })] })) })), userAnswer && isExamMode && (_jsx("div", { className: "mt-4 rounded-2xl bg-brand-50/50 px-4 py-3 text-sm dark:bg-brand-900/10", children: _jsxs("div", { className: "flex items-center gap-2 text-brand-600 dark:text-brand-400", children: [_jsx("svg", { className: "size-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" }) }), _jsx("span", { className: "font-medium", children: "Answer recorded! Moving to next question..." })] }) }))] })), isCloze && clozeText && (_jsx("div", { className: "space-y-4", children: _jsxs("div", { className: "rounded-3xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6 dark:border-brand-500/30 dark:from-brand-900/20 dark:to-slate-900", children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400", children: "Fill in the blanks" }), _jsx("div", { className: "mt-3 text-base leading-relaxed text-slate-800 dark:text-slate-200", children: (() => {
                                            let blankCounter = 0;
                                            return clozeText.split(/(\[BLANK\])/gi).map((part, i) => {
                                                if (part.match(/\[BLANK\]/i)) {
                                                    const currentBlankIndex = blankCounter;
                                                    blankCounter++;
                                                    return (_jsx("input", { type: "text", value: clozeAnswers[currentBlankIndex] ?? "", onChange: (e) => handleClozeInputChange(currentBlankIndex, e.target.value), disabled: userAnswer !== null || answerMutation.isPending, className: "mx-1 inline-block w-32 rounded-lg border-2 border-brand-300 bg-white px-3 py-1.5 text-center text-sm font-medium text-slate-900 placeholder-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-500/40 dark:bg-slate-800 dark:text-white", placeholder: "?" }, i));
                                                }
                                                return _jsx("span", { children: part }, i);
                                            });
                                        })() }), !userAnswer && (_jsxs("div", { className: "mt-4 space-y-2", children: [_jsx("button", { type: "button", onClick: handleSubmitCloze, disabled: clozeAnswers.some((a) => !a || !a.trim()) || answerMutation.isPending, className: "inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60", children: "Submit Answer" }), _jsxs("p", { className: "text-xs text-slate-400", children: ["Filled: ", clozeAnswers.filter(a => a && a.trim()).length, " / ", clozeBlanksCount] })] })), userAnswer && !isExamMode ? (_jsx("div", { className: "mt-4 space-y-2", children: answerMutation.isPending && !isReviewMode ? (_jsx("div", { className: "rounded-2xl bg-brand-50/50 px-4 py-3 text-sm dark:bg-brand-900/10", children: _jsxs("div", { className: "flex items-center gap-2 text-brand-600 dark:text-brand-400", children: [_jsxs("svg", { className: "size-4 animate-spin", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] }), _jsx("span", { className: "font-medium", children: "Checking your answer with AI..." })] }) })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex items-center justify-between", children: _jsx("span", { className: `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${llmFeedback
                                                            ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                                                            : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`, children: llmFeedback ? (_jsxs(_Fragment, { children: [_jsx("svg", { className: "size-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 10V3L4 14h7v7l9-11h-7z" }) }), "AI Generated"] })) : (_jsxs(_Fragment, { children: [_jsx("svg", { className: "size-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" }) }), "Exact Match"] })) }) }), llmFeedback ? (_jsxs("div", { className: `rounded-2xl px-4 py-3 text-sm ${answerMutation.data?.is_correct
                                                        ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                                                        : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"}`, children: [_jsxs("p", { className: "font-semibold", children: ["Your answer: ", clozeAnswers.join(", ")] }), _jsx("p", { className: "mt-2", children: llmFeedback })] })) : currentCard.cloze_data && currentCard.cloze_data.blanks ? (currentCard.cloze_data.blanks.map((blank, idx) => {
                                                    const userAns = clozeAnswers[idx];
                                                    const correctAnswers = Array.isArray(blank.answer) ? blank.answer : [blank.answer];
                                                    const isCorrect = correctAnswers.some((ans) => normalize(ans) === normalize(userAns));
                                                    return (_jsx("div", { className: `rounded-2xl px-4 py-3 text-sm ${isCorrect
                                                            ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                                                            : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"}`, children: _jsxs("p", { children: [_jsxs("span", { className: "font-semibold", children: ["Blank ", idx + 1, ":"] }), " ", userAns, isCorrect ? " ✓" : ` ✗ (Correct: ${correctAnswers.join(", ")})`] }) }, idx));
                                                })) : (_jsx("p", { className: "text-sm text-rose-600", children: "Error: Missing cloze_data or blanks" }))] })) })) : null, userAnswer && isExamMode && (_jsx("div", { className: "mt-4 rounded-2xl bg-brand-50/50 px-4 py-3 text-sm dark:bg-brand-900/10", children: _jsxs("div", { className: "flex items-center gap-2 text-brand-600 dark:text-brand-400", children: [_jsx("svg", { className: "size-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" }) }), _jsx("span", { className: "font-medium", children: "Answer recorded! Moving to next question..." })] }) }))] }) })), !isExamMode && (_jsxs("div", { className: "flex items-center justify-between text-xs text-slate-400", children: [_jsx("button", { type: "button", onClick: () => setFlipped((prev) => !prev), className: "text-sm font-medium text-brand-600 hover:text-brand-500 dark:text-brand-300", children: flipped
                                        ? isMultipleChoice || isShortAnswer || isCloze
                                            ? "Hide explanation"
                                            : "Hide answer"
                                        : isMultipleChoice || isShortAnswer || isCloze
                                            ? "Show explanation"
                                            : "Reveal answer" }), _jsxs("div", { children: [cardIndex + 1, "/", cards.length] })] })), _jsxs("div", { className: "flex flex-col gap-3 rounded-3xl bg-slate-100/70 p-4 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400", children: "Progress" }), isExamMode && (_jsxs("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1", children: ["Answered: ", examAnswers.size, " / ", cards.length] }))] }), _jsx("div", { className: "flex items-center gap-3", children: isExamMode ? (_jsxs(_Fragment, { children: [cardIndex < cards.length - 1 && !userAnswer && (_jsxs("button", { type: "button", onClick: handleNextExamQuestion, className: "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700", children: ["Skip Question", _jsx(ArrowRightIcon, { className: "size-4" })] })), examAnswers.size === cards.length && (_jsxs("button", { type: "button", onClick: handleSubmitExam, disabled: isSubmittingExam, className: "inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60", children: [isSubmittingExam ? "Submitting..." : "Submit Exam", _jsx(ArrowRightIcon, { className: "size-4" })] }))] })) : (_jsxs("button", { type: "button", onClick: handleNext, disabled: !readyForNext || answerMutation.isPending, className: "inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60", children: [cardIndex === cards.length - 1 ? "Finish session" : "Next card", _jsx(ArrowRightIcon, { className: "size-4" })] })) })] })] }) }), showSummaryModal && statisticsMutation.data && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-md rounded-3xl bg-white p-8 shadow-xl dark:bg-slate-900", children: [_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-brand-500/10 dark:bg-brand-500/20", children: _jsx("span", { className: "text-3xl", children: "\uD83C\uDFAF" }) }), _jsx("h2", { className: "text-2xl font-bold text-slate-900 dark:text-white", children: "Session Complete!" }), _jsx("p", { className: "mt-2 text-sm text-slate-500 dark:text-slate-400", children: "Great work! Here's how you did:" })] }), _jsxs("div", { className: "mt-6 space-y-4", children: [_jsx("div", { className: "rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-900/20", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm font-medium text-emerald-900 dark:text-emerald-100", children: "Correct Answers" }), _jsx("span", { className: "text-2xl font-bold text-emerald-600 dark:text-emerald-400", children: statisticsMutation.data.correct_count })] }) }), _jsx("div", { className: "rounded-2xl bg-rose-50 p-4 dark:bg-rose-900/20", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm font-medium text-rose-900 dark:text-rose-100", children: "Incorrect Answers" }), _jsx("span", { className: "text-2xl font-bold text-rose-600 dark:text-rose-400", children: statisticsMutation.data.incorrect_count })] }) }), _jsx("div", { className: "rounded-2xl bg-slate-100 p-4 dark:bg-slate-800", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Total Questions" }), _jsx("span", { className: "text-2xl font-bold text-slate-900 dark:text-slate-100", children: statisticsMutation.data.total_responses })] }) }), statisticsMutation.data.total_responses > 0 && (_jsx("div", { className: "rounded-2xl border-2 border-brand-200 bg-brand-50/50 p-4 dark:border-brand-500/30 dark:bg-brand-900/10", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm font-medium text-brand-900 dark:text-brand-100", children: "Accuracy" }), _jsxs("span", { className: "text-2xl font-bold text-brand-600 dark:text-brand-400", children: [Math.round((statisticsMutation.data.correct_count / statisticsMutation.data.total_responses) * 100), "%"] })] }) }))] }), _jsx("div", { className: "mt-8 flex justify-center", children: _jsx("button", { type: "button", onClick: handleCloseSummary, className: "rounded-full bg-brand-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600", children: "Return to Dashboard" }) })] }) })), isSubmittingExam && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4", children: _jsxs("div", { className: "w-full max-w-md rounded-3xl bg-white p-12 shadow-xl dark:bg-slate-900 text-center", children: [_jsx("div", { className: "mx-auto mb-6 flex size-20 items-center justify-center", children: _jsxs("svg", { className: "size-20 animate-spin text-brand-500", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] }) }), _jsx("h2", { className: "text-2xl font-bold text-slate-900 dark:text-white mb-2", children: "AI is checking your answers" }), _jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400", children: "This may take a few moments. Please wait while we grade your exam..." }), _jsxs("div", { className: "mt-6 text-sm text-slate-500 dark:text-slate-400", children: ["Processing ", examAnswers.size, " answers"] })] }) })), showExamResults && examResults.size > 0 && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto", children: _jsxs("div", { className: "w-full max-w-4xl rounded-3xl bg-white p-8 shadow-xl dark:bg-slate-900 my-8", children: [_jsxs("div", { className: "text-center mb-8", children: [_jsx("div", { className: "mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-brand-500/10 dark:bg-brand-500/20", children: _jsx("span", { className: "text-3xl", children: "\uD83C\uDFAF" }) }), _jsx("h2", { className: "text-2xl font-bold text-slate-900 dark:text-white", children: "Exam Complete!" }), _jsx("p", { className: "mt-2 text-sm text-slate-500 dark:text-slate-400", children: "Here are your results" })] }), _jsxs("div", { className: "grid grid-cols-3 gap-4 mb-8", children: [_jsx("div", { className: "rounded-2xl bg-slate-100 p-4 dark:bg-slate-800", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-2xl font-bold text-slate-900 dark:text-slate-100", children: Array.from(examResults.values()).filter(r => r.is_correct === true).length }), _jsx("div", { className: "text-xs font-medium text-slate-500 dark:text-slate-400 mt-1", children: "Correct" })] }) }), _jsx("div", { className: "rounded-2xl bg-slate-100 p-4 dark:bg-slate-800", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-2xl font-bold text-slate-900 dark:text-slate-100", children: Array.from(examResults.values()).filter(r => r.is_correct === false).length }), _jsx("div", { className: "text-xs font-medium text-slate-500 dark:text-slate-400 mt-1", children: "Incorrect" })] }) }), _jsx("div", { className: "rounded-2xl border-2 border-brand-200 bg-brand-50/50 p-4 dark:border-brand-500/30 dark:bg-brand-900/10", children: _jsxs("div", { className: "text-center", children: [_jsxs("div", { className: "text-2xl font-bold text-brand-600 dark:text-brand-400", children: [Math.round((Array.from(examResults.values()).filter(r => r.is_correct === true).length / examResults.size) * 100), "%"] }), _jsx("div", { className: "text-xs font-medium text-brand-600 dark:text-brand-400 mt-1", children: "Score" })] }) })] }), _jsx("div", { className: "space-y-4 max-h-96 overflow-y-auto mb-8", children: cards.map((card, idx) => {
                                const result = examResults.get(card.id);
                                const userAnswer = examAnswers.get(card.id);
                                if (!result)
                                    return null;
                                return (_jsx("div", { className: `rounded-2xl border p-4 ${result.is_correct
                                        ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-500/30 dark:bg-emerald-900/10"
                                        : "border-rose-200 bg-rose-50/30 dark:border-rose-500/30 dark:bg-rose-900/10"}`, children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsxs("span", { className: "text-xs font-semibold text-slate-500 dark:text-slate-400", children: ["Question ", idx + 1] }), result.llm_feedback && (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-500/20 dark:text-purple-300", children: [_jsx("svg", { className: "size-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 10V3L4 14h7v7l9-11h-7z" }) }), "AI Graded"] }))] }), _jsx("p", { className: "text-sm font-medium text-slate-900 dark:text-slate-100 mb-2", children: card.prompt }), _jsxs("div", { className: "space-y-1", children: [_jsxs("p", { className: "text-sm text-slate-600 dark:text-slate-300", children: [_jsx("span", { className: "font-semibold", children: "Your answer:" }), " ", userAnswer || "No answer"] }), !result.is_correct && (_jsxs("p", { className: "text-sm text-slate-600 dark:text-slate-300", children: [_jsx("span", { className: "font-semibold", children: "Correct answer:" }), " ", card.answer] })), result.llm_feedback && (_jsx("p", { className: "text-sm text-slate-600 dark:text-slate-300 mt-2 italic", children: result.llm_feedback }))] })] }), _jsx("div", { className: `flex-shrink-0 rounded-full p-2 ${result.is_correct
                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`, children: result.is_correct ? (_jsx("svg", { className: "size-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) })) : (_jsx("svg", { className: "size-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) })) })] }) }, card.id));
                            }) }), _jsx("div", { className: "flex justify-center gap-4", children: _jsx("button", { type: "button", onClick: () => navigate("/app/dashboard"), className: "rounded-full bg-brand-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600", children: "Return to Dashboard" }) })] }) }))] }));
};
