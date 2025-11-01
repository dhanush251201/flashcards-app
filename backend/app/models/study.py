from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, Enum, Float, Integer, JSON, UniqueConstraint, func
from sqlmodel import Field, Relationship, SQLModel

from .enums import QuizMode, QuizStatus

quiz_mode_enum = Enum(
    QuizMode,
    name="quiz_mode",
    values_callable=lambda enum_cls: [member.value for member in enum_cls],
    validate_strings=True,
)

quiz_status_enum = Enum(
    QuizStatus,
    name="quiz_status",
    values_callable=lambda enum_cls: [member.value for member in enum_cls],
    validate_strings=True,
)


class UserDeckProgress(SQLModel, table=True):
    __tablename__ = "user_deck_progress"
    __table_args__ = (UniqueConstraint("user_id", "deck_id", name="uq_user_deck"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True, nullable=False)
    deck_id: int = Field(foreign_key="decks.id", index=True, nullable=False)
    percent_complete: float = Field(default=0.0)
    last_studied_at: datetime | None = Field(default=None, nullable=True)
    streak: int = Field(default=0)
    pinned: bool = Field(default=False, sa_column=Column(Boolean, nullable=False, server_default='0'))

    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=func.now(),
        )
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=func.now(),
            onupdate=func.now(),
        )
    )

    user: "User" = Relationship(back_populates="deck_progresses")
    deck: "Deck" = Relationship(back_populates="progresses")


class QuizSession(SQLModel, table=True):
    __tablename__ = "quiz_sessions"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True, nullable=False)
    deck_id: int = Field(foreign_key="decks.id", index=True, nullable=False)
    mode: QuizMode = Field(sa_column=Column(quiz_mode_enum, nullable=False))
    status: QuizStatus = Field(
        default=QuizStatus.ACTIVE,
        sa_column=Column(quiz_status_enum, nullable=False),
    )

    started_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    )
    ended_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True), nullable=True))
    config: dict | None = Field(default=None, sa_column=Column(JSON, nullable=True))

    user: "User" = Relationship(back_populates="quiz_sessions")
    deck: "Deck" = Relationship(back_populates="quiz_sessions")
    responses: list["QuizResponse"] = Relationship(back_populates="session")


class QuizResponse(SQLModel, table=True):
    __tablename__ = "quiz_responses"

    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="quiz_sessions.id", nullable=False, index=True)
    card_id: int = Field(foreign_key="cards.id", nullable=False, index=True)
    user_answer: str | None = Field(default=None)
    is_correct: Optional[bool] = Field(default=None, sa_column=Column(Boolean, nullable=True))
    quality: int | None = Field(default=None)

    responded_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    )

    session: QuizSession = Relationship(back_populates="responses")
    card: "Card" = Relationship(back_populates="quiz_responses")


class SRSReview(SQLModel, table=True):
    __tablename__ = "srs_reviews"
    __table_args__ = (UniqueConstraint("user_id", "card_id", name="uq_review_user_card"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True, nullable=False)
    card_id: int = Field(foreign_key="cards.id", index=True, nullable=False)
    repetitions: int = Field(default=0)
    interval_days: int = Field(default=1)
    easiness: float = Field(default=2.5)
    due_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    )
    last_quality: int | None = Field(default=None)

    updated_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    )

    user: "User" = Relationship(back_populates="srs_reviews")
    card: "Card" = Relationship(back_populates="srs_reviews")


from .card import Card  # noqa: E402
from .deck import Deck  # noqa: E402
from .user import User  # noqa: E402
