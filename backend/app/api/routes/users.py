from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from ...api.deps import get_current_active_user
from ...db.session import get_db
from ...models import Deck, User, UserDeckProgress
from ...schemas.common import Message
from ...schemas.user import UserRead, UserUpdate, UserSettingsUpdate
from ...services.auth import hash_password, verify_password
from ...services import streak as streak_service


router = APIRouter(prefix="/me", tags=["users"])


@router.get("", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_active_user)) -> User:
    return current_user


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.put("/password", response_model=Message)
def change_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Message:
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid current password")
    current_user.hashed_password = hash_password(payload.new_password)
    db.add(current_user)
    db.commit()
    return Message(message="Password updated")


@router.delete("", response_model=Message)
def delete_account(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Message:
    db.delete(current_user)
    db.commit()
    return Message(message="Account deleted")


class PinDeckPayload(BaseModel):
    pinned: bool


@router.put("/decks/{deck_id}/pin", response_model=Message)
def toggle_pin_deck(
    deck_id: int,
    payload: PinDeckPayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Message:
    deck = db.get(Deck, deck_id)
    if not deck:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")
    progress = db.exec(
        select(UserDeckProgress).where(UserDeckProgress.user_id == current_user.id, UserDeckProgress.deck_id == deck_id)
    ).first()
    if not progress:
        progress = UserDeckProgress(user_id=current_user.id, deck_id=deck_id, percent_complete=0.0)
        db.add(progress)
    progress.pinned = payload.pinned
    db.add(progress)
    db.commit()
    db.refresh(progress)
    return Message(message="Deck pin updated")


class StreakResponse(BaseModel):
    current_streak: int
    longest_streak: int
    last_activity_date: Optional[date]
    is_active: bool


@router.get("/streak", response_model=StreakResponse)
def get_user_streak(
    current_user: User = Depends(get_current_active_user),
) -> StreakResponse:
    """Get the current user's streak statistics."""
    stats = streak_service.get_streak_stats(current_user)
    return StreakResponse(**stats)


@router.put("/settings", response_model=UserRead)
def update_llm_settings(
    payload: UserSettingsUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> User:
    """Update user's LLM settings (API keys and provider preference)."""
    # Update API key if provided
    if payload.openai_api_key is not None:
        # Empty string means remove the key
        if payload.openai_api_key == "":
            current_user.openai_api_key = None
        else:
            # Basic validation - OpenAI keys start with 'sk-'
            if not payload.openai_api_key.startswith("sk-"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid OpenAI API key format. Keys should start with 'sk-'"
                )
            current_user.openai_api_key = payload.openai_api_key

    # Update provider preference if provided
    if payload.llm_provider_preference is not None:
        current_user.llm_provider_preference = payload.llm_provider_preference

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

