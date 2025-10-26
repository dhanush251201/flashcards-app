"""Seed the database with starter data for local development."""

from sqlmodel import Session, select

from app.db.session import engine
from app.models import Deck, User, UserRole
from app.schemas.card import CardCreate
from app.schemas.deck import DeckCreate
from app.schemas.user import UserCreate
from app.services import auth
from app.services.decks import create_deck


STARTER_DECKS = [
    DeckCreate(
        title="Neuroanatomy Foundations",
        description="Core regions of the brain with their primary functions.",
        tag_names=["Biology", "Medicine"],
        cards=[
            CardCreate(prompt="Primary function of the hippocampus", answer="Memory consolidation"),
            CardCreate(
                prompt="Neuron's insulating layer",
                answer="Myelin sheath",
                explanation="Created by oligodendrocytes in the CNS.",
            ),
            CardCreate(
                prompt="Lobe responsible for visual processing",
                answer="Occipital lobe",
                explanation="Receives and interprets signals from the retina.",
            ),
        ],
    ),
    DeckCreate(
        title="Spanish Verb Basics",
        description="Everyday verbs in the present tense.",
        tag_names=["Languages"],
        cards=[
            CardCreate(prompt="to eat", answer="comer"),
            CardCreate(prompt="to live", answer="vivir"),
            CardCreate(prompt="to speak", answer="hablar"),
        ],
    ),
]


def seed() -> None:
    """Run seed operations inside a managed session."""
    with Session(engine) as session:
        # Ensure an admin user exists
        admin = session.exec(select(User).where(User.email == "admin@flashdecks.app")).first()
        if not admin:
            admin = auth.create_user(
                session,
                user_in=UserCreate(email="admin@flashdecks.app", password="FlashDecks123!", full_name="Flash Admin"),
                role=UserRole.ADMIN,
            )

        for deck_payload in STARTER_DECKS:
            existing = session.exec(select(Deck).where(Deck.title == deck_payload.title)).first()
            if existing:
                continue
            create_deck(session, owner=None, deck_in=deck_payload)

        session.commit()


if __name__ == "__main__":
    seed()
