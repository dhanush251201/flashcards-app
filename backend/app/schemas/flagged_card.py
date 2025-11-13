"""Pydantic schemas for flagged cards."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FlaggedCardBase(BaseModel):
    """Base schema for flagged cards."""

    card_id: int
    deck_id: int


class FlaggedCardCreate(FlaggedCardBase):
    """Schema for creating a flagged card."""

    pass


class FlaggedCardRead(FlaggedCardBase):
    """Schema for reading a flagged card."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    flagged_at: datetime


class FlaggedCardDelete(BaseModel):
    """Schema for unflagging a card."""

    card_id: int
