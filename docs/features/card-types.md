# Card Types

Flash-Decks supports four different flashcard types, each optimized for different learning scenarios and question formats.

## Overview

| Type | Use Case | Auto-Grading | Complexity |
|------|----------|--------------|------------|
| Basic | Traditional flashcards | Manual | Simple |
| Multiple Choice | Quiz-style questions | Automatic | Simple |
| Short Answer | Free-text responses | Automatic | Medium |
| Cloze Deletion | Fill-in-the-blank | Automatic | Medium |

## 1. Basic Cards

**Description:** Traditional flashcards with a question on one side and answer on the other.

**Best For:**
- Definitions
- Simple facts
- Translations
- Concepts requiring explanation

**Example:**
- **Prompt:** "What is the capital of France?"
- **Answer:** "Paris"
- **Explanation:** "Paris is the largest city and capital of France, located in the north-central part of the country."

### Features

- Manual flip to reveal answer
- No automatic grading (relies on user honesty)
- Supports rich text formatting
- Optional explanation field

### When to Use

✅ **Use for:**
- Vocabulary (English ↔ Foreign Language)
- Historical dates and events
- Scientific definitions
- Math formulas

❌ **Avoid for:**
- Multiple options (use MCQ instead)
- Fill-in-the-blank (use cloze instead)

## 2. Multiple Choice Cards

**Description:** Questions with 4 answer options, only one correct.

**Best For:**
- Testing recognition over recall
- Standardized test prep
- Eliminating guessing
- Providing context through options

**Example:**
```json
{
  "type": "multiple_choice",
  "prompt": "What is the chemical symbol for gold?",
  "answer": "Au",
  "options": ["Au", "Ag", "Fe", "Cu"],
  "explanation": "Au comes from the Latin 'aurum' meaning gold."
}
```

### Features

- Automatic grading (exact match)
- Prevents pure guessing
- Shows correct answer after selection
- Highlights selected and correct options

### Creating Good MCQ Cards

**1. Write Clear Questions:**
- Avoid ambiguity
- Use specific language
- One concept per question

**2. Design Quality Distractors:**
- Plausible but incorrect
- Common misconceptions
- Similar to correct answer

**3. Randomize Order:**
- Don't always put correct answer in same position
- Flash-Decks shuffles automatically

**Example (Good):**
```
Q: Which planet is closest to the Sun?
A: Mercury
Options: [Mercury, Venus, Earth, Mars]
```

**Example (Bad):**
```
Q: What's that planet?
A: Mercury
Options: [Mercury, Apple, Car, Tuesday]  ← Nonsense distractors!
```

### Limitations

- Testing recognition, not recall
- Easier than free recall
- Can encourage guessing strategies
- Less effective for deep learning

## 3. Short Answer Cards

**Description:** Free-text input with automatic grading against correct answer(s).

**Best For:**
- Active recall
- Spelling practice
- Multi-answer questions
- Flexible grading

**Example:**
```json
{
  "type": "short_answer",
  "prompt": "Name a primary color",
  "answer": "red",
  "options": ["red", "blue", "yellow"],
  "explanation": "Primary colors are red, blue, and yellow."
}
```

### Features

- User types answer
- Case-insensitive matching
- Whitespace normalization
- Multiple acceptable answers via `options` field

### Auto-Grading Logic

```python
def check_short_answer(card, user_answer):
    normalized_user = user_answer.strip().lower()
    normalized_correct = card.answer.strip().lower()

    # Check primary answer
    if normalized_user == normalized_correct:
        return True

    # Check alternatives
    for acceptable in card.options or []:
        if normalized_user == acceptable.strip().lower():
            return True

    return False
```

### Multiple Acceptable Answers

Use the `options` field to specify alternatives:

**Example: Synonyms**
```json
{
  "prompt": "What do you call a baby dog?",
  "answer": "puppy",
  "options": ["puppy", "pup", "dog", "whelp"]
}
```

**Example: Spellings**
```json
{
  "prompt": "How do you spell the number 4?",
  "answer": "four",
  "options": ["four", "for"]
}
```

### Limitations

- Exact match only (no fuzzy matching)
- Can't handle word order variations
- Spelling must be exact
- No partial credit

### Tips for Creating

✅ **Do:**
- Keep answers short (1-3 words)
- Include common misspellings in options
- Use for unambiguous answers
- Test your alternatives

❌ **Don't:**
- Require long sentences
- Use for subjective answers
- Expect complex phrase matching
- Include articles (a, an, the) in answer

## 4. Cloze Deletion Cards

**Description:** Fill-in-the-blank style where users fill in missing words in context.

**Best For:**
- Learning in context
- Multiple facts from one sentence
- Language learning
- Completing patterns

**Example:**
```json
{
  "type": "cloze",
  "prompt": "The capital of {{c1::France}} is {{c2::Paris}}",
  "cloze_data": {
    "blanks": [
      {"answer": "France"},
      {"answer": "Paris"}
    ]
  }
}
```

### Creating Cloze Cards

**Syntax:** `{{c1::text}}` where text is the answer to hide

**Single Blank:**
```
The {{c1::mitochondria}} is the powerhouse of the cell.
```

**Multiple Blanks:**
```
{{c1::Albert Einstein}} developed the theory of {{c2::relativity}} in {{c3::1915}}.
```

### Features

- Multiple blanks per card
- Each blank graded independently
- Shows context around blanks
- Supports multiple answers per blank

### Multiple Answers Per Blank

```json
{
  "prompt": "I speak {{c1::English}}.",
  "cloze_data": {
    "blanks": [
      {"answer": ["English", "english", "Eng"]}
    ]
  }
}
```

### User Experience

**Display:**
```
The capital of ________ is ________.
```

**Input Fields:**
```
The capital of [France] is [Paris].
                 ^input^     ^input^
```

**Grading:**
- All blanks must be correct
- Case-insensitive
- Whitespace trimmed
- Shows correct answers if wrong

### Advanced Examples

**Language Learning:**
```
Je {{c1::suis}} étudiant. (I am a student)
```

**Math:**
```
The derivative of x² is {{c1::2x}}.
```

**History:**
```
World War II ended in {{c1::1945}} with the defeat of {{c2::Germany}} and {{c3::Japan}}.
```

### Limitations

- Can't handle complex grammar variations
- Fixed word order
- All-or-nothing grading
- Can be tedious to create

## Choosing the Right Card Type

### Decision Tree

```
Is it a single fact with a single answer?
├─ Yes → Basic Card
└─ No → Continue

Do you want users to actively recall without hints?
├─ Yes → Short Answer
└─ No → Continue

Are there multiple specific options?
├─ Yes → Multiple Choice
└─ No → Continue

Does it need surrounding context?
├─ Yes → Cloze
└─ No → Basic Card
```

### Comparison Table

| Feature | Basic | MCQ | Short Answer | Cloze |
|---------|-------|-----|--------------|-------|
| **Difficulty** | Medium | Easy | Hard | Medium |
| **Recall Type** | Free | Recognition | Free | Contextual |
| **Auto-Grade** | ❌ | ✅ | ✅ | ✅ |
| **Context** | Low | Low | Low | High |
| **Ambiguity** | Low | Very Low | Medium | Low |
| **Create Time** | Low | Medium | Low | Medium |

### Best Practices by Subject

**Languages:**
- Vocabulary: Basic or Short Answer
- Grammar rules: Cloze
- Verb conjugations: Cloze or MCQ

**Science:**
- Definitions: Basic
- Formulas: Cloze
- Concepts: MCQ
- Calculations: Short Answer

**History:**
- Dates: Basic or Short Answer
- Events: Basic with explanation
- Timelines: Cloze
- Causes/Effects: MCQ

**Programming:**
- Syntax: Cloze
- Concepts: Basic
- Output prediction: MCQ
- Code completion: Cloze

## Database Schema

All card types use the same table with type-specific fields:

```sql
CREATE TABLE cards (
    id SERIAL PRIMARY KEY,
    deck_id INTEGER NOT NULL,
    type card_type NOT NULL,  -- Enum: basic, multiple_choice, short_answer, cloze

    -- Universal fields
    prompt TEXT NOT NULL,
    answer TEXT NOT NULL,
    explanation TEXT,

    -- Type-specific JSON fields
    options JSONB,      -- MCQ: ["opt1", "opt2",...] OR Short Answer: ["alt1", "alt2",...]
    cloze_data JSONB    -- Cloze: {"blanks": [{"answer": "..."}, ...]}
);
```

## API Examples

**Create Basic Card:**
```bash
POST /api/v1/decks/1/cards
{
  "type": "basic",
  "prompt": "What is REST?",
  "answer": "Representational State Transfer",
  "explanation": "An architectural style for distributed systems"
}
```

**Create MCQ Card:**
```bash
POST /api/v1/decks/1/cards
{
  "type": "multiple_choice",
  "prompt": "Which HTTP method is idempotent?",
  "answer": "GET",
  "options": ["GET", "POST", "DELETE", "PATCH"],
  "explanation": "GET requests should not change server state"
}
```

**Create Short Answer Card:**
```bash
POST /api/v1/decks/1/cards
{
  "type": "short_answer",
  "prompt": "Capital of Japan?",
  "answer": "Tokyo",
  "options": ["Tokyo", "Tōkyō", "tokyo"],
  "explanation": "Tokyo is Japan's capital and largest city"
}
```

**Create Cloze Card:**
```bash
POST /api/v1/decks/1/cards
{
  "type": "cloze",
  "prompt": "Python was created by {{c1::Guido van Rossum}} in {{c2::1991}}.",
  "cloze_data": {
    "blanks": [
      {"answer": "Guido van Rossum"},
      {"answer": ["1991", "nineteen ninety-one"]}
    ]
  },
  "explanation": "Python emphasizes code readability"
}
```

## Frontend Components

### Flashcard Component

Adapts rendering based on card type:

```typescript
function Flashcard({ card, onAnswer }: Props) {
  switch (card.type) {
    case 'basic':
      return <BasicCard card={card} onFlip={handleFlip} />

    case 'multiple_choice':
      return <MultipleChoiceCard card={card} onSelect={handleSelect} />

    case 'short_answer':
      return <ShortAnswerCard card={card} onSubmit={handleSubmit} />

    case 'cloze':
      return <ClozeCard card={card} onSubmit={handleSubmit} />
  }
}
```

## Tips for Deck Creators

### General Principles

1. **Atomic Flashcards:** One fact per card
2. **Clear Questions:** No ambiguity
3. **Concise Answers:** Short and precise
4. **Add Context:** Use explanation field
5. **Mix Types:** Variety enhances engagement

### Quality Checklist

✅ Question is clear and unambiguous
✅ Answer is objectively correct
✅ Explanation adds value
✅ Card type matches content
✅ No typos or errors
✅ Difficulty appropriate for target audience

## Further Reading

- [Study Modes](./study-modes.md) - How to practice with different card types
- [Deck Management](./deck-management.md) - Creating and organizing cards
- [Spaced Repetition](./spaced-repetition.md) - How cards are scheduled
- [API Reference: Card Endpoints](../api/deck-endpoints.md#card-operations)
