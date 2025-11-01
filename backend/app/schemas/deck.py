from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from ..models.enums import QuizMode
from .card import CardCreate, CardRead


class TagBase(BaseModel):
    name: str


class TagRead(TagBase):
    id: int


class DeckBase(BaseModel):
    title: str
    description: Optional[str] = None
    is_public: bool = True
    tag_names: List[str] = Field(default_factory=list)


class DeckCreate(DeckBase):
    cards: Optional[List[CardCreate]] = None  # optional bulk creation helper


class DeckUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    tag_names: Optional[List[str]] = None


class DeckSummary(BaseModel):
    id: int
    title: str
    description: Optional[str]
    is_public: bool
    card_count: int
    due_count: int
    tags: List[TagRead]
    is_pinned: bool = False


class DeckRead(DeckBase):
    id: int
    owner_user_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    tags: List[TagRead] = Field(default_factory=list)
    cards: List[CardRead] = Field(default_factory=list)
