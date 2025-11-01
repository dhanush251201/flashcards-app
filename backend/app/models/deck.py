from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Column, DateTime, String, Text, func
from sqlmodel import Field, Relationship, SQLModel


class DeckTagLink(SQLModel, table=True):
    __tablename__ = "deck_tags"

    deck_id: Optional[int] = Field(default=None, foreign_key="decks.id", primary_key=True)
    tag_id: Optional[int] = Field(default=None, foreign_key="tags.id", primary_key=True)


class Deck(SQLModel, table=True):
    __tablename__ = "decks"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(sa_column=Column(String(255), nullable=False, index=True))
    description: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    is_public: bool = Field(default=True)

    owner_user_id: Optional[int] = Field(default=None, foreign_key="users.id")

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

    metadata_json: dict | None = Field(
        default=None,
        sa_column=Column("metadata_json", JSON, nullable=True),
    )

    owner: Optional["User"] = Relationship(back_populates="decks")
    cards: list["Card"] = Relationship(back_populates="deck", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    tags: list["Tag"] = Relationship(back_populates="decks", link_model=DeckTagLink)
    progresses: list["UserDeckProgress"] = Relationship(back_populates="deck", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    quiz_sessions: list["QuizSession"] = Relationship(back_populates="deck", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


from .card import Card  # noqa: E402
from .study import QuizSession, UserDeckProgress  # noqa: E402
from .tag import Tag  # noqa: E402
from .user import User  # noqa: E402

