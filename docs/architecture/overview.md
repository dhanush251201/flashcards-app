# Architecture Overview

Flash-Decks follows a modern, three-tier architecture with clear separation of concerns, making it scalable, maintainable, and testable.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          React SPA (TypeScript + Vite)                  │ │
│  │  - Component-based UI                                   │ │
│  │  - State management (Zustand + React Query)             │ │
│  │  - Client-side routing (React Router)                   │ │
│  │  - Tailwind CSS styling                                 │ │
│  └────────────────────────────────────────────────────────┘ │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS/REST API
                            │ JSON payloads
                            │ JWT authentication
┌───────────────────────────┴──────────────────────────────────┐
│                      Application Layer                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         FastAPI Backend (Python 3.11)                   │ │
│  │                                                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │ │
│  │  │   Routes     │  │   Services   │  │    Models   │  │ │
│  │  │  (API Layer) │─>│ (Business    │─>│  (Data      │  │ │
│  │  │              │  │  Logic)      │  │   Layer)    │  │ │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │ │
│  │                                                         │ │
│  │  - RESTful endpoints                                    │ │
│  │  - Dependency injection                                 │ │
│  │  - Request/response validation (Pydantic)               │ │
│  │  - Authentication & authorization                       │ │
│  │  - Structured logging (Loguru)                          │ │
│  └────────────────────────────────────────────────────────┘ │
└───────────────────────────┬──────────────────────────────────┘
                            │ SQL/ORM
                            │ SQLModel/SQLAlchemy
                            │ Connection pooling
┌───────────────────────────┴──────────────────────────────────┐
│                       Data Layer                             │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │            PostgreSQL 15 Database                       │ │
│  │  - Relational data model                                │ │
│  │  - ACID transactions                                    │ │
│  │  - Indexing for performance                             │ │
│  │  - Foreign key constraints                              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Architectural Principles

### 1. Separation of Concerns

Each layer has a distinct responsibility:

- **Presentation Layer (Frontend)**: User interface and user experience
- **Business Logic Layer (Backend Services)**: Application logic and rules
- **Data Access Layer (Models/ORM)**: Database operations
- **Data Storage Layer (PostgreSQL)**: Persistent data storage

### 2. API-First Design

- Frontend and backend communicate exclusively through RESTful API
- Clear contract between layers via OpenAPI/Swagger specification
- Versioned API endpoints (`/api/v1/`)
- Enables future mobile apps, CLI tools, or third-party integrations

### 3. Stateless Architecture

- **Backend**: Stateless REST API using JWT tokens
- **No server sessions**: All state in database or client
- **Horizontal scalability**: Can run multiple backend instances
- **Resilient**: Server restarts don't affect user sessions

### 4. Security-First

- **Authentication**: JWT access + refresh token pattern
- **Authorization**: Role-based access control (USER, ADMIN)
- **Password Security**: Argon2 hashing with automatic salting
- **SQL Injection Prevention**: Parameterized queries via ORM
- **XSS Prevention**: React's built-in escaping + Content Security Policy
- **CORS**: Configurable origin restrictions

### 5. Type Safety Throughout

- **Frontend**: TypeScript for compile-time type checking
- **Backend**: Python type hints + Pydantic validation
- **API Contract**: Shared types via OpenAPI specification
- **Database**: SQLModel provides Python types mapped to SQL

### 6. Testability

- **Dependency Injection**: Easy to mock dependencies
- **Service Layer**: Business logic isolated from HTTP concerns
- **Test Fixtures**: Comprehensive pytest fixtures for backend
- **Component Testing**: React Testing Library for frontend
- **93% Backend Coverage**: Extensive test suite

## Component Architecture

### Frontend Architecture

```
src/
├── components/          # Reusable UI components
│   ├── cards/          # Flashcard components
│   ├── decks/          # Deck-related components
│   ├── layout/         # Page layout components
│   └── navigation/     # Navigation components
│
├── pages/              # Page-level components
│   ├── DashboardPage.tsx
│   ├── DeckDetailPage.tsx
│   ├── StudySessionPage.tsx
│   └── auth/
│
├── routes/             # Route protection logic
│   ├── ProtectedRoute.tsx
│   └── PublicOnlyRoute.tsx
│
├── store/              # Global state management
│   └── authStore.ts    # Zustand store for auth
│
├── lib/                # Utilities and configuration
│   ├── apiClient.ts    # Axios instance with interceptors
│   └── queryClient.ts  # React Query configuration
│
├── hooks/              # Custom React hooks
│   ├── useAuth.ts
│   ├── useDecks.ts
│   └── useStudySession.ts
│
└── types/              # TypeScript type definitions
    ├── api.ts
    ├── deck.ts
    └── study.ts
```

**Key Patterns:**
- **Component Composition**: Small, focused components
- **Custom Hooks**: Reusable stateful logic
- **Colocated State**: Component state where possible
- **Lifted State**: Global state only when necessary

### Backend Architecture

```
app/
├── api/                    # API layer
│   ├── dependencies.py    # Shared dependencies (auth, db)
│   └── v1/
│       ├── auth.py        # Auth endpoints
│       ├── decks.py       # Deck endpoints
│       ├── study.py       # Study endpoints
│       └── users.py       # User endpoints
│
├── core/                   # Core configuration
│   ├── config.py          # Settings management
│   ├── security.py        # Auth utilities
│   └── logging.py         # Logging configuration
│
├── db/                     # Database layer
│   └── session.py         # SQLAlchemy engine & session
│
├── models/                 # SQLModel database models
│   ├── user.py
│   ├── deck.py
│   ├── card.py
│   ├── srs.py
│   └── quiz.py
│
├── schemas/                # Pydantic request/response schemas
│   ├── auth.py
│   ├── deck.py
│   ├── card.py
│   └── study.py
│
└── services/               # Business logic layer
    ├── auth.py
    ├── decks.py
    ├── study.py
    └── streak.py
```

**Key Patterns:**
- **Layered Architecture**: Routes → Services → Models
- **Dependency Injection**: FastAPI's DI for database sessions
- **Repository Pattern**: Service layer abstracts data access
- **DTO Pattern**: Pydantic schemas for data transfer

## Data Flow

### Read Operation (Fetch Decks)

```
1. User clicks "All Decks"
   ↓
2. React Router navigates to /app/dashboard?view=all
   ↓
3. DashboardPage component mounts
   ↓
4. useDecks() hook triggers
   ↓
5. React Query checks cache
   ↓ (cache miss)
6. apiClient.get('/decks')
   ↓
7. Axios interceptor adds Authorization: Bearer <token>
   ↓
8. HTTPS request to backend
   ↓
9. FastAPI middleware validates JWT
   ↓
10. decks.py route handler called
    ↓
11. get_current_user() dependency injects User
    ↓
12. DeckService.list_decks() called
    ↓
13. SQLModel queries database
    ↓
14. PostgreSQL returns rows
    ↓
15. Models converted to Pydantic schemas
    ↓
16. JSON response returned
    ↓
17. React Query caches response
    ↓
18. Component re-renders with data
    ↓
19. User sees deck cards
```

### Write Operation (Answer Card)

```
1. User grades flashcard with quality=4
   ↓
2. StudySessionPage calls handleAnswer(cardId, 4)
   ↓
3. apiClient.post('/study/sessions/:id/answer', {cardId, quality: 4})
   ↓
4. Request authenticated with JWT
   ↓
5. study.py route handler
   ↓
6. Validates session belongs to user
   ↓
7. StudyService.record_answer()
   ↓
8. Begin database transaction
   ↓
9. Create QuizResponse record
   ↓
10. Fetch SRSReview for user + card
    ↓
11. Apply SM-2 algorithm
    ↓
12. Update: repetitions, interval, easiness, due_at
    ↓
13. Update UserDeckProgress
    ↓
14. Update user streak (if session complete)
    ↓
15. Commit transaction
    ↓
16. Return next card + updated session state
    ↓
17. React Query invalidates session cache
    ↓
18. Component updates with next card
    ↓
19. User sees next question
```

## Communication Patterns

### Frontend to Backend

**Authentication Flow:**
```typescript
// 1. Login request
POST /api/v1/auth/login
{
  username: "user@example.com",
  password: "password123"
}

// 2. Receive tokens
Response:
{
  access_token: "eyJ...",
  refresh_token: "eyJ...",
  token_type: "bearer"
}

// 3. Store in Zustand + localStorage
authStore.setTokens(access_token, refresh_token)

// 4. Subsequent requests include token
GET /api/v1/decks
Headers: {
  Authorization: "Bearer eyJ..."
}

// 5. Token expires (401 response)
// 6. Axios interceptor catches 401
// 7. Auto-refresh using refresh_token
POST /api/v1/auth/refresh
{
  refresh_token: "eyJ..."
}

// 8. Receive new tokens
// 9. Retry original request
// 10. User experiences seamless auth
```

**Data Fetching:**
```typescript
// React Query pattern
const { data, isLoading, error } = useQuery({
  queryKey: ['decks', filters],
  queryFn: () => apiClient.get('/decks', { params: filters }),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
})

// Automatic:
// - Background refetch when stale
// - Cache deduplication
// - Request cancellation
// - Error retry with exponential backoff
```

**Mutations:**
```typescript
// React Query mutation
const mutation = useMutation({
  mutationFn: (deck) => apiClient.post('/decks', deck),
  onSuccess: () => {
    // Invalidate and refetch
    queryClient.invalidateQueries(['decks'])
    toast.success('Deck created!')
  },
  onError: (error) => {
    toast.error(error.message)
  },
})

// Optimistic updates supported
```

### Backend to Database

**Service Layer Pattern:**
```python
# Service encapsulates business logic
class DeckService:
    @staticmethod
    def create_deck(
        db: Session,
        deck_data: DeckCreate,
        user_id: int
    ) -> Deck:
        # Validate business rules
        if len(deck_data.tags) > 10:
            raise ValueError("Maximum 10 tags allowed")

        # Create deck
        deck = Deck(
            title=deck_data.title,
            description=deck_data.description,
            owner_user_id=user_id,
            is_public=deck_data.is_public
        )
        db.add(deck)

        # Handle tags (create if needed)
        for tag_name in deck_data.tags:
            tag = db.query(Tag).filter(
                Tag.name == tag_name
            ).first()
            if not tag:
                tag = Tag(name=tag_name)
                db.add(tag)
            deck.tags.append(tag)

        db.commit()
        db.refresh(deck)

        return deck
```

**Transaction Management:**
```python
# Automatic transaction with session
try:
    # Multiple operations in transaction
    response = QuizResponse(...)
    db.add(response)

    srs_review = db.query(SRSReview).filter(...).first()
    srs_review.interval_days = calculate_interval(...)

    progress = db.query(UserDeckProgress).filter(...).first()
    progress.last_studied_at = datetime.utcnow()

    db.commit()  # Atomic commit
except Exception as e:
    db.rollback()  # Automatic rollback on error
    raise
```

## Scalability Considerations

### Current Architecture Supports

1. **Horizontal Backend Scaling**
   - Stateless API servers
   - Load balancer distributes requests
   - Shared PostgreSQL database

2. **Database Connection Pooling**
   - Reuse connections across requests
   - Configurable pool size
   - Prevents connection exhaustion

3. **Client-Side Caching**
   - React Query reduces API calls
   - Stale-while-revalidate pattern
   - Optimistic updates

4. **Efficient Queries**
   - Indexes on foreign keys and common queries
   - Eager loading with joins
   - Pagination for large datasets

### Future Scalability Options

1. **Caching Layer**
   - Redis for session storage
   - Cache frequently accessed decks
   - Leaderboard/statistics caching

2. **CDN for Frontend**
   - Serve static assets globally
   - Reduce origin load
   - Faster page loads

3. **Database Replication**
   - Read replicas for queries
   - Write to primary
   - Separate analytics database

4. **Message Queue**
   - Background job processing
   - Email notifications
   - Analytics events
   - Card generation with AI

5. **Microservices (if needed)**
   - Separate SRS engine service
   - Analytics service
   - Notification service

## Technology Choices Rationale

### Why FastAPI?
- **Performance**: ASGI-based, async support
- **Modern Python**: Type hints, automatic validation
- **Auto-docs**: Swagger/ReDoc generation
- **Developer Experience**: Fast iteration, great errors

### Why React?
- **Component Model**: Reusable, testable components
- **Ecosystem**: Rich library ecosystem
- **Performance**: Virtual DOM, efficient updates
- **Community**: Large community, extensive resources

### Why PostgreSQL?
- **Relational Data**: Cards, decks, users are relational
- **ACID**: Data consistency critical for learning progress
- **JSON Support**: Flexible for card options, metadata
- **Performance**: Mature, battle-tested, excellent query optimizer

### Why JWT?
- **Stateless**: No server-side session storage
- **Scalable**: Works across multiple backend instances
- **Standard**: Industry-standard, library support
- **Flexible**: Include custom claims

### Why SQLModel?
- **Type Safety**: Python types = SQL types
- **Developer Experience**: Single model for ORM + validation
- **FastAPI Integration**: Native support
- **SQLAlchemy Power**: Full SQLAlchemy underneath

## Security Architecture

### Defense in Depth

1. **Network Layer**
   - HTTPS only in production
   - CORS restrictions
   - Rate limiting (future)

2. **Application Layer**
   - Input validation (Pydantic)
   - Output encoding (automatic)
   - Authentication required for most endpoints
   - Authorization checks (user/admin)

3. **Data Layer**
   - Parameterized queries (SQL injection prevention)
   - Password hashing (Argon2)
   - Encrypted connections to database

4. **Client Layer**
   - React escaping (XSS prevention)
   - Secure token storage
   - No sensitive data in localStorage (only tokens)

See [Security Documentation](../deployment/security.md) for details.

## Monitoring and Observability

### Logging
- **Structured logging** via Loguru
- **Request IDs** for tracing
- **Log levels** by environment
- **JSON format** for parsing

### Metrics (Future)
- Request latency
- Error rates
- Database query performance
- User activity metrics

### Tracing (Future)
- Distributed tracing with OpenTelemetry
- Request flow across services
- Performance bottleneck identification

## Further Reading

- [Backend Architecture](./backend-architecture.md) - Detailed backend design
- [Frontend Architecture](./frontend-architecture.md) - Detailed frontend design
- [Database Schema](./database-schema.md) - Complete data model
- [API Reference](../api/overview.md) - API documentation

---

This architecture prioritizes **developer experience**, **type safety**, **testability**, and **scalability** while keeping the stack modern and maintainable.
