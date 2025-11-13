import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, ArrowRightIcon, PauseIcon, PlayIcon } from "@heroicons/react/24/outline";

import { Flashcard } from "@/components/cards/Flashcard";
import { FlagButton } from "@/components/cards/FlagButton";
import { apiClient } from "@/lib/apiClient";
import { flaggedCardsApi } from "@/lib/flaggedCardsApi";
import type { Card, DeckDetail, SessionStatistics, StudyResponse, StudySession } from "@/types/api";

type AnswerMutationVariables = {
  cardId: number;
  quality?: number | null;
  userAnswer?: string | null;
};

const normalize = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const StudySessionPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Check if this is a flagged-only session
  const searchParams = new URLSearchParams(window.location.search);
  const isFlaggedOnly = searchParams.get("flaggedOnly") === "true";

  const [cardIndex, setCardIndex] = useState(0);
  const [isAutoFlip, setIsAutoFlip] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const [shortAnswerInput, setShortAnswerInput] = useState("");
  const [clozeAnswers, setClozeAnswers] = useState<string[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<Card[]>([]);
  const [llmFeedback, setLlmFeedback] = useState<string | null>(null);
  const [flaggedCardIds, setFlaggedCardIds] = useState<Set<number>>(new Set());
  const [initialFlaggedCardIds, setInitialFlaggedCardIds] = useState<Set<number>>(new Set());

  // Exam mode state
  const [examAnswers, setExamAnswers] = useState<Map<number, string>>(new Map());
  const [examResults, setExamResults] = useState<Map<number, StudyResponse & { llm_feedback?: string }>>(new Map());
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [showExamResults, setShowExamResults] = useState(false);

  const sessionQuery = useQuery({
    queryKey: ["session", sessionId],
    queryFn: async () => {
      const { data } = await apiClient.get<StudySession>(`/study/sessions/${sessionId}`);
      return data;
    },
    enabled: Boolean(sessionId)
  });

  const deckQuery = useQuery({
    queryKey: ["deck", sessionQuery.data?.deck_id],
    queryFn: async () => {
      const { data } = await apiClient.get<DeckDetail>(`/decks/${sessionQuery.data?.deck_id}`);
      return data;
    },
    enabled: Boolean(sessionQuery.data?.deck_id)
  });

  // Query for flagged card IDs
  const flaggedCardsQuery = useQuery({
    queryKey: ["flaggedCardIds", sessionQuery.data?.deck_id],
    queryFn: async () => {
      if (!sessionQuery.data?.deck_id) return [];
      return await flaggedCardsApi.getFlaggedCardIds(sessionQuery.data.deck_id);
    },
    enabled: Boolean(sessionQuery.data?.deck_id)
  });

  // Update flagged cards state when query data changes
  // Store initial snapshot for filtering, and current state for UI
  useEffect(() => {
    if (flaggedCardsQuery.data) {
      const ids = new Set(flaggedCardsQuery.data);
      setFlaggedCardIds(ids);
      // Only set initial IDs once, when first loaded
      setInitialFlaggedCardIds(prev => prev.size === 0 ? ids : prev);
    }
  }, [flaggedCardsQuery.data]);

  const answerMutation = useMutation<StudyResponse, unknown, AnswerMutationVariables>({
    mutationFn: async ({ cardId, quality, userAnswer: submittedAnswer }) => {
      console.log("=== Mutation starting ===");
      const { data } = await apiClient.post<StudyResponse>(`/study/sessions/${sessionId}/answer`, {
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
      } else {
        console.log("No llm_feedback in response data");
        setLlmFeedback(null);
      }
    }
  });

  const statisticsMutation = useMutation<SessionStatistics>({
    mutationFn: async () => {
      const { data } = await apiClient.get<SessionStatistics>(`/study/sessions/${sessionId}/statistics`);
      return data;
    },
    onSuccess: () => {
      setShowSummaryModal(true);
    }
  });

  const finishMutation = useMutation<StudySession>({
    mutationFn: async () => {
      const { data } = await apiClient.post<StudySession>(`/study/sessions/${sessionId}/finish`);
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

  // Get cards with defensive filtering for exam mode and flagged-only mode
  // Use initialFlaggedCardIds for filtering to prevent cards from disappearing when unflagged
  const cards: Card[] = useMemo(() => {
    let baseCards = shuffledCards.length > 0 ? shuffledCards : deckQuery.data?.cards ?? [];

    // Filter for flagged-only sessions using INITIAL flagged IDs
    // This prevents cards from disappearing when unflagged during the session
    if (isFlaggedOnly && initialFlaggedCardIds.size > 0) {
      baseCards = baseCards.filter(card => initialFlaggedCardIds.has(card.id));
    }

    // In exam mode, always filter out basic cards as a safety measure
    if (isExamMode) {
      const filtered = baseCards.filter(
        card => card.type === "multiple_choice" || card.type === "short_answer" || card.type === "cloze"
      );
      console.log("=== Defensive filter applied ===");
      console.log("Base cards:", baseCards.length);
      console.log("Filtered cards:", filtered.length);
      console.log("Filtered types:", filtered.map(c => c.type));
      return filtered;
    }

    return baseCards;
  }, [shuffledCards, deckQuery.data?.cards, isExamMode, isFlaggedOnly, initialFlaggedCardIds]);

  const currentCard = cards[cardIndex];

  // Shuffle cards for practice mode on initial load
  useEffect(() => {
    if (isPracticeMode && deckQuery.data?.cards && shuffledCards.length === 0 && !isFlaggedOnly) {
      setShuffledCards(shuffleArray(deckQuery.data.cards));
    }
  }, [isPracticeMode, deckQuery.data?.cards, shuffledCards.length, isFlaggedOnly]);

  // Filter and shuffle flagged cards for flagged-only mode
  useEffect(() => {
    if (isFlaggedOnly && deckQuery.data?.cards && shuffledCards.length === 0 && initialFlaggedCardIds.size > 0) {
      const flaggedCards = deckQuery.data.cards.filter(card => initialFlaggedCardIds.has(card.id));
      console.log("=== Filtering cards for flagged-only mode ===");
      console.log("Total cards in deck:", deckQuery.data.cards.length);
      console.log("Flagged cards:", flaggedCards.length);
      setShuffledCards(shuffleArray(flaggedCards));
    }
  }, [isFlaggedOnly, deckQuery.data?.cards, shuffledCards.length, initialFlaggedCardIds]);

  // Filter and shuffle cards for exam mode - only include MCQ, short answer, and cloze questions
  useEffect(() => {
    if (isExamMode && deckQuery.data?.cards && shuffledCards.length === 0) {
      console.log("=== Filtering cards for exam mode ===");
      console.log("Total cards in deck:", deckQuery.data.cards.length);
      console.log("Card types:", deckQuery.data.cards.map(c => ({ id: c.id, type: c.type })));

      const examEligibleCards = deckQuery.data.cards.filter(
        card => card.type === "multiple_choice" || card.type === "short_answer" || card.type === "cloze"
      );

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
    if (!currentCard || currentCard.type !== "cloze") return null;
    return currentCard.prompt;
  }, [currentCard]);

  const clozeBlanksCount = useMemo(() => {
    if (!currentCard?.cloze_data?.blanks) return 0;
    return currentCard.cloze_data.blanks.length;
  }, [currentCard]);

  const isMultipleChoice = multipleChoiceOptions.length > 0;
  const isShortAnswer = currentCard?.type === "short_answer";
  const isCloze = currentCard?.type === "cloze";

  const selectedIsCorrect =
    isMultipleChoice && userAnswer !== null && normalize(userAnswer) === normalize(currentCard?.answer);

  const readyForNext = useMemo(() => {
    if (isMultipleChoice) return userAnswer !== null;
    if (isShortAnswer) return userAnswer !== null;
    if (isCloze) return userAnswer !== null && clozeAnswers.length === clozeBlanksCount;
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
    } else {
      setClozeAnswers([]);
    }
  }, [currentCard?.id, currentCard?.type, currentCard?.cloze_data]);

  useEffect(() => {
    if ((isMultipleChoice || isShortAnswer || isCloze) && userAnswer) {
      setFlipped(true);
    }
  }, [isMultipleChoice, isShortAnswer, isCloze, userAnswer]);

  const handleSelectOption = async (option: string) => {
    if (answerMutation.isPending || !currentCard) return;
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

    if (answerMutation.isPending || !shortAnswerInput.trim() || !currentCard) return;
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
    } else {
      console.log("Review mode - skipping immediate submission");
      setUserAnswer(answer);
    }
  };

  const handleSubmitCloze = async () => {
    if (answerMutation.isPending || !currentCard) return;
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
    } else {
      setUserAnswer(answersJson);
    }
  };

  const handleClozeInputChange = (index: number, value: string) => {
    const newAnswers = [...clozeAnswers];
    newAnswers[index] = value;
    setClozeAnswers(newAnswers);
  };

  const deriveQuality = () => {
    if (!isReviewMode) return null;
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

    if (!currentCard || answerMutation.isPending || !readyForNext) return;

    // Determine if we need to submit the answer now
    // Submit if:
    // 1. REVIEW mode: Always submit on next (user provides quality rating)
    // 2. BASIC cards in Practice/Exam: Submit on next (no auto-grading)
    // 3. MC/SHORT_ANSWER/CLOZE in Practice/Exam: Already submitted immediately, skip
    const shouldSubmitNow =
      isReviewMode ||
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
    } else {
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
      } else {
        setCardIndex((prev) => prev + 1);
      }
    } else {
      // For other modes, finish when reaching the end
      if (cardIndex >= cards.length - 1) {
        await finishMutation.mutateAsync();
        navigate("/app/dashboard");
      } else {
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
    if (isSubmittingExam) return;

    console.log("=== Submitting exam ===");
    console.log("Total answers:", examAnswers.size);
    console.log("Total cards:", cards.length);

    setIsSubmittingExam(true);

    try {
      const results = new Map<number, StudyResponse & { llm_feedback?: string }>();

      // Submit all answers sequentially to ensure proper processing
      for (const card of cards) {
        const userAnswer = examAnswers.get(card.id);
        if (userAnswer !== undefined) {
          console.log(`Submitting answer for card ${card.id}`);
          const { data } = await apiClient.post<StudyResponse>(`/study/sessions/${sessionId}/answer`, {
            card_id: card.id,
            quality: null,
            user_answer: userAnswer
          });

          // Store result with LLM feedback if available
          results.set(card.id, {
            ...data,
            llm_feedback: (data as any).llm_feedback
          });
        }
      }

      console.log("All answers submitted, results:", results.size);
      setExamResults(results);
      setIsSubmittingExam(false);
      setShowExamResults(true);

      // Finish the session
      await finishMutation.mutateAsync();
    } catch (error) {
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
    } else if (isExamMode && examAnswers.size < cards.length) {
      // If exam mode and not all questions answered, confirm exit
      if (confirm("You haven't answered all questions. Are you sure you want to end the exam?")) {
        await finishMutation.mutateAsync();
        navigate("/app/dashboard");
      }
    } else {
      await finishMutation.mutateAsync();
      navigate("/app/dashboard");
    }
  };

  const handleCloseSummary = () => {
    setShowSummaryModal(false);
    navigate("/app/dashboard");
  };

  if (sessionQuery.isLoading || deckQuery.isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-4 border-slate-300 border-t-brand-500 dark:border-slate-700 dark:border-t-brand-300" />
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center text-sm text-slate-500 shadow-card dark:bg-slate-900">
        {isExamMode ? (
          <>
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
              <svg className="size-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No Exam Questions Available</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              This deck contains only basic flashcards. Exams require multiple choice, short answer, or cloze questions.
            </p>
          </>
        ) : (
          <p>No cards available in this deck yet.</p>
        )}
        <button
          type="button"
          onClick={() => navigate(`/app/decks/${sessionQuery.data?.deck_id ?? ""}`)}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/30"
        >
          Back to deck <ArrowLeftIcon className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {isFlaggedOnly ? "Flagged Questions" : isExamMode ? "Exam Session" : isPracticeMode ? "Practice Session" : "Study Session"}
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{deckQuery.data?.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            {isExamMode ? "Question" : "Card"} {cardIndex + 1} of {cards.length}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isExamMode && (
            <button
              type="button"
              onClick={() => setIsAutoFlip((prev) => !prev)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                isAutoFlip
                  ? "border-brand-500 bg-brand-500/10 text-brand-600"
                  : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              {isAutoFlip ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />} Auto flip
            </button>
          )}
          <button
            type="button"
            onClick={handleEndSession}
            disabled={statisticsMutation.isPending || finishMutation.isPending}
            className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-500/10 dark:border-rose-500/40 dark:text-rose-300 disabled:opacity-50"
          >
            {statisticsMutation.isPending || finishMutation.isPending ? "Ending..." : "End session"}
          </button>
        </div>
      </header>

      <div className="rounded-3xl bg-white p-8 shadow-card shadow-brand-500/15 dark:bg-slate-900">
        <div className="mx-auto max-w-2xl space-y-6">
          {!isCloze && (
            <Flashcard card={currentCard} flipped={flipped} onToggle={() => setFlipped((prev) => !prev)} />
          )}

          {isMultipleChoice && (
            <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Choose an answer
              </p>
              <div className="mt-3 grid gap-2">
                {multipleChoiceOptions.map((option, index) => {
                  const isSelected = userAnswer === option;
                  return (
                    <button
                      key={`${option}-${index}`}
                      type="button"
                      onClick={() => handleSelectOption(option)}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                        isSelected
                          ? "border-brand-400 bg-white text-brand-700 shadow-sm dark:border-brand-500/60 dark:bg-slate-900 dark:text-brand-200"
                          : "border-transparent bg-white text-slate-600 hover:border-brand-200 hover:text-brand-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-500/40"
                      }`}
                      disabled={answerMutation.isPending}
                    >
                      <span>{option}</span>
                      {isSelected && <ArrowRightIcon className="size-4 text-brand-500 dark:text-brand-200" />}
                    </button>
                  );
                })}
              </div>

              {userAnswer && !isExamMode && (
                <div
                  className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                    selectedIsCorrect
                      ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
                  }`}
                >
                  {selectedIsCorrect ? "Great job! You picked the correct answer." : <span>Correct answer: {currentCard.answer}</span>}
                </div>
              )}
              {userAnswer && isExamMode && (
                <div className="mt-4 rounded-2xl bg-brand-50/50 px-4 py-3 text-sm dark:bg-brand-900/10">
                  <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Answer recorded! Moving to next question...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {isShortAnswer && (
            <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Type your answer
              </p>
              <div className="mt-3 space-y-3">
                <input
                  type="text"
                  value={shortAnswerInput}
                  onChange={(e) => setShortAnswerInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && shortAnswerInput.trim()) {
                      handleSubmitShortAnswer();
                    }
                  }}
                  placeholder="Enter your answer..."
                  disabled={userAnswer !== null || answerMutation.isPending}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                />
                {!userAnswer && (
                  <button
                    type="button"
                    onClick={handleSubmitShortAnswer}
                    disabled={!shortAnswerInput.trim() || answerMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Submit Answer
                  </button>
                )}
              </div>

              {userAnswer && !isExamMode && (
                <div className="mt-4 space-y-2">
                  {/* Show loading state while mutation is pending */}
                  {answerMutation.isPending && !isReviewMode ? (
                    <div className="rounded-2xl bg-brand-50/50 px-4 py-3 text-sm dark:bg-brand-900/10">
                      <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
                        <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="font-medium">Checking your answer with AI...</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            llmFeedback
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {llmFeedback ? (
                            <>
                              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              AI Generated
                            </>
                          ) : (
                            <>
                              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Exact Match
                            </>
                          )}
                        </span>
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm ${
                          llmFeedback
                            ? answerMutation.data?.is_correct
                              ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                              : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
                            : normalize(userAnswer) === normalize(currentCard.answer) ||
                              (currentCard.options && currentCard.options.some((opt) => normalize(opt) === normalize(userAnswer)))
                            ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                            : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
                        }`}
                      >
                        {llmFeedback ? (
                          <div>
                            <p className="font-semibold">Your answer: {userAnswer}</p>
                            <p className="mt-2">{llmFeedback}</p>
                          </div>
                        ) : normalize(userAnswer) === normalize(currentCard.answer) ||
                          (currentCard.options && currentCard.options.some((opt) => normalize(opt) === normalize(userAnswer))) ? (
                          "Great job! Your answer is correct."
                        ) : (
                          <div>
                            <p className="font-semibold">Your answer: {userAnswer}</p>
                            <p className="mt-1">
                              Correct answer{currentCard.options && currentCard.options.length > 1 ? "s" : ""}:{" "}
                              {currentCard.options && currentCard.options.length > 0 ? currentCard.options.join(", ") : currentCard.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
              {userAnswer && isExamMode && (
                <div className="mt-4 rounded-2xl bg-brand-50/50 px-4 py-3 text-sm dark:bg-brand-900/10">
                  <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Answer recorded! Moving to next question...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {isCloze && clozeText && (
            <div className="space-y-4">
              <div className="rounded-3xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6 dark:border-brand-500/30 dark:from-brand-900/20 dark:to-slate-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                  Fill in the blanks
                </p>
                <div className="mt-3 text-base leading-relaxed text-slate-800 dark:text-slate-200">
                  {(() => {
                    let blankCounter = 0;
                    return clozeText.split(/(\[BLANK\])/gi).map((part, i) => {
                      if (part.match(/\[BLANK\]/i)) {
                        const currentBlankIndex = blankCounter;
                        blankCounter++;
                        return (
                          <input
                            key={i}
                            type="text"
                            value={clozeAnswers[currentBlankIndex] ?? ""}
                            onChange={(e) => handleClozeInputChange(currentBlankIndex, e.target.value)}
                            disabled={userAnswer !== null || answerMutation.isPending}
                            className="mx-1 inline-block w-32 rounded-lg border-2 border-brand-300 bg-white px-3 py-1.5 text-center text-sm font-medium text-slate-900 placeholder-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-500/40 dark:bg-slate-800 dark:text-white"
                            placeholder="?"
                          />
                        );
                      }
                      return <span key={i}>{part}</span>;
                    });
                  })()}
                </div>

                {!userAnswer && (
                  <div className="mt-4 space-y-2">
                    <button
                      type="button"
                      onClick={handleSubmitCloze}
                      disabled={clozeAnswers.some((a) => !a || !a.trim()) || answerMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Submit Answer
                    </button>
                    {/* Debug info - can be removed later */}
                    <p className="text-xs text-slate-400">
                      Filled: {clozeAnswers.filter(a => a && a.trim()).length} / {clozeBlanksCount}
                    </p>
                  </div>
                )}

                {userAnswer && !isExamMode ? (
                  <div className="mt-4 space-y-2">
                    {/* Show loading state while mutation is pending */}
                    {answerMutation.isPending && !isReviewMode ? (
                      <div className="rounded-2xl bg-brand-50/50 px-4 py-3 text-sm dark:bg-brand-900/10">
                        <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
                          <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="font-medium">Checking your answer with AI...</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              llmFeedback
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {llmFeedback ? (
                              <>
                                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                AI Generated
                              </>
                            ) : (
                              <>
                                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Exact Match
                              </>
                            )}
                          </span>
                        </div>
                        {llmFeedback ? (
                          <div
                            className={`rounded-2xl px-4 py-3 text-sm ${
                              answerMutation.data?.is_correct
                                ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                                : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
                            }`}
                          >
                            <p className="font-semibold">Your answer: {clozeAnswers.join(", ")}</p>
                            <p className="mt-2">{llmFeedback}</p>
                          </div>
                        ) : currentCard.cloze_data && currentCard.cloze_data.blanks ? (
                          currentCard.cloze_data.blanks.map((blank, idx) => {
                            const userAns = clozeAnswers[idx];
                            const correctAnswers = Array.isArray(blank.answer) ? blank.answer : [blank.answer];
                            const isCorrect = correctAnswers.some((ans) => normalize(ans) === normalize(userAns));

                            return (
                              <div
                                key={idx}
                                className={`rounded-2xl px-4 py-3 text-sm ${
                                  isCorrect
                                    ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                                    : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
                                }`}
                              >
                                <p>
                                  <span className="font-semibold">Blank {idx + 1}:</span> {userAns}
                                  {isCorrect ? " ✓" : ` ✗ (Correct: ${correctAnswers.join(", ")})`}
                                </p>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-rose-600">Error: Missing cloze_data or blanks</p>
                        )}
                      </>
                    )}
                  </div>
                ) : null}
                {userAnswer && isExamMode && (
                  <div className="mt-4 rounded-2xl bg-brand-50/50 px-4 py-3 text-sm dark:bg-brand-900/10">
                    <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Answer recorded! Moving to next question...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!isExamMode && (
            <div className="flex items-center justify-between text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setFlipped((prev) => !prev)}
                className="text-sm font-medium text-brand-600 hover:text-brand-500 dark:text-brand-300"
              >
                {flipped
                  ? isMultipleChoice || isShortAnswer || isCloze
                    ? "Hide explanation"
                    : "Hide answer"
                  : isMultipleChoice || isShortAnswer || isCloze
                    ? "Show explanation"
                    : "Reveal answer"}
              </button>
              <div>
                {cardIndex + 1}/{cards.length}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-3xl bg-slate-100/70 p-4 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Progress</p>
                {isExamMode && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Answered: {examAnswers.size} / {cards.length}
                  </p>
                )}
              </div>
              {currentCard && sessionQuery.data?.deck_id && (
                <FlagButton
                  cardId={currentCard.id}
                  deckId={sessionQuery.data.deck_id}
                  isFlagged={flaggedCardIds.has(currentCard.id)}
                  onFlagChange={(isFlagged) => {
                    setFlaggedCardIds((prev) => {
                      const newSet = new Set(prev);
                      if (isFlagged) {
                        newSet.add(currentCard.id);
                      } else {
                        newSet.delete(currentCard.id);
                      }
                      return newSet;
                    });
                  }}
                  size="sm"
                  showLabel
                />
              )}
            </div>
            <div className="flex items-center gap-3">
              {isExamMode ? (
                <>
                  {cardIndex < cards.length - 1 && !userAnswer && (
                    <button
                      type="button"
                      onClick={handleNextExamQuestion}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Skip Question
                      <ArrowRightIcon className="size-4" />
                    </button>
                  )}
                  {examAnswers.size === cards.length && (
                    <button
                      type="button"
                      onClick={handleSubmitExam}
                      disabled={isSubmittingExam}
                      className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmittingExam ? "Submitting..." : "Submit Exam"}
                      <ArrowRightIcon className="size-4" />
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!readyForNext || answerMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-brand-500/20 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cardIndex === cards.length - 1 ? "Finish session" : "Next card"}
                  <ArrowRightIcon className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSummaryModal && statisticsMutation.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl dark:bg-slate-900">
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-brand-500/10 dark:bg-brand-500/20">
                <span className="text-3xl">🎯</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Session Complete!</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Great work! Here's how you did:
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-900/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Correct Answers</span>
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {statisticsMutation.data.correct_count}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-rose-50 p-4 dark:bg-rose-900/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-rose-900 dark:text-rose-100">Incorrect Answers</span>
                  <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                    {statisticsMutation.data.incorrect_count}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Total Questions</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {statisticsMutation.data.total_responses}
                  </span>
                </div>
              </div>

              {statisticsMutation.data.total_responses > 0 && (
                <div className="rounded-2xl border-2 border-brand-200 bg-brand-50/50 p-4 dark:border-brand-500/30 dark:bg-brand-900/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-brand-900 dark:text-brand-100">Accuracy</span>
                    <span className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                      {Math.round((statisticsMutation.data.correct_count / statisticsMutation.data.total_responses) * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={handleCloseSummary}
                className="rounded-full bg-brand-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Grading Loading Screen */}
      {isSubmittingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-12 shadow-xl dark:bg-slate-900 text-center">
            <div className="mx-auto mb-6 flex size-20 items-center justify-center">
              <svg className="size-20 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">AI is checking your answers</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This may take a few moments. Please wait while we grade your exam...
            </p>
            <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">
              Processing {examAnswers.size} answers
            </div>
          </div>
        </div>
      )}

      {/* Exam Results Modal */}
      {showExamResults && examResults.size > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-3xl bg-white p-8 shadow-xl dark:bg-slate-900 my-8">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-brand-500/10 dark:bg-brand-500/20">
                <span className="text-3xl">🎯</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Exam Complete!</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Here are your results
              </p>
            </div>

            {/* Score Summary */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {Array.from(examResults.values()).filter(r => r.is_correct === true).length}
                  </div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Correct</div>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {Array.from(examResults.values()).filter(r => r.is_correct === false).length}
                  </div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Incorrect</div>
                </div>
              </div>
              <div className="rounded-2xl border-2 border-brand-200 bg-brand-50/50 p-4 dark:border-brand-500/30 dark:bg-brand-900/10">
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                    {Math.round((Array.from(examResults.values()).filter(r => r.is_correct === true).length / examResults.size) * 100)}%
                  </div>
                  <div className="text-xs font-medium text-brand-600 dark:text-brand-400 mt-1">Score</div>
                </div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="space-y-4 max-h-96 overflow-y-auto mb-8">
              {cards.map((card, idx) => {
                const result = examResults.get(card.id);
                const userAnswer = examAnswers.get(card.id);
                if (!result) return null;

                return (
                  <div key={card.id} className={`rounded-2xl border p-4 ${
                    result.is_correct
                      ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-500/30 dark:bg-emerald-900/10"
                      : "border-rose-200 bg-rose-50/30 dark:border-rose-500/30 dark:bg-rose-900/10"
                  }`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Question {idx + 1}
                          </span>
                          {result.llm_feedback && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                              <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              AI Graded
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                          {card.prompt}
                        </p>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            <span className="font-semibold">Your answer:</span> {userAnswer || "No answer"}
                          </p>
                          {!result.is_correct && (
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                              <span className="font-semibold">Correct answer:</span> {card.answer}
                            </p>
                          )}
                          {result.llm_feedback && (
                            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 italic">
                              {result.llm_feedback}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className={`flex-shrink-0 rounded-full p-2 ${
                        result.is_correct
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      }`}>
                        {result.is_correct ? (
                          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() => navigate("/app/dashboard")}
                className="rounded-full bg-brand-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
