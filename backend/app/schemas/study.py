from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from ..models.enums import QuizMode, QuizStatus


class StudySessionConfig(BaseModel):
    question_count: Optional[int] = None
    time_limit_seconds: Optional[int] = None
    endless: bool = False


class StudySessionCreate(BaseModel):
    deck_id: int
    mode: QuizMode
    config: Optional[StudySessionConfig] = None


class StudySessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    deck_id: int
    user_id: int
    mode: QuizMode
    status: QuizStatus
    started_at: datetime
    ended_at: Optional[datetime]
    config: Optional[StudySessionConfig]


class StudySessionUpdate(BaseModel):
    status: Optional[QuizStatus] = None
    ended_at: Optional[datetime] = None


class StudyAnswerCreate(BaseModel):
    card_id: int
    user_answer: Optional[str] = None
    quality: Optional[int] = None


class StudyAnswerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    card_id: int
    session_id: int
    user_answer: Optional[str]
    is_correct: Optional[bool]
    quality: Optional[int]
    responded_at: datetime
    llm_feedback: Optional[str] = None


class DueReviewCard(BaseModel):
    card_id: int
    deck_id: int
    due_at: datetime
    repetitions: int
    interval_days: int
    easiness: float


class SessionStatistics(BaseModel):
    total_responses: int
    correct_count: int
    incorrect_count: int
    unanswered_count: int


class ActivityData(BaseModel):
    date: str
    count: int
