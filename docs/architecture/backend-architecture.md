# Backend Architecture

The Flash-Decks backend is built with FastAPI, following a layered architecture pattern that separates concerns and promotes maintainability and testability.

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Application Layers](#application-layers)
- [Core Components](#core-components)
- [Detailed Component Analysis](#detailed-component-analysis)
- [Design Patterns](#design-patterns)
- [Data Flow](#data-flow)
- [Security Implementation](#security-implementation)
- [Performance Considerations](#performance-considerations)

## Overview

The backend is a RESTful API service that:
- Manages user authentication and authorization
- Handles deck and flashcard CRUD operations
- Implements the SM-2 spaced repetition algorithm
- Tracks study progress and statistics
- Maintains user streaks and activity

**Tech Stack:**
- **Framework:** FastAPI 0.104+
- **ORM:** SQLModel (built on SQLAlchemy 2.0)
- **Database:** PostgreSQL 15
- **Validation:** Pydantic v2
- **Authentication:** Python-jose (JWT)
- **Password Hashing:** Passlib with Argon2
- **Logging:** Loguru
- **Testing:** Pytest with 93% coverage

## Project Structure

```
backend/
├── app/
│   ├── main.py                    # Application entry point
│   ├── __init__.py
│   │
│   ├── api/                       # API Layer
│   │   ├── api_v1.py             # API router aggregator
│   │   ├── dependencies.py        # Shared dependencies (auth, db)
│   │   └── v1/                   # Version 1 endpoints
│   │       ├── __init__.py
│   │       ├── auth.py           # Authentication endpoints
│   │       ├── decks.py          # Deck management endpoints
│   │       ├── study.py          # Study session endpoints
│   │       └── users.py          # User management endpoints
│   │
│   ├── core/                      # Core Configuration
│   │   ├── __init__.py
│   │   ├── config.py             # Settings management (Pydantic)
│   │   ├── security.py           # Auth utilities (JWT, hashing)
│   │   └── logging.py            # Logging configuration
│   │
│   ├── db/                        # Database Layer
│   │   ├── __init__.py
│   │   ├── session.py            # SQLAlchemy engine and session factory
│   │   └── init_db.py            # Database initialization
│   │
│   ├── models/                    # Database Models (SQLModel)
│   │   ├── __init__.py
│   │   ├── user.py               # User model
│   │   ├── deck.py               # Deck and DeckTagLink models
│   │   ├── card.py               # Card model
│   │   ├── tag.py                # Tag model
│   │   ├── study.py              # QuizSession, QuizResponse, SRSReview, UserDeckProgress
│   │   └── enums.py              # Enums (UserRole, CardType, QuizMode, QuizStatus)
│   │
│   ├── schemas/                   # Pydantic Schemas (Request/Response DTOs)
│   │   ├── __init__.py
│   │   ├── auth.py               # Token, UserCreate, UserLogin
│   │   ├── deck.py               # DeckCreate, DeckUpdate, DeckResponse
│   │   ├── card.py               # CardCreate, CardUpdate, CardResponse
│   │   ├── study.py              # StudySessionCreate, StudyAnswerCreate
│   │   └── user.py               # UserResponse, UserUpdate
│   │
│   └── services/                  # Business Logic Layer
│       ├── __init__.py
│       ├── auth.py               # Authentication service
│       ├── decks.py              # Deck management service
│       ├── study.py              # Study session and SRS logic
│       └── streak.py             # Streak calculation service
│
├── alembic/                       # Database Migrations
│   ├── versions/                 # Migration files
│   │   └── 0001_initial.py
│   ├── env.py
│   └── script.py.mako
│
├── scripts/                       # Utility Scripts
│   └── seed_data.py              # Seed database with sample data
│
├── tests/                         # Test Suite
│   ├── conftest.py               # Pytest fixtures
│   ├── test_api_auth.py
│   ├── test_api_decks.py
│   ├── test_api_study.py
│   ├── test_srs.py
│   └── ...
│
├── requirements.txt               # Python dependencies
├── Dockerfile                     # Docker image definition
├── alembic.ini                    # Alembic configuration
└── pytest.ini                     # Pytest configuration
```

## Application Layers

The backend follows a strict layered architecture:

### 1. API Layer (`app/api/`)

**Responsibility:** HTTP request/response handling

- Defines route endpoints
- Validates request data using Pydantic schemas
- Handles HTTP-specific concerns (status codes, headers)
- Delegates business logic to service layer
- Uses dependency injection for database sessions and authentication

**Example:**
```python
# app/api/v1/decks.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from ...api.dependencies import get_current_active_user, get_db
from ...models import User
from ...schemas.deck import DeckCreate, DeckResponse
from ...services import decks as deck_service

router = APIRouter()

@router.post("/decks", response_model=DeckResponse, status_code=status.HTTP_201_CREATED)
def create_deck(
    deck_data: DeckCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new deck."""
    return deck_service.create_deck(db, deck_data, current_user.id)
```

### 2. Service Layer (`app/services/`)

**Responsibility:** Business logic and orchestration

- Implements core application logic
- Orchestrates multiple models/operations
- Performs complex calculations (e.g., SM-2 algorithm)
- Handles transactions
- No HTTP concerns, no direct request/response handling

**Example:**
```python
# app/services/study.py
def record_answer(
    db: Session,
    session: QuizSession,
    user: User,
    answer_data: StudyAnswerCreate
) -> QuizResponse:
    """Record user's answer and apply SRS algorithm."""
    card = db.get(Card, answer_data.card_id)
    if not card:
        raise ValueError("Card not found")

    # Auto-grade based on card type
    is_correct = _check_answer(card, answer_data.user_answer)

    # Create quiz response
    response = QuizResponse(
        session_id=session.id,
        card_id=card.id,
        user_answer=answer_data.user_answer,
        is_correct=is_correct,
        quality=answer_data.quality,
    )
    db.add(response)

    # Update SRS state if in review mode
    if session.mode == QuizMode.REVIEW:
        review = _get_review_state(db, user, card)
        _apply_sm2(review, answer_data.quality)
        db.add(review)

    # Update progress
    _update_progress(db, user.id, session.deck_id)

    db.commit()
    db.refresh(response)
    return response
```

### 3. Model Layer (`app/models/`)

**Responsibility:** Data structure and database mapping

- Defines database schema using SQLModel
- Represents tables as Python classes
- Defines relationships between entities
- No business logic

**Example:**
```python
# app/models/user.py
from sqlmodel import Field, Relationship, SQLModel

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, sa_column_kwargs={"unique": True})
    hashed_password: str = Field(nullable=False)
    full_name: Optional[str] = Field(default=None, nullable=True)
    role: UserRole = Field(default=UserRole.USER)
    is_active: bool = Field(default=True)

    # Streak tracking
    current_streak: int = Field(default=0)
    longest_streak: int = Field(default=0)
    last_activity_date: Optional[date] = Field(default=None)

    # Timestamps
    created_at: datetime = Field(sa_column=Column(DateTime(timezone=True), server_default=func.now()))
    updated_at: datetime = Field(sa_column=Column(DateTime(timezone=True), onupdate=func.now()))

    # Relationships
    decks: list["Deck"] = Relationship(back_populates="owner")
    quiz_sessions: list["QuizSession"] = Relationship(back_populates="user")
```

### 4. Schema Layer (`app/schemas/`)

**Responsibility:** Data validation and serialization

- Defines request/response data structures
- Validates incoming data
- Serializes outgoing data
- Separates API contract from database models

**Example:**
```python
# app/schemas/deck.py
from pydantic import BaseModel, Field

class DeckBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    is_public: bool = True
    tags: list[str] = Field(default_factory=list)

class DeckCreate(DeckBase):
    """Request schema for creating a deck."""
    pass

class DeckUpdate(BaseModel):
    """Request schema for updating a deck."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_public: Optional[bool] = None
    tags: Optional[list[str]] = None

class DeckResponse(DeckBase):
    """Response schema for deck endpoints."""
    id: int
    owner_user_id: int
    created_at: datetime
    updated_at: datetime
    card_count: int = 0

    class Config:
        from_attributes = True
```

## Core Components

### 1. Application Initialization (`app/main.py`)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Initialize database on startup."""
    await init_db()
    yield

def create_application() -> FastAPI:
    configure_logging()

    application = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS middleware
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    application.include_router(api_router, prefix=settings.API_V1_STR)

    return application

app = create_application()
```

### 2. Configuration Management (`app/core/config.py`)

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Project metadata
    PROJECT_NAME: str = "Flash-Decks"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str

    # Security
    JWT_SECRET_KEY: str
    JWT_REFRESH_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # CORS
    CORS_ORIGINS: list[str] = ["*"]

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
```

### 3. Database Session Management (`app/db/session.py`)

```python
from sqlalchemy import create_engine
from sqlmodel import Session

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,  # Set to True for SQL logging
    pool_pre_ping=True,  # Verify connections before use
    pool_size=10,
    max_overflow=20,
)

def get_session() -> Generator[Session, None, None]:
    """Dependency for database sessions."""
    with Session(engine) as session:
        yield session
```

### 4. Authentication (`app/core/security.py`)

**Password Hashing:**
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

**JWT Token Generation:**
```python
from jose import jwt
from datetime import datetime, timedelta

def create_access_token(subject: str) -> str:
    expires = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expires, "sub": str(subject)}
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(subject: str) -> str:
    expires = datetime.utcnow() + timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expires, "sub": str(subject)}
    return jwt.encode(to_encode, settings.JWT_REFRESH_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
```

**Token Validation:**
```python
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_current_user(
    db: Session = Depends(get_session),
    token: str = Depends(oauth2_scheme)
) -> User:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    user = db.get(User, int(user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

    return user
```

## Detailed Component Analysis

### Spaced Repetition System (SM-2 Algorithm)

Located in [app/services/study.py:61-85](../../backend/app/services/study.py#L61-L85)

```python
def _apply_sm2(review: SRSReview, quality: int) -> None:
    """
    Apply the SM-2 spaced repetition algorithm.

    Args:
        review: The SRS review state to update
        quality: User's recall quality (0-5)
            0: Complete blackout
            1: Incorrect but familiar
            2: Incorrect but almost
            3: Correct with difficulty
            4: Correct with hesitation
            5: Perfect recall

    Algorithm:
        - Quality < 3: Reset repetitions, interval = 1 day
        - Repetition 0 → 1: interval = 1 day
        - Repetition 1 → 2: interval = 6 days
        - Repetition 2+: interval = previous_interval * easiness

        Easiness adjustment:
        EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        Minimum EF = 1.3
    """
    if quality < 0 or quality > 5:
        raise HTTPException(status_code=400, detail="Quality must be 0-5")

    if quality < 3:
        # Failed recall - restart interval
        review.repetitions = 0
        review.interval_days = 1
    else:
        # Successful recall - increase interval
        if review.repetitions == 0:
            review.repetitions = 1
            review.interval_days = 1
        elif review.repetitions == 1:
            review.repetitions = 2
            review.interval_days = 6
        else:
            review.interval_days = max(1, round(review.interval_days * review.easiness))
            review.repetitions += 1

    # Adjust easiness factor based on recall quality
    review.easiness = max(
        1.3,
        review.easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
    )

    review.last_quality = quality
    review.due_at = datetime.now(tz=timezone.utc) + timedelta(days=review.interval_days)
```

### Auto-Grading System

Located in [app/services/study.py](../../backend/app/services/study.py)

**Multiple Choice:**
```python
def _check_multiple_choice_answer(card: Card, user_answer: str | None) -> bool:
    """Exact match against correct answer."""
    if not user_answer:
        return False
    return _normalize_answer(user_answer) == _normalize_answer(card.answer)
```

**Short Answer:**
```python
def _check_short_answer(card: Card, user_answer: str | None) -> bool:
    """
    Check against primary answer and acceptable alternatives.
    card.options can contain list of acceptable answers.
    """
    if not user_answer:
        return False

    normalized_user = _normalize_answer(user_answer)
    normalized_correct = _normalize_answer(card.answer)

    if normalized_user == normalized_correct:
        return True

    # Check alternatives if provided
    if card.options:
        for acceptable in card.options:
            if normalized_user == _normalize_answer(acceptable):
                return True

    return False
```

**Cloze Deletion:**
```python
def _check_cloze_answer(card: Card, user_answer: str | None) -> bool:
    """
    Check fill-in-the-blank answers.

    Expected user_answer format: JSON array ["answer1", "answer2"]
    Expected cloze_data format: {
        "blanks": [
            {"answer": "Paris"},
            {"answer": ["Art", "Fashion"]}  # Multiple acceptable answers
        ]
    }
    """
    if not user_answer or not card.cloze_data:
        return False

    try:
        user_answers = json.loads(user_answer)
        blanks = card.cloze_data.get("blanks", [])

        if len(user_answers) != len(blanks):
            return False

        # Check each blank
        for user_ans, blank_data in zip(user_answers, blanks):
            blank_answer = blank_data.get("answer")

            # Handle multiple acceptable answers per blank
            if isinstance(blank_answer, list):
                if not any(_normalize_answer(user_ans) == _normalize_answer(acc) for acc in blank_answer):
                    return False
            else:
                if _normalize_answer(user_ans) != _normalize_answer(blank_answer):
                    return False

        return True
    except (json.JSONDecodeError, KeyError, TypeError):
        return False
```

### Streak System

Located in [app/services/streak.py](../../backend/app/services/streak.py)

```python
def update_user_streak(db: Session, user: User) -> User:
    """
    Update user's study streak based on activity.

    Logic:
    - First activity ever: current_streak = 1
    - Already studied today: no change
    - Studied yesterday: increment streak
    - Missed days: reset to 1
    - Always update longest_streak if current exceeds it
    """
    today = date.today()

    if user.last_activity_date is None:
        # First time studying
        user.current_streak = 1
        user.longest_streak = 1
    elif user.last_activity_date == today:
        # Already studied today, no change
        pass
    elif user.last_activity_date == today - timedelta(days=1):
        # Studied yesterday, increment
        user.current_streak += 1
        if user.current_streak > user.longest_streak:
            user.longest_streak = user.current_streak
    else:
        # Missed days, reset
        user.current_streak = 1

    user.last_activity_date = today
    db.add(user)
    db.commit()
    db.refresh(user)

    return user
```

## Design Patterns

### 1. Dependency Injection

FastAPI's built-in DI system provides testability and flexibility:

```python
# app/api/dependencies.py

def get_db() -> Generator[Session, None, None]:
    """Provides database session."""
    with Session(engine) as session:
        yield session

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """Provides authenticated user."""
    # ... validation logic
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensures user is active."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Usage in endpoints:
@router.get("/decks")
def list_decks(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    return deck_service.list_decks(db, user.id)
```

### 2. Repository Pattern (Service Layer)

Services abstract data access:

```python
# Instead of this in routes:
@router.post("/decks")
def create_deck(deck_data: DeckCreate, db: Session = Depends(get_db)):
    deck = Deck(**deck_data.dict())
    db.add(deck)
    db.commit()
    return deck

# We use this:
@router.post("/decks")
def create_deck(
    deck_data: DeckCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    return deck_service.create_deck(db, deck_data, user.id)

# Service handles all logic:
# - Validation
# - Tag creation
# - Progress initialization
# - Transaction management
```

### 3. DTO Pattern (Schemas)

Separate API contract from database models:

```python
# Database model
class Deck(SQLModel, table=True):
    id: Optional[int]
    title: str
    owner_user_id: int
    # ... database-specific fields

# Request DTO
class DeckCreate(BaseModel):
    title: str
    description: Optional[str]
    tags: list[str]
    # ... user-friendly fields

# Response DTO
class DeckResponse(BaseModel):
    id: int
    title: str
    card_count: int  # Computed field
    # ... API-specific fields
```

### 4. Strategy Pattern (Card Type Validation)

Different validation strategies for different card types:

```python
def _check_answer(card: Card, user_answer: str | None) -> bool:
    """Dispatch to appropriate validation strategy."""
    if card.type == CardType.BASIC:
        return True  # Manual grading
    elif card.type == CardType.MULTIPLE_CHOICE:
        return _check_multiple_choice_answer(card, user_answer)
    elif card.type == CardType.SHORT_ANSWER:
        return _check_short_answer(card, user_answer)
    elif card.type == CardType.CLOZE:
        return _check_cloze_answer(card, user_answer)
    return False
```

## Data Flow

### Creating a Deck with Cards

```
1. POST /api/v1/decks
   Request: {title, description, tags, is_public}
   Headers: Authorization: Bearer <token>

2. FastAPI middleware validates JWT

3. get_current_active_user() dependency:
   - Extracts user_id from JWT
   - Fetches User from database
   - Validates user.is_active

4. Route handler receives validated data and user

5. deck_service.create_deck():
   a. Create Deck instance
   b. For each tag:
      - Query existing Tag
      - Create if doesn't exist
      - Associate with deck
   c. Initialize UserDeckProgress (owner)
   d. db.commit()

6. Response: DeckResponse with new deck data

7. POST /api/v1/decks/{deck_id}/cards
   Request: {type, prompt, answer, options, explanation}

8. deck_service.create_card():
   a. Verify deck exists
   b. Verify user owns deck or is admin
   c. Validate card type specific fields
   d. Create Card instance
   e. db.commit()

9. Response: CardResponse with new card data
```

### Study Session Flow

```
1. POST /api/v1/study/sessions
   Request: {deck_id, mode: "review", config: {...}}

2. study_service.create_session():
   - Create QuizSession (status: ACTIVE)
   - Store config JSON
   - Return session

3. GET /api/v1/study/sessions/{id}/next-card

4. study_service.get_next_card():
   - If mode == REVIEW:
     Query SRSReviews where due_at <= now
   - If mode == PRACTICE:
     Get all deck cards, shuffle
   - Return next card or null if done

5. User answers card
   POST /api/v1/study/sessions/{id}/answer
   Request: {card_id, user_answer, quality: 4}

6. study_service.record_answer():
   a. Auto-grade answer → is_correct
   b. Create QuizResponse record
   c. If mode == REVIEW:
      - Fetch/create SRSReview
      - _apply_sm2(review, quality)
      - Update due_at, interval, easiness
   d. Update UserDeckProgress:
      - last_studied_at = now
      - Recalculate percent_complete
   e. db.commit()

7. Return next card (loop back to step 4)

8. POST /api/v1/study/sessions/{id}/finish

9. study_service.finish_session():
   - Set status = COMPLETED
   - Set ended_at = now
   - Update user streak
   - db.commit()

10. Return session statistics
```

## Security Implementation

### 1. SQL Injection Prevention

**SQLModel/SQLAlchemy** uses parameterized queries:

```python
# Safe - parameterized
user = db.exec(
    select(User).where(User.email == email)  # Parameterized
).first()

# NEVER do this (vulnerable):
# db.execute(f"SELECT * FROM users WHERE email = '{email}'")
```

### 2. Password Security

- **Argon2** hashing (memory-hard, GPU-resistant)
- Automatic salting (per-password unique salt)
- No plaintext passwords stored

```python
# Registration
hashed = hash_password(plain_password)  # Argon2 with automatic salt
user.hashed_password = hashed

# Login
if not verify_password(plain_password, user.hashed_password):
    raise HTTPException(401, "Incorrect password")
```

### 3. JWT Token Security

- **Short-lived access tokens** (30 minutes)
- **Long-lived refresh tokens** (7 days)
- **Separate secrets** for access and refresh
- **Token rotation** on refresh
- **Stateless** (no server-side session storage)

### 4. Authorization

**Role-Based Access Control:**

```python
def require_admin(user: User = Depends(get_current_active_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(403, "Admin access required")
    return user

# Usage:
@router.delete("/decks/{deck_id}")
def delete_any_deck(
    deck_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)  # Only admins
):
    # ...
```

**Resource-Based Access Control:**

```python
def verify_deck_ownership(db: Session, deck_id: int, user: User) -> Deck:
    deck = db.get(Deck, deck_id)
    if not deck:
        raise HTTPException(404, "Deck not found")
    if deck.owner_user_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(403, "Not authorized")
    return deck
```

## Performance Considerations

### 1. Database Indexing

```sql
-- User lookups by email (login)
CREATE INDEX idx_users_email ON users(email);

-- Card lookups by deck (deck detail)
CREATE INDEX idx_cards_deck_id ON cards(deck_id);

-- SRS reviews by user and due date (review queue)
CREATE INDEX idx_srs_reviews_user_due ON srs_reviews(user_id, due_at);

-- Deck lookups (search, filter)
CREATE INDEX idx_decks_title ON decks(title);
CREATE INDEX idx_decks_owner ON decks(owner_user_id);
```

### 2. Query Optimization

**Eager Loading:**
```python
# Efficient - single query with join
deck = db.exec(
    select(Deck)
    .where(Deck.id == deck_id)
    .options(selectinload(Deck.cards), selectinload(Deck.tags))
).first()

# Inefficient - N+1 queries
deck = db.get(Deck, deck_id)
cards = deck.cards  # Separate query
tags = deck.tags    # Another query
```

**Pagination:**
```python
def list_decks(db: Session, offset: int = 0, limit: int = 20):
    statement = select(Deck).offset(offset).limit(limit)
    return db.exec(statement).all()
```

### 3. Connection Pooling

```python
engine = create_engine(
    DATABASE_URL,
    pool_size=10,          # Persistent connections
    max_overflow=20,       # Additional connections when busy
    pool_timeout=30,       # Wait time for connection
    pool_recycle=3600,     # Recycle connections hourly
    pool_pre_ping=True,    # Verify before use
)
```

### 4. Caching (Future Enhancement)

```python
# Redis for frequently accessed data
@cache(ttl=300)  # 5 minutes
def get_public_decks(db: Session):
    return db.exec(select(Deck).where(Deck.is_public == True)).all()
```

## Testing Strategy

### Fixtures (`tests/conftest.py`)

```python
@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """Provides isolated test database."""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def user(db: Session) -> User:
    """Creates test user."""
    user = User(email="test@example.com", hashed_password=hash_password("test123"))
    db.add(user)
    db.commit()
    return user

@pytest.fixture
def auth_headers(user: User) -> dict:
    """Provides authentication headers."""
    token = create_access_token(str(user.id))
    return {"Authorization": f"Bearer {token}"}
```

### Example Tests

```python
def test_create_deck(client: TestClient, auth_headers: dict):
    response = client.post(
        "/api/v1/decks",
        json={"title": "Test Deck", "description": "Test", "tags": ["test"]},
        headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Deck"
    assert "id" in data

def test_sm2_algorithm(db: Session, user: User, card: Card):
    review = SRSReview(user_id=user.id, card_id=card.id)

    # First review with quality 5
    _apply_sm2(review, quality=5)
    assert review.interval_days == 1
    assert review.repetitions == 1

    # Second review with quality 5
    _apply_sm2(review, quality=5)
    assert review.interval_days == 6
    assert review.repetitions == 2

    # Third review with quality 4
    _apply_sm2(review, quality=4)
    assert review.interval_days > 6
    assert review.repetitions == 3
```

## Logging

```python
from loguru import logger

# Configured in app/core/logging.py
logger.add(
    sys.stderr,
    format="{time} {level} {message}",
    level=settings.LOG_LEVEL,
    serialize=True,  # JSON format
)

# Usage throughout application:
logger.info(f"User {user.email} created deck {deck.id}")
logger.error(f"Failed to apply SM-2: {error}")
logger.debug(f"Query executed: {query}")
```

## Further Reading

- [Frontend Architecture](./frontend-architecture.md)
- [Database Schema](./database-schema.md)
- [API Reference](../api/overview.md)
- [Testing Guide](../development/testing.md)

---

The backend architecture prioritizes **separation of concerns**, **testability**, **type safety**, and **maintainability** while providing a robust foundation for the Flash-Decks application.
