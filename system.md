# Flashcards App – AI System Card

_Last updated: 2025-11-20_

---

## 1. System Overview

The Flashcards App is a web application that helps learners create, organize,
and review digital flashcards. It includes:

- Traditional features for decks and cards (create, edit, delete),
- A review interface (e.g., “show answer”, mark as known/unknown),
- An AI-powered feature that generates **draft flashcards from a topic**
  using a hosted LLM.

**Goal:**  
Reduce the time it takes to create good flashcards, while keeping users in full
control over final content.

---

## 2. Architecture & Components

### 2.1 High-level components

- **Frontend:**  
  - Single-page web app (e.g., React + Tailwind CSS).
  - Renders decks, cards, and review views.
  - Provides UI for “Generate with AI” topic input and review screen.

- **Backend API:**  
  - Handles auth (if enabled) and session management.
  - Manages CRUD operations for decks and cards.
  - Exposes an endpoint like `/api/generate-deck` that:
    - Validates the user’s topic input,
    - Calls the external LLM provider,
    - Validates and filters the response.

- **Data store:**  
  - LocalStorage / IndexedDB for anonymous/guest users, and/or
  - A managed database (e.g., PostgreSQL) for registered users.

- **External services:**  
  - LLM provider API for deck generation.
  - Optional analytics (e.g., basic usage metrics).

### 2.2 AI feature data flow

1. User enters a topic in the AI generation dialog.
2. Frontend sends topic (and optional parameters like difficulty) to the backend.
3. Backend constructs a prompt and sends it to the LLM provider.
4. Backend receives the response, parses it, and:
   - Ensures it conforms to the expected format,
   - Applies basic safety checks / filters.
5. Backend returns candidate Q/A cards to the frontend.
6. Frontend shows AI-generated cards in a “draft” panel.
7. User reviews, edits, and explicitly chooses which cards to save into a deck.

No cards are saved automatically without user action.

---

## 3. Intended Use & Out-of-Scope

### 3.1 Intended use

The system is designed to:

- Help learners and educators build flashcard decks more quickly.
- Support general educational topics at non-critical stakes.
- Allow users to:
  - Organize content into decks,
  - Study through repeated review.

### 3.2 Out-of-scope use

The system is **not intended** for:

- Clinical, legal, financial, or safety-critical decision support.
- Automatically grading users or making high-stakes decisions about them.
- Use by unsupervised minors in sensitive content areas.

The UI and documentation should clearly communicate:

> “AI-generated content may be wrong or incomplete. Always review and edit cards before studying.”

---

## 4. Data Flows & Retention

### 4.1 User data

- **Decks and cards:**  
  - Stored locally (for guests) or in the backend database (for signed-in users).
  - Access is restricted to the owning user account.

- **Auth data (if implemented):**  
  - Basic user profile and credentials.
  - Stored securely in the backend or delegated to an auth provider.

### 4.2 AI-related data

- **Prompts sent to LLM:**
  - Topic text and context (e.g., desired difficulty or number of cards).
- **LLM responses:**
  - Structured text for candidate cards.

**Retention and logging (recommended):**

- Keep minimal logs necessary for:
  - Debugging (e.g., errors, latency issues),
  - Aggregate analytics (e.g., number of generations per day).
- Avoid logging full prompts/responses when not needed, or:
  - Store them for a short time window (e.g., ≤ 30 days),
  - Redact obvious personal identifiers where possible.

---

## 5. Safety & Security Measures

### 5.1 Content safety

Risks:

- Incorrect or misleading content,
- Harmful or offensive language,
- Biased or discriminatory statements.

Mitigations:

- Use safety settings / safety-tuned variants of the LLM when available.
- Wrap AI calls with an additional “safety filter”:
  - Prompt the model to avoid disallowed content,
  - Optionally post-process output with simple checks (e.g., profanity filters).
- If content is flagged:
  - Show an error message,
  - Do not display or save the generated cards.

### 5.2 User experience guardrails

- AI-generated cards:
  - Are clearly flagged as **“AI Draft”**.
  - Are displayed separately from existing cards.
  - Require explicit user acceptance before being added to a deck.
- For risky-looking topics (e.g., containing certain keywords):
  - Show an extra warning that the model is not a domain expert.

### 5.3 Security

- All traffic is served over **HTTPS**.
- Backend enforces:
  - Rate limiting for `/api/generate-deck`,
  - Maximum request and response sizes.
- API keys and secrets:
  - Stored server-side (e.g., environment variables),
  - Never exposed to the frontend.
- Standard protections (CSRF, XSS, etc.) should be applied in the web app and API.

---

## 6. Evaluation & Monitoring

### 6.1 Offline evaluation

- Refer to the **Model Card** for details on:
  - Benchmarks (topics),
  - Human-rated coverage, correctness, and clarity.

### 6.2 Online monitoring (recommended)

Track, in aggregate:

- Number of AI generation requests and error rates.
- Average edit distance or manual edits before saving cards (if implemented).
- Frequency and categories of safety filter blocks.
- User reports of problematic cards.

Use this information to:

- Identify domains where the AI performs poorly,
- Improve prompts and filters,
- Update documentation and warnings.

---

## 7. Known Limitations & Open Questions

### 7.1 Known limitations

- Generated cards may:
  - Omit important subtopics,
  - Over-simplify complex concepts,
  - Occasionally contain harmful or biased content.
- Evaluation primarily focuses on English-language prompts and content.
- No formal guarantees of completeness, correctness, or neutrality.

### 7.2 Open questions / future work

- Better support and evaluation for non-English topics.
- Richer user feedback signals (e.g., rating or flagging individual cards).
- More systematic tracking of where AI-generated cards are used and how effective they are.
- Improved detection of partially-correct but misleading content.

---

## 8. Incident Response & Contact

If users encounter severely harmful, offensive, or dangerously incorrect content:

1. They can use a **“Report card”** or **“Report deck”** feature (recommended).
2. The system logs:
   - The reported text (with user consent),
   - Timestamp,
   - Anonymized or pseudonymous user ID.
3. Maintainers review incidents and:
   - Adjust prompts and filters,
   - Possibly block certain topics,
   - Update the model and system cards to reflect new limitations.

**Contact channels:**

- GitHub Issues in this repository.
- Maintainer email (if you choose to publish one).

---

## 9. Changelog

- **2025-11-20 (v0.1):**
  - Initial system card covering architecture, data flows, safety, and evaluation.
