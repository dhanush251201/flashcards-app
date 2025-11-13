export type Tag = {
  id: number;
  name: string;
};

export type ClozeBlank = {
  answer: string | string[];  // Can be single answer or array of acceptable answers
};

export type ClozeData = {
  blanks: ClozeBlank[];
};

export type Card = {
  id: number;
  deck_id: number;
  type: "basic" | "multiple_choice" | "short_answer" | "cloze";
  prompt: string;
  answer: string;
  explanation?: string | null;
  options?: string[] | null;  // For MULTIPLE_CHOICE and SHORT_ANSWER (acceptable answers)
  cloze_data?: ClozeData | null;  // For CLOZE type cards
  created_at: string;
  updated_at: string;
};

export type DeckSummary = {
  id: number;
  title: string;
  description?: string | null;
  is_public: boolean;
  card_count: number;
  due_count: number;
  tags: Tag[];
  is_pinned: boolean;
};

export type DeckDetail = {
  id: number;
  title: string;
  description?: string | null;
  is_public: boolean;
  owner_user_id?: number | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
  tag_names: string[];
  cards: Card[];
};

export type StudySession = {
  id: number;
  deck_id: number;
  user_id: number;
  mode: "review" | "practice" | "exam";
  status: "active" | "completed";
  started_at: string;
  ended_at?: string | null;
  config?: {
    question_count?: number | null;
    time_limit_seconds?: number | null;
    endless?: boolean;
  } | null;
};

export type StudyResponse = {
  id: number;
  card_id: number;
  session_id: number;
  user_answer?: string | null;
  is_correct?: boolean | null;
  quality?: number | null;
  responded_at: string;
  llm_feedback?: string | null;
};

export type DueReviewCard = {
  card_id: number;
  deck_id: number;
  due_at: string;
  repetitions: number;
  interval_days: number;
  easiness: number;
};

export type StreakData = {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  is_active: boolean;
};

export type SessionStatistics = {
  total_responses: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
};

export type FlaggedCard = {
  id: number;
  user_id: number;
  card_id: number;
  deck_id: number;
  flagged_at: string;
};

export type User = {
  id: number;
  email: string;
  full_name?: string | null;
  role: "USER" | "ADMIN";
  is_active: boolean;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  llm_provider_preference?: string | null;
  has_openai_key: boolean;
  created_at: string;
  updated_at: string;
};

export type UserSettingsUpdate = {
  openai_api_key?: string | null;
  llm_provider_preference?: "openai" | "ollama" | null;
};

export type OllamaStatus = {
  available: boolean;
  message: string;
};

export type GeneratedCard = {
  type: "basic" | "multiple_choice" | "short_answer" | "cloze";
  prompt: string;
  answer: string;
  explanation?: string | null;
  options?: string[] | null;  // For MULTIPLE_CHOICE
  cloze_data?: ClozeData | null;  // For CLOZE type cards
};

export type GeneratedCardsResponse = {
  cards: GeneratedCard[];
  count: number;
};

export type CreateDeckFromCardsRequest = {
  title: string;
  description?: string;
  tag_names?: string[];
  cards: GeneratedCard[];
};

