"""Flagged Card model for marking cards for review."""

from datetime import datetime
from typing import Optional

from pydantic import ConfigDict
from sqlalchemy import Column, DateTime, UniqueConstraint, func
from sqlmodel import Field, Relationship, SQLModel


class FlaggedCard(SQLModel, table=True):
    """Model for tracking user-flagged cards."""

    __tablename__ = "flagged_cards"
    __table_args__ = (UniqueConstraint("user_id", "card_id", name="uix_user_card_flag"),)
    model_config = ConfigDict(arbitrary_types_allowed=True)

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", nullable=False, index=True)
    card_id: int = Field(foreign_key="cards.id", nullable=False, index=True)
    deck_id: int = Field(foreign_key="decks.id", nullable=False, index=True)
    flagged_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=func.now(),
        )
    )

    # Relationships
    user: "User" = Relationship(back_populates="flagged_cards")
    card: "Card" = Relationship(back_populates="flagged_by_users")
    deck: "Deck" = Relationship(back_populates="flagged_cards")


from .card import Card  # noqa: E402
from .deck import Deck  # noqa: E402
from .user import User  # noqa: E402
