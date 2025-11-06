from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field, model_validator

from ..models.enums import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=64)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=64)


class UserSettingsUpdate(BaseModel):
    """Schema for updating user LLM settings"""
    openai_api_key: Optional[str] = None
    llm_provider_preference: Optional[str] = Field(default=None, pattern="^(openai|ollama)$")


class UserRead(UserBase):
    id: int
    role: UserRole
    is_active: bool
    current_streak: int
    longest_streak: int
    last_activity_date: Optional[date]
    llm_provider_preference: Optional[str] = None
    has_openai_key: bool = False  # Indicates if user has set an API key (without exposing it)
    created_at: datetime
    updated_at: datetime

    @model_validator(mode='before')
    @classmethod
    def compute_has_openai_key(cls, data: Any) -> Any:
        """Compute has_openai_key from the User model's openai_api_key field"""
        if isinstance(data, dict):
            data['has_openai_key'] = bool(data.get('openai_api_key'))
        else:
            # Handle SQLModel instances
            data_dict = {}
            for field in ['id', 'email', 'full_name', 'role', 'is_active', 'current_streak',
                         'longest_streak', 'last_activity_date', 'llm_provider_preference',
                         'created_at', 'updated_at']:
                if hasattr(data, field):
                    data_dict[field] = getattr(data, field)
            data_dict['has_openai_key'] = bool(getattr(data, 'openai_api_key', None))
            return data_dict
        return data


class UserInDB(UserRead):
    hashed_password: str
