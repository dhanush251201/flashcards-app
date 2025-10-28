from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from ...api.deps import get_current_active_user, get_current_user_optional
from ...db.session import get_db
from ...models import Card, Deck, User
from ...models.enums import UserRole
from ...schemas.card import CardCreate, CardRead, CardUpdate
from ...schemas.common import Message
from ...schemas.deck import DeckCreate, DeckRead, DeckSummary, DeckUpdate, TagRead
from ...services import decks as deck_service


router = APIRouter(prefix="/decks", tags=["decks"])


@router.get("", response_model=list[DeckSummary])
def list_decks(
    *,
    db: Session = Depends(get_db),
    q: str | None = Query(default=None, description="Search decks by title"),
    tag: str | None = Query(default=None, description="Filter by tag"),
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User | None = Depends(get_current_user_optional),
) -> list[DeckSummary]:
    summaries, _ = deck_service.list_decks(db, current_user, search=q, tag=tag, limit=limit, offset=offset)
    return summaries


@router.get("/{deck_id}", response_model=DeckRead)
def read_deck(
    deck_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
) -> DeckRead:
    deck = deck_service.get_deck_by_id(db, deck_id)
    if not deck.is_public and (not current_user or deck.owner_user_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Deck is private")
    return DeckRead(
        id=deck.id,
        title=deck.title,
        description=deck.description,
        is_public=deck.is_public,
        owner_user_id=deck.owner_user_id,
        created_at=deck.created_at,
        updated_at=deck.updated_at,
        tags=[TagRead(id=tag.id, name=tag.name) for tag in deck.tags],
        cards=[
            CardRead(
                id=card.id,
                deck_id=card.deck_id,
                type=card.type,
                prompt=card.prompt,
                answer=card.answer,
                explanation=card.explanation,
                options=card.options,
                cloze_data=card.cloze_data,
                created_at=card.created_at,
                updated_at=card.updated_at,
            )
            for card in deck.cards
        ],
        tag_names=[tag.name for tag in deck.tags],
    )


@router.post("", response_model=DeckRead, status_code=status.HTTP_201_CREATED)
def create_deck(
    payload: DeckCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> DeckRead:
    deck = deck_service.create_deck(db, current_user, payload)
    return DeckRead(
        id=deck.id,
        title=deck.title,
        description=deck.description,
        is_public=deck.is_public,
        owner_user_id=deck.owner_user_id,
        created_at=deck.created_at,
        updated_at=deck.updated_at,
        tags=[TagRead(id=tag.id, name=tag.name) for tag in deck.tags],
        cards=[
            CardRead(
                id=card.id,
                deck_id=card.deck_id,
                type=card.type,
                prompt=card.prompt,
                answer=card.answer,
                explanation=card.explanation,
                options=card.options,
                cloze_data=card.cloze_data,
                created_at=card.created_at,
                updated_at=card.updated_at,
            )
            for card in deck.cards
        ],
        tag_names=[tag.name for tag in deck.tags],
    )


@router.put("/{deck_id}", response_model=DeckRead)
def update_deck(
    deck_id: int,
    payload: DeckUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> DeckRead:
    deck = deck_service.get_deck_by_id(db, deck_id)
    if current_user.role != UserRole.ADMIN and deck.owner_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    deck = deck_service.update_deck(db, deck, payload)
    return DeckRead(
        id=deck.id,
        title=deck.title,
        description=deck.description,
        is_public=deck.is_public,
        owner_user_id=deck.owner_user_id,
        created_at=deck.created_at,
        updated_at=deck.updated_at,
        tags=[TagRead(id=tag.id, name=tag.name) for tag in deck.tags],
        cards=[
            CardRead(
                id=card.id,
                deck_id=card.deck_id,
                type=card.type,
                prompt=card.prompt,
                answer=card.answer,
                explanation=card.explanation,
                options=card.options,
                cloze_data=card.cloze_data,
                created_at=card.created_at,
                updated_at=card.updated_at,
            )
            for card in deck.cards
        ],
        tag_names=[tag.name for tag in deck.tags],
    )


@router.delete("/{deck_id}", response_model=Message)
def delete_deck(
    deck_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Message:
    deck = deck_service.get_deck_by_id(db, deck_id)
    if current_user.role != UserRole.ADMIN and deck.owner_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    deck_service.delete_deck(db, deck)
    return Message(message="Deck deleted")


@router.post("/{deck_id}/cards", response_model=CardRead, status_code=status.HTTP_201_CREATED)
def add_card(
    deck_id: int,
    payload: CardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CardRead:
    deck = deck_service.get_deck_by_id(db, deck_id)
    if current_user.role != UserRole.ADMIN and deck.owner_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    card = deck_service.attach_card_to_deck(db, deck, payload)
    return CardRead(
        id=card.id,
        deck_id=card.deck_id,
        type=card.type,
        prompt=card.prompt,
        answer=card.answer,
        explanation=card.explanation,
        options=card.options,
        created_at=card.created_at,
        updated_at=card.updated_at,
    )


@router.put("/cards/{card_id}", response_model=CardRead)
def edit_card(
    card_id: int,
    payload: CardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CardRead:
    card = db.get(Card, card_id)
    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    deck = deck_service.get_deck_by_id(db, card.deck_id)
    if current_user.role != UserRole.ADMIN and deck.owner_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    card = deck_service.update_card(db, card, payload)
    return CardRead(
        id=card.id,
        deck_id=card.deck_id,
        type=card.type,
        prompt=card.prompt,
        answer=card.answer,
        explanation=card.explanation,
        options=card.options,
        created_at=card.created_at,
        updated_at=card.updated_at,
    )


@router.delete("/cards/{card_id}", response_model=Message)
def remove_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Message:
    card = db.get(Card, card_id)
    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    deck = deck_service.get_deck_by_id(db, card.deck_id)
    if current_user.role != UserRole.ADMIN and deck.owner_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    deck_service.delete_card(db, card)
    return Message(message="Card deleted")
