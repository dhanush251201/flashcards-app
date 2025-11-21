# Flashcards Topic→Deck Generator – Model Card

## 1. Model Details

- **Model name:** Flashcards Topic–Deck Generator
- **Version:** v0.1
- **Owner:** Flashcards App Team (@dhanush251201)
- **Type:** Hosted instruction-tuned large language model (LLM) accessed via API
- **Provider:** External commercial LLM provider (e.g., GPT-4-class model)
- **Primary task:** Given a topic description, generate candidate flashcard Q/A pairs
- **Input format:** Short natural-language topic prompt (optionally with level, e.g. “beginner”)
- **Output format:** JSON / structured text list of `{question, answer}` pairs

---

## 2. Intended Use

### 2.1 Primary intended uses

This model is intended to:

- Help learners quickly **bootstrap** a deck of flashcards on a topic.
- Help instructors generate **draft** decks that they will manually review and edit.
- Support general education topics (STEM, languages, humanities) at roughly
  high-school to early undergraduate level.

### 2.2 Out-of-scope / misuse

The model **is not** intended for:

- Clinical, legal, financial, or safety-critical decision making.
- Generating advice that users follow without independent verification.
- Fully automated deployment of study material without human review.
- Use with users under 13 years old without parental/teacher oversight.

The app UI should clearly indicate that AI-generated cards are **drafts** and may contain errors.

---

## 3. Users and Use Context

- **Primary users:** Students, teachers, and self-learners using the Flashcards web app.
- **Usage environment:** Browser-based UI on desktop and mobile.
- **Assumed knowledge:**  
  Users have some familiarity with the topic and can:
  - Review generated cards,
  - Correct mistakes, and
  - Delete content that is not appropriate for their context.

---

## 4. Data

### 4.1 Training data (upstream provider)

- The underlying LLM is trained and maintained by the external provider.
- It is trained on a mixture of web data, licensed data, and/or human-created data.
- This project does **not** fine-tune or retrain the base model; it only uses
  prompt engineering and system prompts.

For full details on training data, see the provider’s own documentation.

### 4.2 Application-level data

Within the Flashcards app:

- **Inputs sent to the LLM:**
  - User topic text (and optional level / constraints).
  - System prompts that instruct the model to output flashcards in a strict format.
- **Outputs from the LLM:**
  - Candidate flashcard Q/A pairs.

**Logging and retention (as implemented in this project):**

- Requests and responses may be logged by the backend for:
  - Debugging errors,
  - Monitoring usage patterns (in aggregate).
- Logs should:
  - Be stored for a limited period (e.g., ≤ 30 days),
  - Avoid storing unnecessary personal identifiers where possible.

---

## 5. Evaluation

### 5.1 Evaluation setup

We evaluate generated decks on a small internal benchmark of topics such as:

- High-school mathematics,
- Introductory computer science,
- Language learning (e.g., English vocabulary).

For each topic:

1. Prompt the model to generate a deck.
2. Have human raters score each deck on:
   - **Coverage (0–5):** How well the cards cover key concepts.
   - **Correctness (0–5):** Are answers factually correct?
   - **Clarity (0–5):** Are questions and answers understandable and concise?

Optionally, compute:

- Average scores per domain,
- Inter-rater agreement (e.g., Cohen’s κ).

### 5.2 Current results (example placeholder)

> **Note:** Replace these with real numbers once you run your evaluation.

| Domain      | Coverage (avg) | Correctness (avg) | Clarity (avg) |
|------------|----------------|-------------------|---------------|
| Math       | 4.1            | 4.3               | 4.2           |
| CS         | 3.8            | 4.0               | 4.4           |
| Language   | 3.5            | 3.9               | 4.0           |
| Overall    | 3.8            | 4.1               | 4.2           |

---

## 6. Ethical & Safety Considerations

### 6.1 Hallucinations and factual errors

- The model may generate incorrect or misleading answers.
- Especially risky for:
  - Highly specialized domains,
  - Ambiguous or vague topics.

**Mitigations:**

- All AI-generated cards are labeled as **“AI draft”**.
- Users must explicitly confirm before adding them to a deck.
- Documentation and UI copy encourage users to fact-check content.

### 6.2 Harmful or biased content

- The model may generate content that is:
  - Biased, stereotypical, or offensive,
  - Inappropriate for younger users.

**Mitigations:**

- Use a safety-tuned model / safety settings when available.
- Apply an additional content filter (prompt-based and/or regex) to:
  - Block obviously harmful content,
  - Show an error when a response is rejected.

### 6.3 Privacy

- Prompts may inadvertently contain personal information (names, identifiers).
- These are sent to the LLM provider.

**Mitigations:**

- UI warns users not to include sensitive personal information in prompts.
- Backend can implement basic redaction for common PII patterns before logging.

---

## 7. Limitations & Recommendations

- Performs best for:
  - Well-scoped topics (“Introduction to linked lists”),
  - Moderate complexity.
- Struggles with:
  - Extremely niche or cutting-edge research topics,
  - Very long, multi-topic prompts.

**Recommendations:**

- Treat outputs as **drafts**, not finished study material.
- For critical learning (e.g., exams, professional certifications):
  - Use domain experts or trusted resources to verify content.
- Consider progressively refining prompts (e.g., specify level, number of cards).

---

## 8. Versioning & Maintenance

- **v0.1:**
  - Initial integration with provider’s LLM.
  - Basic prompt engineering to standardize card format.
- Future updates may change:
  - Model provider or model version,
  - Prompt templates,
  - Safety settings.

When you update any of the above, also update:

- This model card,
- The changelog section,
- Any evaluation results.

**Maintainers:**

- Technical: @dhanush251201  
- Issue tracking: GitHub Issues in this repository
