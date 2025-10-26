export type Tag = {
  id: number;
  name: string;
};

export type Card = {
  id: number;
  deck_id: number;
  type: "basic" | "multiple_choice" | "short_answer" | "cloze";
  prompt: string;
  answer: string;
  explanation?: string | null;
  options?: string[] | null;
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
};

export type DueReviewCard = {
  card_id: number;
  deck_id: number;
  due_at: string;
  repetitions: number;
  interval_days: number;
  easiness: number;
};

