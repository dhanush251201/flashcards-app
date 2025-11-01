from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from ..models.enums import CardType


class CardBase(BaseModel):
    type: CardType = CardType.BASIC
    prompt: str
    answer: str
    explanation: Optional[str] = None
    options: Optional[List[str]] = None  # For MULTIPLE_CHOICE and SHORT_ANSWER (valid answers)
    cloze_data: Optional[Dict[str, Any]] = None  # For CLOZE type cards


class CardCreate(CardBase):
    pass


class CardUpdate(BaseModel):
    type: Optional[CardType] = None
    prompt: Optional[str] = None
    answer: Optional[str] = None
    explanation: Optional[str] = None
    options: Optional[List[str]] = Field(default=None)
    cloze_data: Optional[Dict[str, Any]] = Field(default=None)


class CardRead(CardBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    deck_id: int
    created_at: datetime
    updated_at: datetime

