# Database Schema

Flash-Decks uses a PostgreSQL relational database with a well-normalized schema designed for data integrity, query performance, and scalability.

## Table of Contents

- [Overview](#overview)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Tables](#tables)
- [Relationships](#relationships)
- [Indexes](#indexes)
- [Constraints](#constraints)
- [Enums](#enums)
- [Schema Migrations](#schema-migrations)

## Overview

**Database:** PostgreSQL 15+
**ORM:** SQLModel (built on SQLAlchemy 2.0)
**Migrations:** Alembic
**Total Tables:** 8 core tables

### Design Principles

1. **Normalization**: 3NF (Third Normal Form) to minimize redundancy
2. **Referential Integrity**: Foreign keys with appropriate cascade rules
3. **Indexing**: Strategic indexes for common query patterns
4. **Timestamps**: Audit trail with `created_at` and `updated_at`
5. **Soft Deletes**: Where appropriate (currently hard deletes with cascades)
6. **JSON Flexibility**: JSON columns for semi-structured data

## Entity Relationship Diagram

```
┌──────────────┐
│    users     │
│──────────────│
│ id (PK)      │◄────────┐
│ email        │         │
│ password     │         │
│ role         │         │
│ streak data  │         │
└──────────────┘         │
       │                 │
       │ owns            │ studies
       │                 │
       ▼                 │
┌──────────────┐         │
│    decks     │         │
│──────────────│         │
│ id (PK)      │◄────┐   │
│ title        │     │   │
│ owner_id(FK) │     │   │
│ is_public    │     │   │
└──────────────┘     │   │
       │             │   │
       │ contains    │   │
       │             │   │
       ▼             │   │
┌──────────────┐     │   │
│    cards     │     │   │
│──────────────│     │   │
│ id (PK)      │◄──┐ │   │
│ deck_id (FK) │   │ │   │
│ type         │   │ │   │
│ prompt       │   │ │   │
│ answer       │   │ │   │
│ options      │   │ │   │
└──────────────┘   │ │   │
       │           │ │   │
       │           │ │   │
       │           │ │   │
       ▼           │ │   │
┌───────────────┐  │ │   │
│  srs_reviews  │  │ │   │
│───────────────│  │ │   │
│ id (PK)       │  │ │   │
│ user_id (FK)  ├──┼─┼───┘
│ card_id (FK)  ├──┘ │
│ interval_days │    │
│ easiness      │    │
│ due_at        │    │
└───────────────┘    │
                     │
┌───────────────────┐│
│  quiz_sessions    ││
│───────────────────││
│ id (PK)           ││
│ user_id (FK)      ├┘
│ deck_id (FK)      ├──┐
│ mode              │  │
│ status            │  │
│ started_at        │  │
└───────────────────┘  │
       │               │
       │ contains      │
       │               │
       ▼               │
┌───────────────────┐  │
│  quiz_responses   │  │
│───────────────────│  │
│ id (PK)           │  │
│ session_id (FK)   │  │
│ card_id (FK)      │  │
│ user_answer       │  │
│ is_correct        │  │
│ quality           │  │
└───────────────────┘  │
                       │
┌───────────────────┐  │
│ user_deck_progress│  │
│───────────────────│  │
│ id (PK)           │  │
│ user_id (FK)      │  │
│ deck_id (FK)      ├──┘
│ percent_complete  │
│ pinned            │
│ last_studied_at   │
└───────────────────┘

┌──────────────┐       ┌──────────────┐
│     tags     │◄─────►│  deck_tags   │
│──────────────│       │──────────────│
│ id (PK)      │       │ deck_id (FK) │
│ name (unique)│       │ tag_id (FK)  │
└──────────────┘       └──────────────┘
                              ▲
                              │
                              │
                       (from decks)
```

## Tables

### 1. users

Stores user accounts and authentication information.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(320) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role user_role NOT NULL DEFAULT 'USER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Streak tracking
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date DATE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ix_users_email ON users(email);
```

**Columns:**
- `id`: Primary key, auto-incrementing
- `email`: Unique email address for login (max 320 chars per RFC 5321)
- `hashed_password`: Argon2 hashed password (never store plaintext!)
- `full_name`: User's display name (optional)
- `role`: USER or ADMIN (see [Enums](#enums))
- `is_active`: Account status (for soft banning)
- `current_streak`: Consecutive days with study activity
- `longest_streak`: Personal best streak
- `last_activity_date`: Date of last study session
- `created_at`: Account creation timestamp
- `updated_at`: Last modification timestamp (auto-updated)

**Relationships:**
- One-to-many with `decks` (owns)
- One-to-many with `quiz_sessions` (participates in)
- One-to-many with `srs_reviews` (has per-card SRS state)
- One-to-many with `user_deck_progress` (tracks progress)

### 2. decks

Stores flashcard deck metadata.

```sql
CREATE TABLE decks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    metadata_json JSONB,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_decks_title ON decks(title);
CREATE INDEX ix_decks_owner_user_id ON decks(owner_user_id);
```

**Columns:**
- `id`: Primary key
- `title`: Deck name (indexed for search)
- `description`: Optional long description
- `is_public`: Visibility (true = anyone can see/study, false = owner only)
- `owner_user_id`: Creator of deck (SET NULL on user deletion to preserve deck)
- `metadata_json`: Flexible JSON field for future extensions (e.g., difficulty, category, cover image)
- `created_at`: Creation timestamp
- `updated_at`: Last modification timestamp

**Relationships:**
- Many-to-one with `users` (owned by)
- One-to-many with `cards` (contains)
- Many-to-many with `tags` (categorized by)
- One-to-many with `quiz_sessions` (used in)
- One-to-many with `user_deck_progress` (tracked by users)

### 3. tags

Stores reusable tag labels for deck categorization.

```sql
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE
);

CREATE UNIQUE INDEX ix_tags_name ON tags(name);
```

**Columns:**
- `id`: Primary key
- `name`: Unique tag name (e.g., "spanish", "programming", "medical")

**Relationships:**
- Many-to-many with `decks` via `deck_tags`

**Design Note:** Tags are created on-demand when users tag decks. Same tag is reused across multiple decks for consistency.

### 4. deck_tags (Junction Table)

Links decks with tags (many-to-many relationship).

```sql
CREATE TABLE deck_tags (
    deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (deck_id, tag_id)
);
```

**Columns:**
- `deck_id`: Foreign key to decks
- `tag_id`: Foreign key to tags
- Composite primary key ensures unique deck-tag pairs

**Cascade Rules:**
- Deleting a deck removes all its tag associations
- Deleting a tag removes it from all decks (rare, admin operation)

### 5. cards

Stores individual flashcard content.

```sql
CREATE TABLE cards (
    id SERIAL PRIMARY KEY,
    deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    type card_type NOT NULL DEFAULT 'basic',
    prompt TEXT NOT NULL,
    answer TEXT NOT NULL,
    explanation TEXT,
    options JSONB,
    cloze_data JSONB,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_cards_deck_id ON cards(deck_id);
```

**Columns:**
- `id`: Primary key
- `deck_id`: Parent deck (CASCADE delete - removing deck removes all cards)
- `type`: Card type enum (basic, multiple_choice, short_answer, cloze)
- `prompt`: Question or front of card
- `answer`: Correct answer or back of card
- `explanation`: Optional detailed explanation
- `options`: JSON array for multiple choice options or short answer acceptable answers
  ```json
  ["Option A", "Option B", "Option C", "Option D"]
  ```
- `cloze_data`: JSON for cloze deletion structure
  ```json
  {
    "blanks": [
      {"answer": "Paris"},
      {"answer": ["Art", "Fashion", "Culture"]}
    ]
  }
  ```

**Card Type Details:**

| Type | Uses prompt | Uses answer | Uses options | Uses cloze_data |
|------|-------------|-------------|--------------|-----------------|
| basic | ✓ Question | ✓ Answer | ✗ | ✗ |
| multiple_choice | ✓ Question | ✓ Correct option | ✓ All options | ✗ |
| short_answer | ✓ Question | ✓ Primary answer | ✓ Alternatives | ✗ |
| cloze | ✓ Text with {{c1::blank}} | ✓ (unused) | ✗ | ✓ Blank answers |

**Relationships:**
- Many-to-one with `decks`
- One-to-many with `quiz_responses` (answered in sessions)
- One-to-many with `srs_reviews` (per-user SRS state)

### 6. quiz_sessions

Tracks study sessions.

```sql
CREATE TABLE quiz_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    mode quiz_mode NOT NULL,
    status quiz_status NOT NULL DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    config JSONB
);

CREATE INDEX ix_quiz_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX ix_quiz_sessions_deck_id ON quiz_sessions(deck_id);
```

**Columns:**
- `id`: Primary key
- `user_id`: User participating in session
- `deck_id`: Deck being studied
- `mode`: Session type (review, practice, exam)
- `status`: active or completed
- `started_at`: Session start time
- `ended_at`: Session completion time (NULL while active)
- `config`: JSON for session-specific settings
  ```json
  {
    "card_limit": 20,
    "shuffle": true,
    "time_limit_minutes": 30,
    "endless_mode": false
  }
  ```

**Mode Differences:**
- **review**: Uses SRS algorithm, shows only due cards, requires quality grading
- **practice**: All deck cards, shuffled, no SRS updates
- **exam**: Timed, no peeking, complete statistics at end

**Relationships:**
- Many-to-one with `users`
- Many-to-one with `decks`
- One-to-many with `quiz_responses` (answers during session)

### 7. quiz_responses

Records individual card answers within a session.

```sql
CREATE TABLE quiz_responses (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    user_answer TEXT,
    is_correct BOOLEAN,
    quality INTEGER,
    responded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_quiz_responses_session_id ON quiz_responses(session_id);
CREATE INDEX ix_quiz_responses_card_id ON quiz_responses(card_id);
```

**Columns:**
- `id`: Primary key
- `session_id`: Parent study session
- `card_id`: Card being answered
- `user_answer`: User's response (text for short answer, JSON for cloze, option text for MCQ)
- `is_correct`: Auto-graded result (NULL for basic cards - manual grading)
- `quality`: SM-2 quality rating (0-5, only used in review mode)
  - 0: Complete blackout
  - 1: Incorrect, but familiar
  - 2: Incorrect, but almost
  - 3: Correct with difficulty
  - 4: Correct with some hesitation
  - 5: Perfect recall
- `responded_at`: Answer timestamp

**Relationships:**
- Many-to-one with `quiz_sessions`
- Many-to-one with `cards`

### 8. srs_reviews

Stores per-user, per-card spaced repetition state (SM-2 algorithm).

```sql
CREATE TABLE srs_reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    repetitions INTEGER NOT NULL DEFAULT 0,
    interval_days INTEGER NOT NULL DEFAULT 1,
    easiness FLOAT NOT NULL DEFAULT 2.5,
    due_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_quality INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_review_user_card UNIQUE (user_id, card_id)
);

CREATE INDEX ix_srs_reviews_user_id ON srs_reviews(user_id);
CREATE INDEX ix_srs_reviews_card_id ON srs_reviews(card_id);
CREATE INDEX ix_srs_reviews_user_due ON srs_reviews(user_id, due_at);
```

**Columns:**
- `id`: Primary key
- `user_id`: User studying the card
- `card_id`: Card being reviewed
- `repetitions`: Number of successful recalls in sequence
- `interval_days`: Days until next review
- `easiness`: Easiness factor (1.3 to 2.5+), affects interval growth
- `due_at`: Next review date/time
- `last_quality`: Most recent quality rating (0-5)
- `updated_at`: Last review timestamp

**SM-2 Algorithm Fields:**
- Initial: `repetitions=0`, `interval=1`, `easiness=2.5`, `due_at=now`
- After quality < 3: Reset to initial (failed recall)
- After quality >= 3:
  - rep 0→1: interval=1 day
  - rep 1→2: interval=6 days
  - rep 2+: interval = previous_interval × easiness
  - Adjust easiness: EF' = EF + (0.1 - (5 - q) × (0.08 + (5 - q) × 0.02))

**Constraints:**
- `uq_review_user_card`: One review record per user-card pair
- Each user has independent SRS state for each card

**Query Pattern:**
```sql
-- Get due cards for user 123
SELECT c.* FROM cards c
JOIN srs_reviews sr ON sr.card_id = c.id
WHERE sr.user_id = 123
  AND sr.due_at <= NOW()
ORDER BY sr.due_at ASC;
```

### 9. user_deck_progress

Tracks user progress through each deck.

```sql
CREATE TABLE user_deck_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    percent_complete FLOAT NOT NULL DEFAULT 0,
    last_studied_at TIMESTAMP WITH TIME ZONE,
    streak INTEGER NOT NULL DEFAULT 0,
    pinned BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_deck UNIQUE (user_id, deck_id)
);

CREATE INDEX ix_user_deck_progress_user_id ON user_deck_progress(user_id);
CREATE INDEX ix_user_deck_progress_deck_id ON user_deck_progress(deck_id);
```

**Columns:**
- `id`: Primary key
- `user_id`: User tracking progress
- `deck_id`: Deck being tracked
- `percent_complete`: Progress percentage (0-100)
  - Calculated as: (cards reviewed at least once) / (total cards) × 100
- `last_studied_at`: Most recent study session timestamp
- `streak`: Consecutive days studying this deck (deck-specific, different from user streak)
- `pinned`: User favorited this deck for quick access
- `created_at`: First interaction with deck
- `updated_at`: Last progress update

**Constraints:**
- `uq_user_deck`: One progress record per user-deck pair

**Usage:**
- Dashboard shows "Continue studying" based on `last_studied_at`
- Progress bars use `percent_complete`
- Pinned decks shown in "Favorites" section

## Relationships

### Foreign Key Cascade Rules

| Parent → Child | On Delete | Rationale |
|----------------|-----------|-----------|
| users → decks | SET NULL | Preserve decks even if owner deleted (orphaned) |
| users → quiz_sessions | CASCADE | Remove user's session history |
| users → srs_reviews | CASCADE | Remove user's SRS state |
| users → user_deck_progress | CASCADE | Remove user's progress |
| decks → cards | CASCADE | Deleting deck deletes all its cards |
| decks → quiz_sessions | CASCADE | Can't have session without deck |
| decks → user_deck_progress | CASCADE | Remove progress for deleted deck |
| decks ↔ tags | CASCADE (both) | Remove associations on either side |
| cards → quiz_responses | CASCADE | Remove responses for deleted cards |
| cards → srs_reviews | CASCADE | Remove SRS state for deleted cards |
| quiz_sessions → quiz_responses | CASCADE | Remove responses with session |

## Indexes

Strategic indexes for common query patterns:

### Single-Column Indexes

```sql
-- Users
CREATE UNIQUE INDEX ix_users_email ON users(email);
-- Lookup: Login by email

-- Decks
CREATE INDEX ix_decks_title ON decks(title);
-- Lookup: Search decks by title
CREATE INDEX ix_decks_owner_user_id ON decks(owner_user_id);
-- Lookup: Get user's owned decks

-- Tags
CREATE UNIQUE INDEX ix_tags_name ON tags(name);
-- Lookup: Find/create tag by name

-- Cards
CREATE INDEX ix_cards_deck_id ON cards(deck_id);
-- Lookup: Get all cards in deck (most common query)

-- Quiz Sessions
CREATE INDEX ix_quiz_sessions_user_id ON quiz_sessions(user_id);
-- Lookup: User's session history
CREATE INDEX ix_quiz_sessions_deck_id ON quiz_sessions(deck_id);
-- Lookup: Sessions for a deck (analytics)

-- Quiz Responses
CREATE INDEX ix_quiz_responses_session_id ON quiz_responses(session_id);
-- Lookup: Answers in a session
CREATE INDEX ix_quiz_responses_card_id ON quiz_responses(card_id);
-- Lookup: All attempts at a card (analytics)

-- SRS Reviews
CREATE INDEX ix_srs_reviews_user_id ON srs_reviews(user_id);
CREATE INDEX ix_srs_reviews_card_id ON srs_reviews(card_id);
-- Lookups: User's reviews, card review state

-- User Deck Progress
CREATE INDEX ix_user_deck_progress_user_id ON user_deck_progress(user_id);
CREATE INDEX ix_user_deck_progress_deck_id ON user_deck_progress(deck_id);
-- Lookups: User's progress, deck subscribers
```

### Composite Indexes

```sql
-- SRS Reviews: Critical for review queue
CREATE INDEX ix_srs_reviews_user_due ON srs_reviews(user_id, due_at);
-- Query: Get due cards for user (most frequent review query)
-- Enables: WHERE user_id = ? AND due_at <= NOW()
```

### Future Index Candidates

```sql
-- If we add full-text search:
CREATE INDEX idx_decks_title_tsvector ON decks USING GIN(to_tsvector('english', title));
CREATE INDEX idx_cards_prompt_tsvector ON cards USING GIN(to_tsvector('english', prompt));

-- If we filter by card type frequently:
CREATE INDEX idx_cards_type ON cards(type);

-- If we query by session status often:
CREATE INDEX idx_quiz_sessions_status ON quiz_sessions(status);
```

## Constraints

### Primary Keys

All tables use auto-incrementing integer primary keys (`SERIAL`).

### Unique Constraints

- `users.email`: One account per email
- `tags.name`: No duplicate tag names
- `srs_reviews(user_id, card_id)`: One SRS state per user-card
- `user_deck_progress(user_id, deck_id)`: One progress record per user-deck
- `deck_tags(deck_id, tag_id)`: No duplicate tag assignments

### Not Null Constraints

- All foreign keys are NOT NULL (except `decks.owner_user_id` for orphaned decks)
- Core fields like `users.email`, `cards.prompt`, `cards.answer` are NOT NULL
- Timestamps always NOT NULL

### Check Constraints (Future)

```sql
-- Ensure valid percentage
ALTER TABLE user_deck_progress
ADD CONSTRAINT check_percent_range
CHECK (percent_complete >= 0 AND percent_complete <= 100);

-- Ensure valid quality rating
ALTER TABLE quiz_responses
ADD CONSTRAINT check_quality_range
CHECK (quality IS NULL OR (quality >= 0 AND quality <= 5));

-- Ensure valid easiness
ALTER TABLE srs_reviews
ADD CONSTRAINT check_easiness_min
CHECK (easiness >= 1.3);
```

## Enums

### UserRole

```sql
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
```

- `USER`: Standard user (default)
- `ADMIN`: Administrator with elevated permissions

### CardType

```sql
CREATE TYPE card_type AS ENUM ('basic', 'multiple_choice', 'short_answer', 'cloze');
```

- `basic`: Traditional flashcard (prompt → answer)
- `multiple_choice`: Question with 4 options
- `short_answer`: Free text input with auto-grading
- `cloze`: Fill-in-the-blank with `{{c1::text}}` syntax

### QuizMode

```sql
CREATE TYPE quiz_mode AS ENUM ('review', 'practice', 'exam');
```

- `review`: SRS-scheduled review session
- `practice`: Free practice, all cards, no SRS
- `exam`: Timed test mode

### QuizStatus

```sql
CREATE TYPE quiz_status AS ENUM ('active', 'completed');
```

- `active`: Session in progress
- `completed`: Session finished

## Schema Migrations

Flash-Decks uses **Alembic** for database migrations.

### Migration Files

Located in `/backend/alembic/versions/`:

- `0001_initial.py` - Initial schema creation
- `0002_add_streak_fields.py` - Added streak tracking to users
- `0003_add_pinned_decks.py` - Added pinning to user_deck_progress
- `0004_add_cloze_data.py` - Added cloze_data to cards

### Running Migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View current version
alembic current

# View migration history
alembic history --verbose

# Create new migration (auto-generate from models)
alembic revision --autogenerate -m "description"
```

### Migration Best Practices

1. **Review auto-generated migrations**: Always check before applying
2. **Test on staging first**: Never run untested migrations in production
3. **Backup before migrating**: `pg_dump` before major changes
4. **One logical change per migration**: Easy to rollback
5. **Data migrations separate from schema**: Use separate scripts for data transforms

### Example Migration

```python
# alembic/versions/0002_add_streak_fields.py
def upgrade() -> None:
    op.add_column('users', sa.Column('current_streak', sa.Integer(), server_default='0'))
    op.add_column('users', sa.Column('longest_streak', sa.Integer(), server_default='0'))
    op.add_column('users', sa.Column('last_activity_date', sa.Date(), nullable=True))

def downgrade() -> None:
    op.drop_column('users', 'last_activity_date')
    op.drop_column('users', 'longest_streak')
    op.drop_column('users', 'current_streak')
```

## Query Examples

### Common Queries

**Get user's due review cards:**
```sql
SELECT c.*, sr.due_at, sr.interval_days
FROM cards c
JOIN srs_reviews sr ON sr.card_id = c.id
JOIN decks d ON d.id = c.deck_id
WHERE sr.user_id = 123
  AND sr.due_at <= NOW()
ORDER BY sr.due_at ASC
LIMIT 20;
```

**Get user's pinned decks with progress:**
```sql
SELECT d.*, udp.percent_complete, udp.last_studied_at
FROM decks d
JOIN user_deck_progress udp ON udp.deck_id = d.id
WHERE udp.user_id = 123
  AND udp.pinned = TRUE
ORDER BY udp.last_studied_at DESC;
```

**Search public decks by tag:**
```sql
SELECT DISTINCT d.*
FROM decks d
JOIN deck_tags dt ON dt.deck_id = d.id
JOIN tags t ON t.id = dt.tag_id
WHERE d.is_public = TRUE
  AND t.name IN ('spanish', 'beginner')
ORDER BY d.created_at DESC;
```

**Get session statistics:**
```sql
SELECT
    COUNT(*) as total_answers,
    SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_answers,
    AVG(quality) as avg_quality
FROM quiz_responses
WHERE session_id = 456;
```

**Get user's study streak:**
```sql
SELECT
    current_streak,
    longest_streak,
    last_activity_date,
    CASE
        WHEN last_activity_date = CURRENT_DATE THEN 'studied_today'
        WHEN last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN 'studied_yesterday'
        ELSE 'inactive'
    END as streak_status
FROM users
WHERE id = 123;
```

## Performance Considerations

### Indexing Strategy

- **Foreign keys are indexed** for join performance
- **Composite index** on `srs_reviews(user_id, due_at)` for the most critical query
- **JSON columns** should use GIN indexes if querying inside JSON frequently

### Query Optimization

- Use `EXPLAIN ANALYZE` to understand query plans
- Avoid N+1 queries: Use joins or eager loading
- Paginate large result sets
- Consider materialized views for complex analytics

### Connection Pooling

Configured in SQLAlchemy engine:
- Pool size: 10 connections
- Max overflow: 20 connections
- Pool recycle: 3600 seconds

## Future Schema Enhancements

### Planned Additions

1. **Attachments Table**: Store images, audio for cards
2. **User Settings Table**: Preferences, notification settings
3. **Deck Categories**: Hierarchical organization
4. **Study Statistics Aggregate**: Pre-computed analytics
5. **Shared Decks**: Collaborative deck editing
6. **Comments/Ratings**: Community feedback on public decks

### Optimization Opportunities

1. **Partitioning**: Partition `quiz_responses` by date for archival
2. **Archival**: Move old sessions to archive table
3. **Caching**: Redis for frequently accessed decks
4. **Read Replicas**: Separate analytics queries from transactional load

## Further Reading

- [Backend Architecture](./backend-architecture.md)
- [API Reference](../api/overview.md)
- [Spaced Repetition Algorithm](../features/spaced-repetition.md)

---

This schema is designed for **data integrity**, **query performance**, and **future extensibility** while maintaining clarity and simplicity.
