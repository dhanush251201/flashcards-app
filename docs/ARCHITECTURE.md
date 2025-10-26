# Flash-Decks Architecture Overview

## Frontend
- **Tech**: React 18 + TypeScript, Vite build, Tailwind CSS for styles, Zustand for auth state, React Query for data fetching/cache.
- **Structure**:
  - `src/components` reusable UI primitives (layout shell, deck cards, flashcard, navigation).
  - `src/pages` page-level views: landing, auth, dashboard, deck detail, study session.
  - `src/routes` route guards for authenticated/public flows.
  - `src/store` client state (auth tokens & user profile).
  - `src/lib` API client (Axios with token refresh), shared Day.js config.
- **Key UX**: modern glassmorphism aesthetic, dark/light toggle, responsive layout, keyboard hints, study controls (flip, grade).

## Backend
- **Tech**: FastAPI, SQLModel ORM, PostgreSQL, Alembic migrations, Loguru logging.
- **Structure**:
  - `app/core` configuration, security, structured logging.
  - `app/models` SQLModel entities separating enums, decks/cards/study metadata.
  - `app/schemas` Pydantic models for request/response typing.
  - `app/services` business logic (auth, deck management, study/SRS).
  - `app/api/routes` versioned routers for auth, users, decks, study.
  - `app/db` session management and startup init.
- **Domain highlights**:
  - JWT-based auth (access + refresh tokens) with password hashing via Passlib.
  - Deck CRUD with tagging, card management, due-count aggregation from SRS reviews.
  - Study service implements SM-2 spaced repetition update rules and session tracking.

## Database
See `alembic/versions/0001_initial.py` for canonical schema. Core tables: `users`, `decks`, `cards`, `tags`, `deck_tags`, `quiz_sessions`, `quiz_responses`, `srs_reviews`, `user_deck_progress`.

## Operations
- Alembic configured via `backend/alembic.ini` and `alembic/env.py`.
- Seed script `backend/scripts/seed.py` populates an admin + starter decks.
- Docker and compose stack (see `docker/` directory) orchestrate frontend, backend, postgres services.

