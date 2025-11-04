# Study Modes

Flash-Decks offers three distinct study modes, each designed for different learning scenarios and goals.

## Overview

| Mode | Purpose | Card Selection | Grading | SRS Updates |
|------|---------|----------------|---------|-------------|
| Review | Spaced repetition learning | Due cards only | Quality (0-5) | ✅ Yes |
| Practice | Casual practice | All cards, shuffled | Correct/Incorrect | ❌ No |
| Exam | Self-testing | Configurable | Auto-graded | ❌ No |

## 1. Review Mode

**Purpose:** Optimize long-term retention using the SM-2 spaced repetition algorithm.

### When to Use

- Daily review routine
- Learning new material over time
- Maintaining knowledge long-term
- Preparing for exams weeks/months away

### How It Works

1. Shows only cards that are **due for review**
2. User recalls answer
3. User **grades quality** of recall (0-5)
4. SM-2 algorithm schedules next review
5. Card difficulty adjusts based on performance

### Quality Grading

| Quality | Label | Description |
|---------|-------|-------------|
| 0 | Complete Blackout | Didn't remember at all |
| 1 | Incorrect | Wrong answer, but recognized |
| 2 | Incorrect | Almost correct |
| 3 | Correct | With serious difficulty |
| 4 | Correct | After hesitation |
| 5 | Perfect | Immediate recall |

### Features

- Only shows due cards
- Prioritizes oldest due cards first
- Updates SRS state
- Tracks streak on completion
- No time limit

### Best Practices

✅ **Do:**
- Review every day
- Be honest with grading
- Clear all due cards
- Use quality 3-4 most often

❌ **Don't:**
- Skip days
- Give everything 5
- Rush through cards
- Review cards not yet due

## 2. Practice Mode

**Purpose:** Casual studying without affecting spaced repetition state.

### When to Use

- First time seeing new cards
- Reinforcing before an exam
- Light review without pressure
- Testing yourself on all cards

### How It Works

1. Shows **all cards** in deck
2. Shuffled randomly
3. User answers
4. Auto-graded (MCQ, Short Answer, Cloze)
5. Manual grading (Basic cards)
6. **No SRS updates**

### Configuration Options

```json
{
  "card_limit": 20,         // Number of cards (null = all)
  "shuffle": true,           // Randomize order
  "endless_mode": false      // Loop when finished
}
```

### Features

- All deck cards available
- Shuffle for variety
- Optional card limit
- Endless mode for continuous practice
- No pressure, no penalties

### Use Cases

**Learning New Deck:**
```
1. Create deck with 50 cards
2. Practice mode (20 cards, shuffled)
3. Review mode (start SRS for cards you know)
```

**Exam Prep (Short-term):**
```
1. Exam tomorrow
2. Practice mode (all cards, shuffle)
3. Focus on cards you miss
4. Repeat until confident
```

**Exploring Deck:**
```
1. Browse public deck
2. Practice mode to preview
3. Pin deck if useful
4. Start review mode for long-term learning
```

## 3. Exam Mode

**Purpose:** Simulate test conditions with time limits and comprehensive statistics.

### When to Use

- Mock exams
- Final preparation
- Assessing mastery
- Timed practice

### How It Works

1. Configure exam parameters
2. Timer starts
3. Answer all questions (no peeking!)
4. Submit when done or time expires
5. View comprehensive statistics

### Configuration Options

```json
{
  "time_limit_minutes": 30,
  "card_limit": 50,
  "card_types": ["multiple_choice", "short_answer"],  // Filter by type
  "shuffle": true
}
```

### Features

- Countdown timer
- No answer peeking during exam
- Auto-submit on timeout
- Detailed statistics on completion
- No SRS updates

### Statistics Provided

- Total questions
- Correct answers
- Accuracy percentage
- Time taken
- Average time per question
- Breakdown by card type
- Difficulty distribution

## Comparison Table

| Feature | Review | Practice | Exam |
|---------|--------|----------|------|
| **Card Selection** | Due only | All | Configurable |
| **Shuffle** | By due date | Optional | Optional |
| **Time Limit** | None | None | Optional |
| **Peeking Allowed** | Yes | Yes | No |
| **SRS Updates** | Yes | No | No |
| **Streak Update** | Yes | No | No |
| **Statistics** | Basic | Basic | Comprehensive |
| **Endless Mode** | No | Optional | No |

## Study Workflows

### Daily Learning Routine

```
1. Morning: Review mode (clear due cards, ~15 min)
2. Add new cards to deck (5-10 cards)
3. Evening: Practice mode (new cards, get familiar)
4. Next day: New cards appear in review queue
```

### Exam Preparation (2 Weeks Out)

```
Week 1:
- Create comprehensive deck
- Practice mode daily (all cards)
- Start review mode for difficult cards

Week 2:
- Review mode daily (maintain knowledge)
- Practice mode (focus weak areas)
- Exam mode (simulate test conditions)

Day Before:
- Final practice mode
- Final exam mode (timed)
- Light review mode (confidence boost)
```

### Long-term Learning (Language, etc.)

```
Daily:
- Review mode (due cards, 20-30 min)
- Add 10 new words/phrases

Weekly:
- Practice mode (random 50 cards)
- Review difficult cards separately

Monthly:
- Exam mode (assess progress)
- Adjust study strategy based on stats
```

## API Endpoints

**Create Session:**
```bash
POST /api/v1/study/sessions
{
  "deck_id": 1,
  "mode": "review",  # or "practice", "exam"
  "config": {
    "card_limit": 20,
    "shuffle": true,
    "time_limit_minutes": 30,  # exam only
    "endless_mode": false       # practice only
  }
}
```

**Get Next Card:**
```bash
GET /api/v1/study/sessions/{session_id}/next-card
```

**Submit Answer:**
```bash
POST /api/v1/study/sessions/{session_id}/answer
{
  "card_id": 123,
  "user_answer": "Paris",
  "quality": 4  # review mode only (0-5)
}
```

**Finish Session:**
```bash
POST /api/v1/study/sessions/{session_id}/finish
```

**Get Statistics:**
```bash
GET /api/v1/study/sessions/{session_id}/statistics
```

## Further Reading

- [Spaced Repetition](./spaced-repetition.md) - How review mode schedules cards
- [Card Types](./card-types.md) - Understanding different card types
- [Streak System](./streak-system.md) - How streaks are tracked
- [API Reference: Study Endpoints](../api/study-endpoints.md)
