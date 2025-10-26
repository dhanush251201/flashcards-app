from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, Enum, func
from sqlmodel import Field, Relationship, SQLModel

from .enums import UserRole


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, sa_column_kwargs={"unique": True})
    hashed_password: str = Field(nullable=False)
    full_name: Optional[str] = Field(default=None, nullable=True)
    role: UserRole = Field(default=UserRole.USER, sa_column=Column(Enum(UserRole, name="user_role")))
    is_active: bool = Field(default=True)

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

    decks: list["Deck"] = Relationship(back_populates="owner")
    quiz_sessions: list["QuizSession"] = Relationship(back_populates="user")
    deck_progresses: list["UserDeckProgress"] = Relationship(back_populates="user")
    srs_reviews: list["SRSReview"] = Relationship(back_populates="user")


from .deck import Deck  # noqa: E402  # circular import resolution
from .study import QuizSession, SRSReview, UserDeckProgress  # noqa: E402
