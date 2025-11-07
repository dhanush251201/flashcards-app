# Exam Mode Documentation

## Overview

Exam mode provides a complete testing experience where users answer all questions before seeing any results. This mode is designed to simulate real exam conditions with:
- No immediate feedback during the exam
- AI-powered grading for open-ended questions
- Comprehensive results display at the end
- Automatic filtering of basic flashcard questions

## Features

### 1. Question Type Filtering

**Included in Exams:**
- Multiple Choice questions
- Short Answer questions
- Cloze (fill-in-the-blank) questions

**Excluded from Exams:**
- Basic (flashcard) type questions

The filtering happens automatically when you start an exam session. If a deck contains only basic flashcard questions, you'll see a message indicating no exam questions are available.

### 2. Answer Collection Without Feedback

During an exam:
- Users can answer questions in any order
- Answers are stored locally until submission
- No correctness feedback is shown
- "Answer recorded! Moving to next question..." message confirms submission
- Progress indicator shows "Answered: X / Y"
- Users can skip questions and come back later

### 3. Batch Submission with AI Grading

When all questions are answered:
- "Submit Exam" button becomes available
- Clicking submit triggers batch processing:
  1. All answers sent to backend sequentially
  2. AI checks SHORT_ANSWER and CLOZE questions
  3. Exact matching for MULTIPLE_CHOICE questions
  4. Loading screen shows "AI is checking your answers"

### 4. Comprehensive Results Display

After grading completes:
- **Score Summary:**
  - Total correct count
  - Total incorrect count
  - Overall percentage score

- **Detailed Question Breakdown:**
  - Question text
  - User's answer
  - Correct answer (if incorrect)
  - AI feedback (for AI-graded questions)
  - Visual indicators (✓ for correct, ✗ for incorrect)
  - Purple "⚡ AI Graded" badge on AI-checked questions

## User Flow

### Starting an Exam

1. Navigate to a deck
2. Click "Start Exam" or select "Exam" mode
3. Session begins with only exam-eligible questions
4. Header shows "Exam Session" and "Question X of Y"

### During the Exam

```
┌─────────────────────────────────────┐
│ Exam Session                        │
│ Deck Name                           │
│ Question 1 of 5                     │
└─────────────────────────────────────┘

[Question appears here]

[Answer input/options]

Progress: Answered: 1 / 5

[Skip Question] [already answered]
```

### Submitting the Exam

When all questions answered:
```
┌─────────────────────────────────────┐
│ Exam Session                        │
│ Deck Name                           │
│ Question 5 of 5                     │
└─────────────────────────────────────┘

Progress: Answered: 5 / 5

[Submit Exam] ← Button appears
```

### AI Grading Screen

```
┌─────────────────────────────────────┐
│                                     │
│        [Spinning Loader]            │
│                                     │
│   AI is checking your answers       │
│                                     │
│   This may take a few moments.      │
│   Please wait while we grade...     │
│                                     │
│   Processing 5 answers              │
│                                     │
└─────────────────────────────────────┘
```

### Results Display

```
┌─────────────────────────────────────┐
│           🎯 Exam Complete!         │
│        Here are your results        │
│                                     │
│  [3]          [2]         [60%]     │
│ Correct    Incorrect     Score      │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ Question 1    ⚡ AI Graded   │ ✓  │
│ │ What is photosynthesis?     │    │
│ │ Your: Process plants use... │    │
│ │ AI: Your answer correctly...│    │
│ └─────────────────────────────┘    │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ Question 2                   │ ✗  │
│ │ What is 2+2?               │    │
│ │ Your: 5                     │    │
│ │ Correct: 4                  │    │
│ └─────────────────────────────┘    │
│                                     │
│      [Return to Dashboard]          │
└─────────────────────────────────────┘
```

## Technical Implementation

### Frontend (StudySessionPage.tsx)

#### State Management

```typescript
// Exam mode state
const [examAnswers, setExamAnswers] = useState<Map<number, string>>(new Map());
const [examResults, setExamResults] = useState<Map<number, StudyResponse>>(new Map());
const [isSubmittingExam, setIsSubmittingExam] = useState(false);
const [showExamResults, setShowExamResults] = useState(false);
```

#### Card Filtering

Two layers of filtering ensure basic cards never appear:

1. **Initial useEffect Filter:**
```typescript
useEffect(() => {
  if (isExamMode && deckQuery.data?.cards && shuffledCards.length === 0) {
    const examEligibleCards = deckQuery.data.cards.filter(
      card => card.type === "multiple_choice" ||
              card.type === "short_answer" ||
              card.type === "cloze"
    );
    setShuffledCards(shuffleArray(examEligibleCards));
  }
}, [isExamMode, deckQuery.data?.cards, shuffledCards.length]);
```

2. **Defensive Filter (useMemo):**
```typescript
const cards: Card[] = useMemo(() => {
  const baseCards = shuffledCards.length > 0 ? shuffledCards : deckQuery.data?.cards ?? [];

  if (isExamMode) {
    return baseCards.filter(
      card => card.type === "multiple_choice" ||
              card.type === "short_answer" ||
              card.type === "cloze"
    );
  }

  return baseCards;
}, [shuffledCards, deckQuery.data?.cards, isExamMode]);
```

#### Answer Submission

```typescript
const handleSubmitExam = async () => {
  setIsSubmittingExam(true);

  try {
    const results = new Map();

    // Submit all answers sequentially
    for (const card of cards) {
      const userAnswer = examAnswers.get(card.id);
      if (userAnswer !== undefined) {
        const { data } = await apiClient.post(
          `/study/sessions/${sessionId}/answer`,
          {
            card_id: card.id,
            quality: null,
            user_answer: userAnswer
          }
        );
        results.set(card.id, data);
      }
    }

    setExamResults(results);
    setIsSubmittingExam(false);
    setShowExamResults(true);

    await finishMutation.mutateAsync();
  } catch (error) {
    console.error("Error submitting exam:", error);
    setIsSubmittingExam(false);
    alert("Error submitting exam. Please try again.");
  }
};
```

### Backend (study.py)

#### Answer Recording with LLM

```python
async def record_answer(
    db: Session,
    session: QuizSession,
    card: Card,
    user: User,
    answer_in: StudyAnswerCreate,
) -> tuple[QuizResponse, Optional[str]]:
    is_correct: bool | None = None
    quality = answer_in.quality
    llm_feedback: Optional[str] = None

    # Auto-grade for PRACTICE and EXAM modes
    if session.mode in [QuizMode.PRACTICE, QuizMode.EXAM]:
        # Try LLM-based checking for SHORT_ANSWER and CLOZE
        if card.type in [CardType.SHORT_ANSWER, CardType.CLOZE]:
            llm_result = await _check_answer_with_llm(card, answer_in.user_answer, user)
            if llm_result:
                is_correct = llm_result.get("is_correct")
                llm_feedback = llm_result.get("feedback")
            else:
                # Fallback to exact matching
                is_correct = _check_answer_correctness(card, answer_in.user_answer)
        else:
            # For multiple choice, use exact matching
            is_correct = _check_answer_correctness(card, answer_in.user_answer)

    response = QuizResponse(
        session_id=session.id,
        card_id=card.id,
        user_answer=answer_in.user_answer,
        quality=quality,
        is_correct=is_correct,
    )
    db.add(response)
    db.commit()
    db.refresh(response)

    return response, llm_feedback
```

#### LLM Integration

```python
async def _check_answer_with_llm(
    card: Card,
    user_answer: str | None,
    user: User
) -> Optional[Dict[str, Any]]:
    if not user_answer:
        return None

    question = card.prompt
    expected_answer = card.answer

    # For cloze cards, extract expected answers from cloze_data
    if card.type == CardType.CLOZE and card.cloze_data:
        blanks = card.cloze_data.get("blanks", [])
        expected_answers = [blank.get("answer") for blank in blanks]
        expected_answer = ", ".join(str(ans) for ans in expected_answers)

    try:
        result = await llm_service.check_answer(
            question=question,
            expected_answer=expected_answer,
            user_answer=user_answer,
            user=user
        )
        return result  # {is_correct: bool, feedback: str}
    except Exception as e:
        logger.error(f"Exception in _check_answer_with_llm: {str(e)}")
        return None  # Fallback to exact matching
```

## Best Practices

### For Users

1. **Before Starting an Exam:**
   - Ensure you have AI configured (OpenAI or Ollama)
   - Verify your deck has exam-eligible questions
   - Find a quiet place without interruptions

2. **During the Exam:**
   - Answer all questions even if unsure (no penalty for wrong answers)
   - Take your time - no time limit unless configured
   - Can skip and return to questions

3. **After the Exam:**
   - Review AI feedback carefully
   - Note which questions you got wrong
   - Study those topics before retrying

### For Developers

1. **Adding New Card Types:**
   - Update the filter logic in both places (useEffect and useMemo)
   - Update backend auto-grading logic
   - Add LLM checking if applicable

2. **Extending Results Display:**
   - Results are stored in Map structure for O(1) lookup
   - Each result includes is_correct, user_answer, llm_feedback
   - Easy to add new metrics or visualizations

3. **Performance Considerations:**
   - Sequential API calls ensure LLM doesn't get overwhelmed
   - Can be parallelized with rate limiting if needed
   - Loading screen keeps user engaged during batch processing

## Troubleshooting

### Basic Questions Still Appearing

**Symptom:** Basic flashcard questions show up in exam

**Solutions:**
1. Check browser console for filter logs:
   ```
   === Filtering cards for exam mode ===
   Total cards in deck: 10
   Exam eligible cards: 7
   ```

2. Verify card types in database:
   ```sql
   SELECT id, type FROM cards WHERE deck_id = ?;
   ```

3. Check for type mismatches (case sensitivity, extra spaces)

### Submit Exam Button Not Appearing

**Symptom:** Can't submit even though all questions answered

**Solutions:**
1. Check progress indicator: "Answered: X / Y"
2. If X < Y, you have unanswered questions
3. Navigate through all questions to find unanswered ones
4. Skipped questions count as unanswered

### AI Grading Taking Too Long

**Symptom:** "AI is checking your answers" screen for > 30 seconds

**Solutions:**
1. Check backend logs for errors
2. Verify AI service (OpenAI/Ollama) is responding
3. Large exams (20+ questions) may take longer
4. Consider reducing exam size or using exact matching

### Results Not Showing

**Symptom:** After grading, no results modal appears

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify all API calls completed successfully
3. Check network tab for 500 errors
4. Review backend logs for exceptions during grading

## API Reference

### Start Exam Session

```
POST /api/v1/study/sessions
{
  "deck_id": 123,
  "mode": "exam"
}

Response: 201 Created
{
  "id": 456,
  "deck_id": 123,
  "mode": "exam",
  "status": "active",
  "started_at": "2025-01-15T10:00:00Z",
  "config": null
}
```

### Submit Answer

```
POST /api/v1/study/sessions/{session_id}/answer
{
  "card_id": 789,
  "user_answer": "The process by which plants convert sunlight to energy",
  "quality": null
}

Response: 200 OK
{
  "id": 999,
  "card_id": 789,
  "session_id": 456,
  "user_answer": "The process by which plants convert sunlight to energy",
  "is_correct": true,
  "quality": null,
  "responded_at": "2025-01-15T10:05:00Z",
  "llm_feedback": "Your answer is correct! You accurately described photosynthesis..."
}
```

### Finish Session

```
POST /api/v1/study/sessions/{session_id}/finish

Response: 200 OK
{
  "id": 456,
  "status": "completed",
  "ended_at": "2025-01-15T10:15:00Z",
  ...
}
```

### Get Session Statistics

```
GET /api/v1/study/sessions/{session_id}/statistics

Response: 200 OK
{
  "total_responses": 10,
  "correct_count": 7,
  "incorrect_count": 3,
  "unanswered_count": 0
}
```

## Future Enhancements

Potential improvements to exam mode:

1. **Timed Exams:**
   - Add countdown timer
   - Auto-submit when time expires
   - Time-per-question tracking

2. **Question Randomization:**
   - Randomize question order per user
   - Randomize MCQ option order
   - Prevent cheating

3. **Partial Credit:**
   - For cloze questions with multiple blanks
   - For short answers that are partially correct
   - Weighted scoring by difficulty

4. **Analytics:**
   - Time spent per question
   - Questions most frequently missed
   - Performance trends over time

5. **Review Mode:**
   - Allow reviewing exam without changing answers
   - Export results as PDF
   - Share results with instructors

6. **Adaptive Difficulty:**
   - Adjust question difficulty based on performance
   - Focus on weak areas
   - Personalized question selection
