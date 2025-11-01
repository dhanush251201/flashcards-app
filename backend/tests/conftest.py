"""Pytest configuration and fixtures for backend tests."""
import datetime as dt
import warnings
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.services.auth import create_access_token, hash_password
from app.db.session import get_db
from app.main import app
from app.models import Card, Deck, QuizResponse, QuizSession, SRSReview, User, UserDeckProgress
from app.models.enums import CardType, QuizMode, QuizStatus, UserRole

# Suppress resource warnings globally
warnings.filterwarnings("ignore", category=ResourceWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)


@pytest.fixture(name="engine")
def engine_fixture():
    """Create an in-memory SQLite engine for testing."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    return engine


@pytest.fixture(name="db")
def db_fixture(engine) -> Generator[Session, None, None]:
    """Create a fresh database session for each test."""
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(db: Session) -> Generator[TestClient, None, None]:
    """Create a test client with database dependency override."""
    def get_db_override():
        return db

    app.dependency_overrides[get_db] = get_db_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="test_user")
def test_user_fixture(db: Session) -> User:
    """Create a test user."""
    user = User(
        email="testuser@example.com",
        full_name="Test User",
        hashed_password=hash_password("testpassword123"),
        role=UserRole.USER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(name="admin_user")
def admin_user_fixture(db: Session) -> User:
    """Create an admin user."""
    user = User(
        email="admin@example.com",
        full_name="Admin User",
        hashed_password=hash_password("adminpassword123"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(name="test_user_token")
def test_user_token_fixture(test_user: User) -> str:
    """Create an access token for the test user."""
    return create_access_token(subject=str(test_user.id))


@pytest.fixture(name="admin_user_token")
def admin_user_token_fixture(admin_user: User) -> str:
    """Create an access token for the admin user."""
    return create_access_token(subject=str(admin_user.id))


@pytest.fixture(name="test_deck")
def test_deck_fixture(db: Session, test_user: User) -> Deck:
    """Create a test deck."""
    deck = Deck(
        title="Test Deck",
        description="A deck for testing",
        is_public=True,
        owner_user_id=test_user.id,
    )
    db.add(deck)
    db.commit()
    db.refresh(deck)
    return deck


@pytest.fixture(name="private_deck")
def private_deck_fixture(db: Session, test_user: User) -> Deck:
    """Create a private test deck."""
    deck = Deck(
        title="Private Deck",
        description="A private deck for testing",
        is_public=False,
        owner_user_id=test_user.id,
    )
    db.add(deck)
    db.commit()
    db.refresh(deck)
    return deck


@pytest.fixture(name="test_cards")
def test_cards_fixture(db: Session, test_deck: Deck) -> list[Card]:
    """Create test cards of various types."""
    cards = [
        Card(
            deck_id=test_deck.id,
            type=CardType.MULTIPLE_CHOICE,
            prompt="What is 2 + 2?",
            answer="4",
            options=["2", "3", "4", "5"],
            explanation="Basic arithmetic",
        ),
        Card(
            deck_id=test_deck.id,
            type=CardType.SHORT_ANSWER,
            prompt="What is the capital of France?",
            answer="Paris",
            explanation="Paris is the capital city of France",
        ),
        Card(
            deck_id=test_deck.id,
            type=CardType.CLOZE,
            prompt="The capital of France is [...]",
            answer="Paris",
            cloze_data={"blanks": [{"answer": "Paris"}]},
        ),
        Card(
            deck_id=test_deck.id,
            type=CardType.BASIC,
            prompt="What is Python?",
            answer="A programming language",
            explanation="Python is a high-level programming language",
        ),
    ]
    for card in cards:
        db.add(card)
    db.commit()
    for card in cards:
        db.refresh(card)
    return cards


@pytest.fixture(name="quiz_session")
def quiz_session_fixture(db: Session, test_user: User, test_deck: Deck) -> QuizSession:
    """Create a quiz session."""
    session = QuizSession(
        user_id=test_user.id,
        deck_id=test_deck.id,
        mode=QuizMode.REVIEW,
        status=QuizStatus.ACTIVE,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@pytest.fixture(name="srs_review")
def srs_review_fixture(db: Session, test_user: User, test_cards: list[Card]) -> SRSReview:
    """Create an SRS review for testing."""
    review = SRSReview(
        user_id=test_user.id,
        card_id=test_cards[0].id,
        repetitions=1,
        interval_days=1,
        easiness=2.5,
        due_at=dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=1),
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review
