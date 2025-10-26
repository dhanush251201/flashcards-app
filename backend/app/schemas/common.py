from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class IDModelMixin(BaseModel):
    id: int


class TimestampedModel(BaseModel):
    created_at: datetime
    updated_at: datetime


class Message(BaseModel):
    message: str


class Paginated(BaseModel):
    total: int
    items: list
    next_cursor: Optional[str] = None

