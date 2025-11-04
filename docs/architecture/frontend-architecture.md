# Frontend Architecture

The Flash-Decks frontend is a modern single-page application built with React and TypeScript, emphasizing component reusability, type safety, and excellent user experience.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Core Concepts](#core-concepts)
- [State Management](#state-management)
- [Routing Architecture](#routing-architecture)
- [Component Architecture](#component-architecture)
- [API Integration](#api-integration)
- [Styling System](#styling-system)
- [Type System](#type-system)
- [Performance Optimizations](#performance-optimizations)

## Overview

The frontend is a React-based SPA that provides an intuitive interface for:
- User authentication and profile management
- Creating and organizing flashcard decks
- Studying with multiple card types and modes
- Tracking progress and streaks
- Theme customization (dark/light mode)

**Key Characteristics:**
- **Type-Safe**: Full TypeScript coverage
- **Responsive**: Mobile-first design with Tailwind CSS
- **Fast**: Vite for lightning-fast builds and HMR
- **Modern**: React 18 with hooks, concurrent features
- **Accessible**: Semantic HTML, ARIA labels, keyboard navigation

## Technology Stack

### Core Libraries

- **React 18.2** - UI library with concurrent features
- **TypeScript 5.3** - Type-safe JavaScript
- **Vite 5.0** - Build tool and dev server
- **React Router v6** - Client-side routing

### State Management

- **Zustand 4.4** - Lightweight state management for auth
- **React Query 5.x** (TanStack Query) - Server state management

### Styling

- **Tailwind CSS 3.4** - Utility-first CSS framework
- **Class Variance Authority** - Component variant management
- **Tailwind Merge** - Conflict-free class merging

### HTTP & Data

- **Axios 1.6** - HTTP client with interceptors
- **Day.js 1.11** - Date manipulation library

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Vitest** - Unit testing framework
- **React Testing Library** - Component testing

## Project Structure

```
frontend/
├── public/                    # Static assets
│   ├── favicon.ico
│   └── logo.svg
│
├── src/
│   ├── main.tsx              # Application entry point
│   ├── App.tsx               # Root component with routing
│   ├── index.css             # Global styles and Tailwind imports
│   │
│   ├── components/            # Reusable components
│   │   ├── cards/
│   │   │   ├── Flashcard.tsx          # Main flashcard component
│   │   │   └── Flashcard.test.tsx
│   │   ├── decks/
│   │   │   ├── DeckCard.tsx           # Deck preview card
│   │   │   ├── DeckForm.tsx           # Create/edit deck form
│   │   │   └── DeckCard.test.tsx
│   │   ├── layout/
│   │   │   ├── AppShell.tsx           # Authenticated app layout
│   │   │   └── Header.tsx             # App header
│   │   ├── navigation/
│   │   │   ├── SidebarNav.tsx         # Sidebar navigation
│   │   │   └── ThemeToggle.tsx        # Dark/light mode toggle
│   │   └── ui/                        # Generic UI components
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       └── Card.tsx
│   │
│   ├── pages/                 # Page components
│   │   ├── LandingPage.tsx           # Public landing page
│   │   ├── LoginPage.tsx             # Login form
│   │   ├── SignupPage.tsx            # Registration form
│   │   ├── DashboardPage.tsx         # Main dashboard
│   │   ├── DeckDetailPage.tsx        # Deck details with cards
│   │   └── StudySessionPage.tsx      # Study interface
│   │
│   ├── routes/                # Route guards
│   │   ├── ProtectedRoute.tsx        # Requires authentication
│   │   └── PublicOnlyRoute.tsx       # Redirects if authenticated
│   │
│   ├── store/                 # Global state
│   │   └── authStore.ts              # Zustand auth store
│   │
│   ├── lib/                   # Core utilities
│   │   ├── apiClient.ts              # Axios instance with interceptors
│   │   └── queryClient.ts            # React Query configuration
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAuth.ts                # Authentication hook
│   │   ├── useDecks.ts               # Deck data fetching
│   │   ├── useStudySession.ts        # Study session management
│   │   └── useTheme.ts               # Theme management
│   │
│   ├── types/                 # TypeScript definitions
│   │   ├── api.ts                    # API response types
│   │   ├── deck.ts                   # Deck-related types
│   │   ├── card.ts                   # Card-related types
│   │   ├── study.ts                  # Study session types
│   │   └── user.ts                   # User types
│   │
│   ├── providers/             # Context providers
│   │   ├── ThemeProvider.tsx         # Theme context
│   │   └── QueryProvider.tsx         # React Query provider
│   │
│   └── utils/                 # Utility functions
│       ├── cn.ts                     # Class name utility
│       ├── formatters.ts             # Date/number formatting
│       └── validators.ts             # Form validation helpers
│
├── index.html                 # HTML entry point
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── vite.config.ts             # Vite configuration
├── .eslintrc.cjs              # ESLint configuration
└── vitest.config.ts           # Vitest configuration
```

## Core Concepts

### 1. Component-Based Architecture

Everything is a component - from small buttons to entire pages. Components are:
- **Focused**: Single responsibility
- **Reusable**: Used across multiple contexts
- **Composable**: Combined to build complex UIs
- **Testable**: Isolated, pure functions of props/state

### 2. Unidirectional Data Flow

```
User Action → Event Handler → State Update → Re-render → UI Update
```

### 3. Separation of Concerns

- **Components**: Presentation and UI logic
- **Hooks**: Reusable stateful logic
- **Services**: API communication (via hooks)
- **Stores**: Global application state
- **Types**: Data structures and contracts

### 4. Type Safety

TypeScript ensures:
- Compile-time error detection
- Autocomplete and IntelliSense
- Refactoring confidence
- Self-documenting code

## State Management

### Local State (useState)

For component-specific state:

```typescript
const [isFlipped, setIsFlipped] = useState(false);
const [selectedOption, setSelectedOption] = useState<string | null>(null);
```

### Global State (Zustand)

For authentication state that needs to persist:

```typescript
// store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isHydrated: boolean;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: AuthUser | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isHydrated: false,

      setTokens: (access, refresh) =>
        set({ accessToken: access, refreshToken: refresh }),

      setUser: (user) => set({ user }),

      clear: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
        }),
    }),
    {
      name: 'flashdecks-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated?.(true);
      },
    }
  )
);

// Usage in components:
const { user, accessToken, setUser, clear } = useAuthStore();
```

### Server State (React Query)

For data from the API:

```typescript
// hooks/useDecks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { Deck, DeckCreate } from '@/types/deck';

export function useDecks(filters?: DecksFilters) {
  return useQuery({
    queryKey: ['decks', filters],
    queryFn: async () => {
      const { data } = await apiClient.get<Deck[]>('/decks', {
        params: filters,
      });
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateDeck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deck: DeckCreate) => {
      const { data } = await apiClient.post<Deck>('/decks', deck);
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch decks list
      queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
  });
}

// Usage in components:
const { data: decks, isLoading, error } = useDecks({ is_public: true });
const createDeck = useCreateDeck();

const handleCreate = (deck: DeckCreate) => {
  createDeck.mutate(deck, {
    onSuccess: () => toast.success('Deck created!'),
    onError: (error) => toast.error(error.message),
  });
};
```

**Why React Query?**
- Automatic caching
- Background refetching
- Optimistic updates
- Request deduplication
- Pagination support
- Stale-while-revalidate pattern

## Routing Architecture

### Route Configuration

```typescript
// App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />

        {/* Public-only routes (redirect if authenticated) */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        {/* Protected routes (require authentication) */}
        <Route path="/app" element={<ProtectedRoute />}>
          <Route element={<AppShell><DashboardPage /></AppShell>} path="dashboard" />
          <Route element={<AppShell><DeckDetailPage /></AppShell>} path="decks/:deckId" />
          <Route element={<AppShell><StudySessionPage /></AppShell>} path="study/:sessionId" />
          <Route path="" element={<Navigate to="/app/dashboard" replace />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
```

### Route Guards

**Protected Route:**
```typescript
// routes/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export const ProtectedRoute = () => {
  const { accessToken, isHydrated } = useAuthStore();

  // Wait for localStorage rehydration
  if (!isHydrated) {
    return <div>Loading...</div>;
  }

  // Redirect to login if not authenticated
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
```

**Public Only Route:**
```typescript
// routes/PublicOnlyRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export const PublicOnlyRoute = () => {
  const { accessToken, isHydrated } = useAuthStore();

  if (!isHydrated) {
    return <div>Loading...</div>;
  }

  // Redirect to dashboard if already authenticated
  if (accessToken) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <Outlet />;
};
```

### Programmatic Navigation

```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

// Navigate to deck detail
navigate(`/app/decks/${deckId}`);

// Navigate with state
navigate('/app/study/123', { state: { from: 'dashboard' } });

// Go back
navigate(-1);
```

## Component Architecture

### Component Types

**1. Page Components**
- Top-level route components
- Data fetching and state management
- Composition of smaller components

```typescript
// pages/DashboardPage.tsx
export const DashboardPage = () => {
  const { data: decks, isLoading } = useDecks();
  const { data: dueCount } = useDueReviewsCount();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <StatsGrid totalDecks={decks.length} dueReviews={dueCount} />

      <DecksGrid decks={decks} />
    </div>
  );
};
```

**2. Layout Components**
- Structural components
- Wrap pages with consistent layout

```typescript
// components/layout/AppShell.tsx
export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
};
```

**3. Feature Components**
- Domain-specific logic
- Connected to API/state

```typescript
// components/cards/Flashcard.tsx
interface FlashcardProps {
  card: Card;
  isFlipped: boolean;
  onFlip: () => void;
  showAnswer?: boolean;
}

export const Flashcard: React.FC<FlashcardProps> = ({
  card,
  isFlipped,
  onFlip,
  showAnswer = false,
}) => {
  return (
    <div
      className={cn(
        'flashcard relative h-96 w-full cursor-pointer',
        'transition-transform duration-500',
        isFlipped && 'rotate-y-180'
      )}
      onClick={onFlip}
    >
      <div className="flashcard-face front">
        <CardContent type={card.type} content={card.prompt} />
      </div>

      {(isFlipped || showAnswer) && (
        <div className="flashcard-face back">
          <CardContent type={card.type} content={card.answer} />
          {card.explanation && (
            <p className="text-sm text-gray-600 mt-4">{card.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
};
```

**4. UI Components**
- Generic, reusable
- No business logic
- Styled with Tailwind

```typescript
// components/ui/Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading,
  children,
  className,
  ...props
}) => {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium',
        'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-brand-600 text-white hover:bg-brand-700': variant === 'primary',
          'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
          'border-2 border-gray-300 hover:bg-gray-50': variant === 'outline',
          'hover:bg-gray-100': variant === 'ghost',
        },
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-base': size === 'md',
          'px-6 py-3 text-lg': size === 'lg',
        },
        className
      )}
      disabled={isLoading}
      {...props}
    >
      {isLoading && <Spinner className="mr-2" />}
      {children}
    </button>
  );
};
```

### Component Patterns

**Compound Components:**
```typescript
<Modal>
  <Modal.Header>Create Deck</Modal.Header>
  <Modal.Body>
    <DeckForm />
  </Modal.Body>
  <Modal.Footer>
    <Button>Cancel</Button>
    <Button variant="primary">Create</Button>
  </Modal.Footer>
</Modal>
```

**Render Props:**
```typescript
<DataFetcher<Deck[]>
  queryKey={['decks']}
  queryFn={fetchDecks}
  render={({ data, isLoading }) => (
    isLoading ? <Spinner /> : <DecksList decks={data} />
  )}
/>
```

**Higher-Order Components (rarely used, prefer hooks):**
```typescript
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return (props: P) => {
    const { user } = useAuthStore();
    if (!user) return <Navigate to="/login" />;
    return <Component {...props} />;
  };
};
```

## API Integration

### API Client Setup

```typescript
// lib/apiClient.ts
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add auth token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle auth errors
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying, attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue requests while refreshing
        return new Promise((resolve) => {
          refreshSubscribers.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { refreshToken } = useAuthStore.getState();
        const { data } = await axios.post('/api/v1/auth/refresh', {
          refresh_token: refreshToken,
        });

        // Update tokens
        useAuthStore.getState().setTokens(data.access_token, data.refresh_token);

        // Retry queued requests
        refreshSubscribers.forEach((callback) => callback(data.access_token));
        refreshSubscribers = [];

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        useAuthStore.getState().clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export { apiClient };
```

### Custom Hooks for API

```typescript
// hooks/useStudySession.ts
export function useStudySession(sessionId: string) {
  return useQuery({
    queryKey: ['study-session', sessionId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/study/sessions/${sessionId}`);
      return data;
    },
    refetchInterval: false, // Don't auto-refetch
  });
}

export function useAnswerCard(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (answer: AnswerPayload) => {
      const { data } = await apiClient.post(
        `/study/sessions/${sessionId}/answer`,
        answer
      );
      return data;
    },
    onSuccess: () => {
      // Invalidate session to get updated state
      queryClient.invalidateQueries({ queryKey: ['study-session', sessionId] });
    },
  });
}
```

## Styling System

### Tailwind CSS

Utility-first approach for rapid UI development:

```tsx
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
    Spanish Vocabulary
  </h2>
  <span className="px-3 py-1 text-sm font-medium text-brand-600 bg-brand-50 rounded-full">
    Beginner
  </span>
</div>
```

### Custom Configuration

```typescript
// tailwind.config.ts
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        },
      },
      animation: {
        'flip': 'flip 0.6s ease-in-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        flip: {
          '0%, 100%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(180deg)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
```

### Class Utility

```typescript
// utils/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage:
<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  className // Props override
)} />
```

## Type System

### API Types

```typescript
// types/deck.ts
export interface Deck {
  id: number;
  title: string;
  description: string | null;
  is_public: boolean;
  owner_user_id: number;
  card_count: number;
  tags: Tag[];
  created_at: string;
  updated_at: string;
}

export interface DeckCreate {
  title: string;
  description?: string;
  is_public: boolean;
  tags: string[];
}

export type DeckUpdate = Partial<DeckCreate>;
```

### Component Props

```typescript
// components/cards/Flashcard.tsx
interface FlashcardProps {
  card: Card;
  isFlipped: boolean;
  onFlip: () => void;
  showAnswer?: boolean;
  className?: string;
}
```

### Generic Utility Types

```typescript
// types/utils.ts
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  per_page: number;
};
```

## Performance Optimizations

### Code Splitting

```typescript
// Lazy load pages
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const DeckDetailPage = lazy(() => import('@/pages/DeckDetailPage'));

<Suspense fallback={<LoadingSpinner />}>
  <DashboardPage />
</Suspense>
```

### Memoization

```typescript
import { memo, useMemo, useCallback } from 'react';

// Prevent unnecessary re-renders
export const DeckCard = memo(({ deck }: { deck: Deck }) => {
  return <div>{deck.title}</div>;
});

// Memoize expensive computations
const sortedDecks = useMemo(
  () => decks.sort((a, b) => b.card_count - a.card_count),
  [decks]
);

// Memoize callbacks
const handleClick = useCallback(() => {
  navigate(`/decks/${deck.id}`);
}, [deck.id, navigate]);
```

### Virtual Scrolling (Future)

For large lists:
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={decks.length}
  itemSize={100}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <DeckCard deck={decks[index]} />
    </div>
  )}
</FixedSizeList>
```

### Image Optimization

```typescript
// Lazy loading
<img src={image} alt="..." loading="lazy" />

// Responsive images
<img
  srcSet={`${image}-sm.jpg 480w, ${image}-md.jpg 800w, ${image}-lg.jpg 1200w`}
  sizes="(max-width: 600px) 480px, (max-width: 1200px) 800px, 1200px"
  src={image}
  alt="..."
/>
```

## Testing

```typescript
// components/cards/Flashcard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Flashcard } from './Flashcard';

describe('Flashcard', () => {
  const mockCard = {
    id: 1,
    type: 'basic',
    prompt: 'What is 2+2?',
    answer: '4',
  };

  it('renders prompt initially', () => {
    render(
      <Flashcard card={mockCard} isFlipped={false} onFlip={() => {}} />
    );
    expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
  });

  it('shows answer when flipped', () => {
    render(
      <Flashcard card={mockCard} isFlipped={true} onFlip={() => {}} />
    );
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('calls onFlip when clicked', () => {
    const onFlip = vi.fn();
    render(
      <Flashcard card={mockCard} isFlipped={false} onFlip={onFlip} />
    );
    fireEvent.click(screen.getByText('What is 2+2?'));
    expect(onFlip).toHaveBeenCalledTimes(1);
  });
});
```

## Further Reading

- [Backend Architecture](./backend-architecture.md)
- [Database Schema](./database-schema.md)
- [Component Guide](../development/components.md)
- [Testing Guide](../development/testing.md)

---

The frontend architecture emphasizes **type safety**, **performance**, **developer experience**, and **user experience** through modern React patterns and best practices.
