"""Service for managing flagged cards."""

from datetime import datetime, timezone
from typing import List

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlmodel import Session

from ..models import Card, Deck, FlaggedCard, User
from ..schemas.card import CardRead
from ..schemas.flagged_card import FlaggedCardCreate, FlaggedCardRead


def flag_card(db: Session, user: User, payload: FlaggedCardCreate) -> FlaggedCardRead:
    """
    Flag a card for the current user.

    Args:
        db: Database session
        user: Current user
        payload: Flag card request with card_id and deck_id

    Returns:
        The created flagged card record

    Raises:
        HTTPException: If card doesn't exist or is already flagged
    """
    # Verify card exists and belongs to the specified deck
    card = db.get(Card, payload.card_id)
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found"
        )

    if card.deck_id != payload.deck_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Card does not belong to the specified deck"
        )

    # Check if already flagged using scalars to get model objects
    stmt = select(FlaggedCard).where(
        FlaggedCard.user_id == user.id,
        FlaggedCard.card_id == payload.card_id
    )
    existing = db.scalars(stmt).first()

    if existing:
        # Return existing flag instead of raising error
        return FlaggedCardRead(
            id=existing.id,
            user_id=existing.user_id,
            card_id=existing.card_id,
            deck_id=existing.deck_id,
            flagged_at=existing.flagged_at
        )

    # Create new flagged card
    flagged = FlaggedCard(
        user_id=user.id,
        card_id=payload.card_id,
        deck_id=payload.deck_id,
        flagged_at=datetime.now(tz=timezone.utc)
    )

    db.add(flagged)
    db.commit()
    db.refresh(flagged)

    return FlaggedCardRead(
        id=flagged.id,
        user_id=flagged.user_id,
        card_id=flagged.card_id,
        deck_id=flagged.deck_id,
        flagged_at=flagged.flagged_at
    )


def unflag_card(db: Session, user: User, card_id: int) -> None:
    """
    Unflag a card for the current user.

    Args:
        db: Database session
        user: Current user
        card_id: ID of the card to unflag

    Raises:
        HTTPException: If card is not flagged
    """
    stmt = select(FlaggedCard).where(
        FlaggedCard.user_id == user.id,
        FlaggedCard.card_id == card_id
    )
    flagged = db.scalars(stmt).first()

    if not flagged:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card is not flagged"
        )

    db.delete(flagged)
    db.commit()


def get_flagged_cards_for_deck(db: Session, user: User, deck_id: int) -> List[CardRead]:
    """
    Get all flagged cards for a specific deck and user.

    Args:
        db: Database session
        user: Current user
        deck_id: ID of the deck

    Returns:
        List of flagged cards with full card details
    """
    # Verify deck exists
    deck = db.get(Deck, deck_id)
    if not deck:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deck not found"
        )

    # Get flagged cards for this deck and user
    flagged_cards = db.scalars(
        select(FlaggedCard).where(
            FlaggedCard.user_id == user.id,
            FlaggedCard.deck_id == deck_id
        )
    ).all()

    # Get card IDs
    card_ids = [fc.card_id for fc in flagged_cards]

    if not card_ids:
        return []

    # Fetch full card details using scalars to get Card objects
    cards = db.scalars(
        select(Card).where(Card.id.in_(card_ids))
    ).all()

    return [CardRead.model_validate(card) for card in cards]


def get_flagged_card_ids_for_deck(db: Session, user: User, deck_id: int) -> List[int]:
    """
    Get list of flagged card IDs for a specific deck and user.

    Args:
        db: Database session
        user: Current user
        deck_id: ID of the deck

    Returns:
        List of card IDs that are flagged
    """
    # Select entire FlaggedCard object to avoid tuple results
    flagged_cards = db.scalars(
        select(FlaggedCard).where(
            FlaggedCard.user_id == user.id,
            FlaggedCard.deck_id == deck_id
        )
    ).all()

    # Extract card_id from each FlaggedCard object
    return [fc.card_id for fc in flagged_cards]


def get_flagged_cards_count_by_deck(db: Session, user: User) -> dict[int, int]:
    """
    Get count of flagged cards per deck for a user.

    Args:
        db: Database session
        user: Current user

    Returns:
        Dictionary mapping deck_id to count of flagged cards
    """
    from sqlalchemy import func as sql_func

    results = db.exec(
        select(
            FlaggedCard.deck_id,
            sql_func.count(FlaggedCard.id).label("count")
        )
        .where(FlaggedCard.user_id == user.id)
        .group_by(FlaggedCard.deck_id)
    ).all()

    return {deck_id: count for deck_id, count in results}


def is_card_flagged(db: Session, user: User, card_id: int) -> bool:
    """
    Check if a specific card is flagged by the user.

    Args:
        db: Database session
        user: Current user
        card_id: ID of the card to check

    Returns:
        True if card is flagged, False otherwise
    """
    stmt = select(FlaggedCard).where(
        FlaggedCard.user_id == user.id,
        FlaggedCard.card_id == card_id
    )
    flagged = db.scalars(stmt).first()

    return flagged is not None
