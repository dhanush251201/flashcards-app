from typing import Optional

from sqlalchemy import Column, String
from sqlmodel import Field, Relationship, SQLModel

from .deck import DeckTagLink


class Tag(SQLModel, table=True):
    __tablename__ = "tags"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(sa_column=Column(String(64), unique=True, nullable=False, index=True))

    decks: list["Deck"] = Relationship(back_populates="tags", link_model=DeckTagLink)


from .deck import Deck  # noqa: E402

