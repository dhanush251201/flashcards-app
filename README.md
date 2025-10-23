# Flash‑Decks (working name)

A modern, full‑stack flashcard web app for learning and spaced repetition. This README consolidates the product spec and fills gaps so you can build an end‑to‑end MVP with a clear roadmap.

---

## 1) What is a flashcard application?

Flash‑Decks recreates the paper flashcard experience while adding scheduling, tracking, and analytics.

**Core behaviors**

* Users browse topics ("decks") and study via interactive cards.
* Cards present a **prompt** (question/front) and reveal an **answer** (back) with optional **explanation** on flip.
* Study modes include:

  * **Review (Spaced Repetition)**: algorithmically scheduled cards (SM‑2‑style).
  * **Practice (Random)**: shuffle through a deck for a chosen count or **Endless**.
  * **Exam (Timed)**: optional timer and scoring summary.
* Quiz sessions **autosave** progress and are **resumable**.

**Extras (nice UX)**

* "Floating/flip cards" animation for reveal.
* Keyboard shortcuts (space=flip, 1‑5=grade, arrows=next/prev).

---

## 2) Goals

* **MVP**: deck management, flashcard delivery, spaced repetition, and user tracking.
* **Stretch**: AI‑generated cards, document ingestion, open‑ended grading, agent workflows, interactive visual cards.

---

## 3) Architecture Overview

Choose one of the suggested stacks. Defaults are provided for speed; feel free to swap with equivalents.

* **Frontend**: React (Vite) + TypeScript + **Tailwind CSS**; state via React Query/Zustand; routing via React Router. Optional UI kit: shadcn/ui or Headless UI for accessible primitives.
* **Backend**: Python + FastAPI (official choice for this project).
* **Database**: Postgres (preferred) or SQLite for local/dev.
* **ORM**: SQLModel/SQLAlchemy with Alembic migrations.
* **Auth**: JWT (HTTP‑only cookies) + refresh tokens.
* **Testing**: pytest (unit), httpx/pytest-asyncio (API), Playwright/Cypress (E2E); CI via GitHub Actions.
* **Observability**: OpenTelemetry traces, structured logs (loguru), Prometheus metrics + Grafana.

### Suggested repo layout (monorepo)

```
flash-decks/
  frontend/         # React app (Vite + TS)
  backend/          # Express (TS) or FastAPI service
  docker/           # Dockerfiles, docker-compose.yml, env templates
  .github/
    workflows/      # CI pipelines
```

---

## 4) Core Features (MVP)

### 4.1 Deck Management

* Create, edit, organize decks (built‑in and user‑created).
* Cards support types: `multiple_choice`, `short_answer`, `cloze` (optional), with `options[]` for MCQ.
* Tags/categories for discoverability (e.g., `Algebra`, `Biology`).

### 4.2 Flashcard Delivery

* Present a question; on submit or flip, reveal the answer + explanation.
* For MCQ: immediate correctness; for free text: user self‑grades (buttons 1‑5) in MVP.

### 4.3 Spaced Repetition (SM‑2 lite)

Store per‑user, per‑card scheduling fields:

* `repetitions (n)`, `interval (I)`, `easiness (E)`, `due_at`, `last_quality (Q in 0..5)`
* **Update rules (simplified SM‑2)**:

  * If `Q < 3`: `n = 0`, `I = 1` (due tomorrow)
  * Else if `n = 0`: `n = 1`, `I = 1`
  * Else if `n = 1`: `n = 2`, `I = 6`
  * Else: `I = round(I * E)`
  * `E = max(1.3, E + (0.1 - (5 - Q) * (0.08 + (5 - Q) * 0.02)))`
  * `due_at = now + I days`

### 4.4 User Tracking

* Persist correctness, timestamps, and session summaries.
* Progress by deck (completed %, last studied, streak).

---

## 5) Stretch Features (Roadmap)

* **LLM‑Generated Questions**: APIs (OpenAI/Anthropic) or local (Ollama) to propose new cards.
* **Document Preprocessing**: Parse PDFs/slides to seed question candidates.
* **Interactive Cards**: visualizations (e.g., graph traversals, animations).
* **Freeform Grading**: LLM evaluation of open‑ended responses.
* **Agent Frameworks**: integrations (LangChain, DSpy, Kani) for workflows (e.g., syllabus → deck → spaced plan).
* **PWA Offline Mode**: study offline; sync later.
* **Mobile‑first polish** and theming (dark/light).

---

## 6) UI & Pages

### 6.1 Landing (public)

* Elevator pitch, screenshots, CTA buttons **Sign up** / **Log in**.

### 6.2 Auth

* **Signup**: email + strong password; password strength meter; on success → Dashboard.
* **Login**: on success → Dashboard; on failure → inline error.
* Session via HTTP‑only cookie; inactivity timeout (e.g., 30 min), refresh token (e.g., 7 days).

### 6.3 Dashboard (authenticated)

* Header: app name (renameable), search bar (deck title/tags), user profile menu.
* Left nav: **All Decks**, **My Decks**, **Reviews (Due)**, **Pinned**.
* Widgets:

  * **Due Today** (count + quick start), **Recent Sessions**, **Streak**, **Completion %** per deck.
  * **Study Heatmap** (git‑style): intensity = #cards reviewed per day.
  * **Recommendations**: due decks first; then in‑progress.
  * **Pinned Decks**; **Add Custom Deck** button.

### 6.4 Decks Listing

* Cards show title, tags, progress chip: ✅ if complete; else `% complete`.
* Filters: tags, completion, difficulty; sort by last studied/alpha.

### 6.5 Deck Detail

* Description, counts (new/learning/review).
* Actions: **Start Review** (SRS), **Practice** (pick N or Endless), **Exam** (optional).

### 6.6 Quiz / Study Session

* Card prompt on front; options or input; **Submit → Flip** shows answer + explanation.
* Progress bar: answered vs remaining.
* Wrong answers can re‑enter the queue within session (practice/exam); in **Review** mode, grading 0‑5 updates schedule.
* **Autosave**; **Resume** from Dashboard → Recent Sessions.
* Keyboard shortcuts: space=flip, arrows=navigate, 1..5=grade.

### 6.7 User Settings

* View email, registration date; change password; delete account (confirmation flow).

### 6.8 Admin (RBAC: `ADMIN`)

* Metrics: DAU/WAU, reviews/day, avg Q‑score, deck health, error rates.
* Observability links (Grafana, logs). CRUD on built‑in decks.

---

## 7) Data Model (SQL, indicative)

```
users(id, email UNIQUE, password_hash, role DEFAULT 'USER', created_at)
auth_tokens(id, user_id FK, token_hash, type ['refresh'], expires_at, created_at)

decks(id, title, description, owner_user_id NULLABLE, is_public, created_at)
cards(id, deck_id FK, type, prompt, answer, explanation, options_json, created_at)

tags(id, name UNIQUE)
deck_tags(deck_id FK, tag_id FK)

user_deck_progress(user_id FK, deck_id FK, percent_complete, last_studied_at, pinned BOOLEAN)

quiz_sessions(id, user_id FK, deck_id FK, mode ['review','practice','exam'], status ['active','completed'],
              started_at, ended_at, config_json)
quiz_responses(id, session_id FK, card_id FK, user_answer, is_correct, quality INT NULL, responded_at)

srs_reviews(user_id FK, card_id FK, repetitions INT, interval_days INT, easiness REAL,
            due_at TIMESTAMP, last_quality INT, updated_at)

events(id, user_id FK, event_type, payload_json, created_at)
```

**Notes**

* Built‑in decks have `owner_user_id = NULL`. Custom decks belong to a user.
* `srs_reviews` holds SM‑2 scheduling state per user‑card.
* `quiz_responses.quality` used in Review mode (SM‑2 Q 0..5).

---

## 8) API Contract (MVP, FastAPI endpoints)

**Auth**

* `POST /auth/signup {email, password}` → 201; sets cookie
* `POST /auth/login {email, password}` → 200; sets cookie
* `POST /auth/logout` → 204
* `POST /auth/refresh` → 200; rotates refresh token

**Decks & Cards**

* `GET /decks?tag=&q=` → list
* `GET /decks/{id}` → detail + counts
* `POST /decks` (user for custom; admin for built‑in)
* `PUT /decks/{id}` (owner/admin)
* `DELETE /decks/{id}` (owner/admin)
* `POST /decks/{id}/cards` (owner/admin)
* `PUT /cards/{id}`, `DELETE /cards/{id}`

**Study & Review**

* `POST /study/sessions {deckId, mode, config}` → creates session
* `GET /study/sessions/{id}` → session state
* `POST /study/sessions/{id}/answer {cardId, userAnswer, quality?}` → records response
* `POST /study/sessions/{id}/finish` → marks complete
* `GET /reviews/due` → next due cards across decks

**User**

* `GET /me` → profile
* `PUT /me/password` → change password
* `DELETE /me` → delete account
* `PUT /me/decks/{id}/pin` → pin/unpin deck

**Admin** (RBAC: ADMIN)

* `GET /admin/metrics` (aggregated KPIs)
* `GET /admin/logs` (if exposed)

---

## 9) Security, Sessions & RBAC

* **Passwords**: Argon2id (or bcrypt) with per‑user salt.
* **Sessions**: short‑lived access JWT in HTTP‑only, `Secure`, `SameSite=Lax` cookie; refresh token rotation (DB‑backed allowlist); inactivity timeout ~30m.
* **RBAC**: roles `USER`, `ADMIN`; authorize per route.
* **CSRF**: double‑submit token or `SameSite` cookies + CSRF header for state‑changing requests.
* **CORS**: allow configured origins only.
* **Rate Limits**: login/signup IP & user throttles.
* **Audit**: log auth events; store minimal PII.

---

## 10) Analytics & Observability (Admin)

* **Metrics**: reviews per day, average quality, retention, time‑to‑first‑answer, error rates, p95 latency.
* **Tracing**: request spans; database timings.
* **Logging**: structured (JSON) with request IDs; redact sensitive fields.

---

## 11) UX Details

* **Flip Animation** (“floating cards”).
* **Progress Indicators** per session.
* **Autosave & Resume**: local buffer + server sync on each answer.
* **Accessibility**: semantic HTML, focus states, ARIA for flip, WCAG 2.1 AA contrast.
* **i18n**: extraction‑ready strings (future).

---

## 11a) Styling (Tailwind CSS)

* **Setup**: Tailwind is configured in `frontend/tailwind.config.ts` and `postcss.config.js`; styles entry at `frontend/src/index.css` with `@tailwind base; @tailwind components; @tailwind utilities;`.
* **Design system**: Use utility classes for layout/spacing/typography; extract shared patterns via small components (e.g., `Card`, `Button`). Prefer semantic HTML + utility classes over deep custom CSS.
* **Components**: Consider shadcn/ui for primitives (Dialog, Tabs, Dropdown) and compose with Tailwind utilities.
* **Theming**: Support dark/light via `class` strategy; define CSS variables in `:root` and `.dark` in `tailwind.config

### With Docker Compose (recommended)

1. `cp .env.example .env` in `backend` and `frontend`.
2. `docker compose -f docker/docker-compose.yml up --build`.
3. Visit `http://localhost:5173` (web) and `http://localhost:8000` (api).

### Without Docker

1. **Database**: start Postgres (or SQLite for dev) and set `DATABASE_URL`.
2. **API (FastAPI)**:

   * `cd backend`
   * `cp .env.example .env` and set `DATABASE_URL`, `JWT_SECRET`, `REFRESH_SECRET`.
   * Create venv and install deps:

     * macOS/Linux: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
     * Windows (PowerShell): `python -m venv .venv; .venv\Scripts\Activate.ps1; pip install -r requirements.txt`
   * Run migrations: `alembic upgrade head`
   * Start API: `uvicorn app.main:app --reload --port 8000`
3. **Web (React)**:

   * `cd frontend`
   * `npm i && npm run dev`

Seed data (optional): `python scripts/seed.py` in `backend`.
