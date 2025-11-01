from datetime import datetime
from typing import Optional

from pydantic import ConfigDict
from sqlalchemy import ARRAY, JSON, Column, DateTime, Enum, Text, func
from sqlmodel import Field, Relationship, SQLModel

from .enums import CardType

# Ensure the database enum stores the value (e.g. "multiple_choice") instead of the Enum name.
card_type_enum = Enum(
    CardType,
    name="card_type",
    values_callable=lambda enum_cls: [member.value for member in enum_cls],
    validate_strings=True,
)


class Card(SQLModel, table=True):
    __tablename__ = "cards"
    model_config = ConfigDict(arbitrary_types_allowed=True)

    id: Optional[int] = Field(default=None, primary_key=True)
    deck_id: int = Field(foreign_key="decks.id", nullable=False, index=True)
    type: CardType = Field(default=CardType.BASIC, sa_column=Column(card_type_enum, nullable=False))
    prompt: str = Field(sa_column=Column(Text, nullable=False))
    answer: str = Field(sa_column=Column(Text, nullable=False))
    explanation: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    options: Optional[list[str]] = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
    )
    cloze_data: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
    )

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

    deck: "Deck" = Relationship(back_populates="cards")
    quiz_responses: list["QuizResponse"] = Relationship(back_populates="card")
    srs_reviews: list["SRSReview"] = Relationship(back_populates="card")


from .deck import Deck  # noqa: E402
from .study import QuizResponse, SRSReview  # noqa: E402
