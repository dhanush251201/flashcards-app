# Spaced Repetition System (SM-2)

Flash-Decks implements the SM-2 (SuperMemo 2) spaced repetition algorithm to optimize learning and long-term retention by scheduling reviews at optimal intervals.

## Overview

**Algorithm:** SM-2 (SuperMemo 2)
**Purpose:** Schedule flashcard reviews based on memory strength
**Result:** See cards exactly when you're about to forget them
**Benefit:** Maximize retention, minimize study time

## What is Spaced Repetition?

Spaced repetition is a learning technique that involves reviewing information at increasing intervals over time. Research shows this method is far more effective than massed practice (cramming) for long-term retention.

**Key Principle:** Review items just before you're likely to forget them.

### The Forgetting Curve

Without review, we forget information exponentially:
- After 20 minutes: ~58% retention
- After 1 day: ~34% retention
- After 1 week: ~20% retention

Spaced repetition combats this by scheduling reviews at the optimal moment, strengthening memory and extending the forgetting curve.

## SM-2 Algorithm

SuperMemo 2 (SM-2), developed by Piotr Woźniak in 1987, remains one of the most popular spaced repetition algorithms.

### Algorithm Components

Each card has an SRS review state per user containing:

| Field | Description | Initial Value |
|-------|-------------|---------------|
| `repetitions` | Consecutive successful reviews | 0 |
| `interval_days` | Days until next review | 1 |
| `easiness` | Easiness factor (difficulty) | 2.5 |
| `due_at` | Next review date/time | Now |
| `last_quality` | Most recent quality rating | NULL |

### Quality Ratings

When reviewing a card, you rate your recall quality on a scale of 0-5:

| Quality | Description | Effect |
|---------|-------------|--------|
| **0** | Complete blackout, didn't remember at all | Reset to 1 day |
| **1** | Incorrect response, but recognized | Reset to 1 day |
| **2** | Incorrect, but almost got it | Reset to 1 day |
| **3** | Correct with serious difficulty | Increase interval moderately |
| **4** | Correct after hesitation | Increase interval significantly |
| **5** | Perfect recall, no hesitation | Increase interval maximally |

**Critical Threshold:** Quality 3 or higher = successful recall

### Algorithm Steps

```python
def apply_sm2(review, quality):
    """
    Apply SM-2 algorithm to update review state.

    Args:
        review: SRSReview object with current state
        quality: User's quality rating (0-5)
    """

    # Step 1: Check if recall was successful
    if quality < 3:
        # Failed recall - reset
        review.repetitions = 0
        review.interval_days = 1
    else:
        # Successful recall - increase interval
        if review.repetitions == 0:
            # First successful review
            review.interval_days = 1
            review.repetitions = 1
        elif review.repetitions == 1:
            # Second successful review
            review.interval_days = 6
            review.repetitions = 2
        else:
            # Subsequent reviews: multiply by easiness
            review.interval_days = round(review.interval_days * review.easiness)
            review.repetitions += 1

    # Step 2: Update easiness factor based on quality
    # Formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    review.easiness = max(
        1.3,  # Minimum easiness
        review.easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    )

    # Step 3: Calculate next due date
    review.due_at = now() + timedelta(days=review.interval_days)

    # Step 4: Record quality for history
    review.last_quality = quality
```

### Interval Progression Examples

**Perfect Recalls (Quality 5):**
```
Review 1: 1 day    (repetitions=1, EF=2.6)
Review 2: 6 days   (repetitions=2, EF=2.7)
Review 3: 16 days  (6 * 2.7 ≈ 16, repetitions=3, EF=2.8)
Review 4: 45 days  (16 * 2.8 = 44.8 ≈ 45)
Review 5: 126 days (45 * 2.8 = 126)
Review 6: 353 days (126 * 2.8 = 352.8)
```

**Mixed Quality:**
```
Review 1 (Q5): 1 day    (EF=2.6)
Review 2 (Q4): 6 days   (EF=2.6)
Review 3 (Q3): 15 days  (EF=2.46)
Review 4 (Q2): 1 day    (RESET! EF=2.06)
Review 5 (Q5): 1 day    (EF=2.16)
Review 6 (Q5): 6 days   (EF=2.26)
Review 7 (Q4): 13 days  (6 * 2.26 ≈ 13, EF=2.26)
```

**Difficulty Effect:**
- Cards you find easy: Easiness increases → longer intervals
- Cards you find hard: Easiness decreases → shorter intervals
- Cards you fail: Reset to 1 day, easiness penalty

## How It Works in Flash-Decks

### 1. Starting a Review Session

```
User clicks "Review" on a deck
↓
Backend queries srs_reviews:
  SELECT * FROM srs_reviews
  WHERE user_id = ?
    AND card_id IN (cards in this deck)
    AND due_at <= NOW()
  ORDER BY due_at ASC
↓
Returns cards that need review
```

### 2. Answering a Card

```
User sees card prompt
↓
User recalls answer
↓
User clicks "Show Answer"
↓
User grades quality (0-5)
↓
POST /study/sessions/{id}/answer
  {card_id: 123, quality: 4}
↓
Backend applies SM-2 algorithm
↓
Updates srs_reviews:
  - repetitions += 1
  - interval_days = calculated
  - easiness = adjusted
  - due_at = now + interval
↓
Returns next card
```

### 3. Tracking Progress

**Per-Card State:**
```sql
SELECT
  c.prompt,
  sr.repetitions,
  sr.interval_days,
  sr.easiness,
  sr.due_at
FROM cards c
JOIN srs_reviews sr ON sr.card_id = c.id
WHERE sr.user_id = 1
ORDER BY sr.due_at;
```

**Example Output:**
```
Prompt                      | Reps | Interval | Easiness | Due
--------------------------- | ---- | -------- | -------- | ---------
"What is 2+2?"             |  5   | 45       | 2.6      | 2024-12-15
"Capital of France?"       |  3   | 16       | 2.5      | 2024-11-20
"Spanish: Hello"           |  2   | 6        | 2.4      | 2024-11-10
"Define 'algorithm'"       |  1   | 1        | 2.2      | 2024-11-05
"Who wrote Hamlet?"        |  0   | 1        | 2.1      | 2024-11-05
```

### 4. Review Queue

**Due Today:**
Cards where `due_at <= NOW()`

**Coming Soon:**
Cards due in the next 7 days

**Mastered:**
Cards with `interval_days > 90`

## Database Schema

### srs_reviews Table

```sql
CREATE TABLE srs_reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    card_id INTEGER NOT NULL REFERENCES cards(id),

    -- SM-2 State
    repetitions INTEGER NOT NULL DEFAULT 0,
    interval_days INTEGER NOT NULL DEFAULT 1,
    easiness FLOAT NOT NULL DEFAULT 2.5,
    due_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_quality INTEGER,

    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, card_id)
);

CREATE INDEX idx_srs_user_due ON srs_reviews(user_id, due_at);
```

**Key Points:**
- One review record per user-card pair
- Each user has independent SRS state
- Composite index on `(user_id, due_at)` for fast review queue queries

## Best Practices

### For Optimal Learning

1. **Be Honest with Ratings**
   - Don't give yourself 5 if you hesitated
   - Use quality 3-4 most often
   - Quality 5 should be rare (truly perfect recall)

2. **Review Daily**
   - Clear your due cards every day
   - Consistency is key
   - Even 15 minutes/day is effective

3. **Don't Cram**
   - Trust the algorithm
   - Don't force-review cards that aren't due
   - Let intervals grow naturally

4. **Quality Over Quantity**
   - Better to review 20 cards well than 100 cards poorly
   - Take your time with each card
   - Use the explanation field for context

5. **Balance New and Review**
   - Prioritize due reviews over new cards
   - Add new cards gradually (10-20 per day)
   - Don't overwhelm yourself

### For Deck Creators

1. **One Concept Per Card**
   - Atomic flashcards are easier to grade
   - Multiple concepts → confusion

2. **Use Mnemonics**
   - Add memory aids in explanation field
   - Help users remember

3. **Start with Fundamentals**
   - Order cards by difficulty
   - Build knowledge progressively

4. **Test Both Directions**
   - "English → Spanish" AND "Spanish → English"
   - Strengthens bidirectional recall

## Statistics and Analytics

### Individual Card Statistics

```sql
-- Card difficulty analysis
SELECT
  c.prompt,
  sr.easiness,
  sr.repetitions,
  sr.last_quality,
  COUNT(qr.id) as total_attempts,
  AVG(qr.quality) as avg_quality
FROM cards c
JOIN srs_reviews sr ON sr.card_id = c.id
LEFT JOIN quiz_responses qr ON qr.card_id = c.id
WHERE sr.user_id = ?
GROUP BY c.id, sr.id
ORDER BY sr.easiness ASC;
```

### Deck-Level Statistics

```sql
-- Deck mastery overview
SELECT
  d.title,
  COUNT(DISTINCT c.id) as total_cards,
  COUNT(DISTINCT CASE WHEN sr.repetitions > 0 THEN c.id END) as reviewed_cards,
  COUNT(DISTINCT CASE WHEN sr.due_at <= NOW() THEN c.id END) as due_cards,
  AVG(sr.interval_days) as avg_interval,
  AVG(sr.easiness) as avg_easiness
FROM decks d
JOIN cards c ON c.deck_id = d.id
LEFT JOIN srs_reviews sr ON sr.card_id = c.id AND sr.user_id = ?
WHERE d.id = ?
GROUP BY d.id;
```

## Advantages of SM-2

**Proven Effectiveness:**
- Research-backed since 1987
- Used by millions in Anki, SuperMemo, etc.
- 90%+ retention with minimal reviews

**Adaptive:**
- Adjusts to individual card difficulty
- Personalized learning pace
- Easiness factor evolves with performance

**Efficient:**
- Optimizes review timing
- Reduces unnecessary repetition
- Focuses effort where needed

**Scalable:**
- Works with 10 cards or 10,000 cards
- Handles multiple subjects simultaneously

## Limitations and Considerations

**Not Perfect For:**
- Brand new information (use practice mode first)
- Procedural skills (needs deliberate practice)
- Complex topics (break into atomic cards)

**Common Pitfalls:**
- **Leeches:** Cards you always fail (consider rewriting)
- **Ease Hell:** Overly harsh grading → perpetually short intervals
- **Cramming Temptation:** Reviewing cards before due (counterproductive)

**Mitigation:**
- Review queue limits (don't overload)
- Identify and rewrite problem cards
- Trust the algorithm, resist urge to cram

## Advanced: Customizing the Algorithm

### Configuration Options (Future)

```typescript
interface SRSConfig {
  initialEasiness: number       // Default: 2.5
  minimumEasiness: number       // Default: 1.3
  easyBonus: number             // Multiplier for quality 5
  hardPenalty: number           // Penalty for quality 3
  failureResetInterval: number  // Days after failure (default: 1)
  graduationInterval: number    // Interval for rep 1→2 (default: 6)
}
```

### Alternative Algorithms

**FSRS (Free Spaced Repetition Scheduler):**
- Modern, machine learning-based
- Better predictions
- More parameters
- Future consideration

**Leitner System:**
- Simpler, box-based system
- Less granular
- Good for beginners

**SM-2 Variations:**
- SM-8, SM-15, SM-17 (SuperMemo evolutions)
- More complex
- Marginal gains

## Troubleshooting

### Cards Appearing Too Often

**Causes:**
- Consistently rating with quality 0-2
- Card is genuinely difficult
- Easiness factor very low

**Solutions:**
- Study the card more carefully
- Use explanation/mnemonics
- Consider rewriting the card
- Break complex cards into simpler ones

### Cards Appearing Too Rarely

**Causes:**
- Consistently rating with quality 5
- Card is too easy
- Intervals growing too fast

**Solutions:**
- Be more critical with ratings
- Use quality 4 instead of 5
- Add more challenging cards
- Consider removing trivial cards

### Review Queue Overwhelming

**Causes:**
- Added too many new cards at once
- Missed several days of reviews
- Studying multiple large decks

**Solutions:**
- Stop adding new cards temporarily
- Do partial reviews (e.g., 20/day)
- Spread decks across different times
- Consider suspending some decks

## Further Reading

- [Study Modes](./study-modes.md) - How to use review mode
- [Card Types](./card-types.md) - Creating effective cards
- [Backend Implementation](../architecture/backend-architecture.md#spaced-repetition-system-sm-2-algorithm) - Technical details
- [SuperMemo Algorithm](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2) - Original paper

---

**Remember:** Spaced repetition is a marathon, not a sprint. Consistency beats intensity. Review daily, trust the algorithm, and watch your long-term retention soar!
