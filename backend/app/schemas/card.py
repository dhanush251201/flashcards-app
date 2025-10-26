from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from ..models.enums import CardType


class CardBase(BaseModel):
    type: CardType = CardType.BASIC
    prompt: str
    answer: str
    explanation: Optional[str] = None
    options: Optional[List[str]] = None


class CardCreate(CardBase):
    pass


class CardUpdate(BaseModel):
    type: Optional[CardType] = None
    prompt: Optional[str] = None
    answer: Optional[str] = None
    explanation: Optional[str] = None
    options: Optional[List[str]] = Field(default=None)


class CardRead(CardBase):
    id: int
    deck_id: int
    created_at: datetime
    updated_at: datetime

