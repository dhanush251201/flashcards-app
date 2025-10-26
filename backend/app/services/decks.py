from collections.abc import Iterable
from typing import Tuple

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from sqlmodel import Session

from ..models import Card, CardType, Deck, DeckTagLink, SRSReview, Tag, User
from ..schemas.card import CardCreate, CardUpdate
from ..schemas.deck import DeckCreate, DeckRead, DeckSummary, DeckUpdate, TagRead


def _resolve_tags(db: Session, tag_names: Iterable[str]) -> list[Tag]:
    tag_list: list[Tag] = []
    for name in set(tag_names):
        name_clean = name.strip()
        if not name_clean:
            continue
        tag = db.exec(select(Tag).where(Tag.name == name_clean)).first()
        if not tag:
            tag = Tag(name=name_clean)
            db.add(tag)
            db.flush()
        tag_list.append(tag)
    return tag_list


def create_deck(db: Session, owner: User | None, deck_in: DeckCreate) -> Deck:
    tags = _resolve_tags(db, deck_in.tag_names or [])
    deck = Deck(
        title=deck_in.title,
        description=deck_in.description,
        is_public=deck_in.is_public,
        owner_user_id=owner.id if owner else None,
    )
    deck.tags = tags
    db.add(deck)
    db.flush()

    if deck_in.cards:
        for card_data in deck_in.cards:
            card = Card(deck_id=deck.id, **card_data.model_dump(exclude_unset=True))
            db.add(card)

    db.commit()
    db.refresh(deck)
    return deck


def update_deck(db: Session, deck: Deck, deck_in: DeckUpdate) -> Deck:
    for field, value in deck_in.model_dump(exclude_unset=True).items():
        if field == "tag_names":
            deck.tags = _resolve_tags(db, value or [])
        else:
            setattr(deck, field, value)
    db.add(deck)
    db.commit()
    db.refresh(deck)
    return deck


def delete_deck(db: Session, deck: Deck) -> None:
    db.delete(deck)
    db.commit()


def get_deck_by_id(db: Session, deck_id: int) -> Deck:
    deck = db.get(Deck, deck_id)
    if not deck:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")
    return deck


def list_decks(
    db: Session,
    user: User | None,
    search: str | None = None,
    tag: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[DeckSummary], int]:
    deck_stmt = (
        select(Deck)
        .options(selectinload(Deck.tags), selectinload(Deck.cards))
        .offset(offset)
        .limit(limit)
    )
    count_stmt = select(func.count(Deck.id))

    if search:
        pattern = f"%{search.lower()}%"
        deck_stmt = deck_stmt.where(func.lower(Deck.title).like(pattern))
        count_stmt = count_stmt.where(func.lower(Deck.title).like(pattern))

    if tag:
        deck_stmt = deck_stmt.join(DeckTagLink).join(Tag).where(func.lower(Tag.name) == tag.lower())
        count_stmt = count_stmt.join(DeckTagLink).join(Tag).where(func.lower(Tag.name) == tag.lower())

    deck_stmt = deck_stmt.order_by(Deck.created_at.desc())

    decks = db.exec(deck_stmt).scalars().all()
    total = db.exec(count_stmt).scalar_one()

    summaries: list[DeckSummary] = []
    for deck in decks:
        tag_reads = [TagRead(id=t.id, name=t.name) for t in deck.tags]
        due_count = 0
        if user:
            due_count = (
                db.exec(
                    select(func.count(SRSReview.id))
                    .join(Card, Card.id == SRSReview.card_id)
                    .where(
                        SRSReview.user_id == user.id,
                        Card.deck_id == deck.id,
                        SRSReview.due_at <= func.now(),
                    )
                ).scalar_one()
            )
        summaries.append(
            DeckSummary(
                id=deck.id,
                title=deck.title,
                description=deck.description,
                is_public=deck.is_public,
                card_count=len(deck.cards),
                due_count=due_count,
                tags=tag_reads,
            )
        )
    return summaries, total


def _prepare_card_payload(card_in: CardCreate | CardUpdate) -> dict:
    data = card_in.model_dump(exclude_unset=True)
    if "type" in data:
        type_value = data["type"]
        if isinstance(type_value, CardType):
            normalized_type = type_value.value
        else:
            normalized_type = CardType(str(type_value).lower()).value
        data["type"] = normalized_type
    else:
        normalized_type = None

    effective_type = normalized_type or data.get("type")

    if effective_type != CardType.MULTIPLE_CHOICE.value:
        data["options"] = None
    return data


def attach_card_to_deck(db: Session, deck: Deck, card_in: CardCreate) -> Card:
    payload = _prepare_card_payload(card_in)
    card = Card(deck_id=deck.id, **payload)
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


def update_card(db: Session, card: Card, card_in: CardUpdate) -> Card:
    payload = _prepare_card_payload(card_in)
    for key, value in payload.items():
        setattr(card, key, value)
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


def delete_card(db: Session, card: Card) -> None:
    db.delete(card)
    db.commit()
