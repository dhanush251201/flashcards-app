"""Pydantic schemas for API inputs and outputs."""

from .auth import LoginRequest, RefreshRequest, RefreshResponse, SignupRequest, Token
from .card import CardCreate, CardRead, CardUpdate
from .common import IDModelMixin, Message, Paginated, TimestampedModel
from .deck import DeckCreate, DeckRead, DeckSummary, DeckUpdate, TagRead
from .study import (
    DueReviewCard,
    StudyAnswerCreate,
    StudyAnswerRead,
    StudySessionConfig,
    StudySessionCreate,
    StudySessionRead,
    StudySessionUpdate,
)
from .user import UserCreate, UserRead, UserUpdate

__all__ = [
    "CardCreate",
    "CardRead",
    "CardUpdate",
    "DeckCreate",
    "DeckRead",
    "DeckSummary",
    "DeckUpdate",
    "DueReviewCard",
    "IDModelMixin",
    "LoginRequest",
    "Message",
    "Paginated",
    "RefreshRequest",
    "RefreshResponse",
    "SignupRequest",
    "StudyAnswerCreate",
    "StudyAnswerRead",
    "StudySessionConfig",
    "StudySessionCreate",
    "StudySessionRead",
    "StudySessionUpdate",
    "TagRead",
    "TimestampedModel",
    "Token",
    "UserCreate",
    "UserRead",
    "UserUpdate",
]

