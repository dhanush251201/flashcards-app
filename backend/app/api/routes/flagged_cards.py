"""API routes for flagged cards functionality."""

from typing import List

from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from ...api.deps import get_current_active_user
from ...db.session import get_db
from ...models import User
from ...schemas.card import CardRead
from ...schemas.common import Message
from ...schemas.flagged_card import FlaggedCardCreate, FlaggedCardDelete, FlaggedCardRead
from ...services import flagged_cards as flagged_cards_service

router = APIRouter(prefix="/flagged-cards", tags=["flagged-cards"])


@router.post("", response_model=FlaggedCardRead, status_code=status.HTTP_201_CREATED)
def flag_card(
    payload: FlaggedCardCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> FlaggedCardRead:
    """
    Flag a card for review.

    This endpoint allows users to mark a card for later review.
    If the card is already flagged, it returns the existing flag.
    """
    return flagged_cards_service.flag_card(db, current_user, payload)


@router.delete("/{card_id}", response_model=Message)
def unflag_card(
    card_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Message:
    """
    Unflag a card.

    This endpoint removes the flag from a previously flagged card.
    """
    flagged_cards_service.unflag_card(db, current_user, card_id)
    return Message(message="Card unflagged successfully")


@router.get("/deck/{deck_id}", response_model=List[CardRead])
def get_flagged_cards_for_deck(
    deck_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> List[CardRead]:
    """
    Get all flagged cards for a specific deck.

    Returns a list of cards that have been flagged by the current user
    for the specified deck.
    """
    return flagged_cards_service.get_flagged_cards_for_deck(db, current_user, deck_id)


@router.get("/deck/{deck_id}/ids", response_model=List[int])
def get_flagged_card_ids(
    deck_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> List[int]:
    """
    Get IDs of all flagged cards for a specific deck.

    Returns a list of card IDs that have been flagged by the current user
    for the specified deck. Useful for checking which cards are flagged
    without fetching full card details.
    """
    return flagged_cards_service.get_flagged_card_ids_for_deck(db, current_user, deck_id)


@router.get("/check/{card_id}", response_model=dict)
def check_if_card_is_flagged(
    card_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Check if a specific card is flagged.

    Returns a boolean indicating whether the card is flagged by the current user.
    """
    is_flagged = flagged_cards_service.is_card_flagged(db, current_user, card_id)
    return {"is_flagged": is_flagged}


@router.get("/counts", response_model=dict)
def get_flagged_counts_by_deck(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Get count of flagged cards per deck.

    Returns a dictionary mapping deck IDs to the count of flagged cards
    for the current user.
    """
    counts = flagged_cards_service.get_flagged_cards_count_by_deck(db, current_user)
    return {"counts": counts}


@router.get("/deck/{deck_id}/count", response_model=dict)
def get_flagged_count_for_deck(
    deck_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Get count of flagged cards for a specific deck.

    Returns the number of flagged cards for the specified deck.
    """
    cards = flagged_cards_service.get_flagged_card_ids_for_deck(db, current_user, deck_id)
    return {"count": len(cards)}
