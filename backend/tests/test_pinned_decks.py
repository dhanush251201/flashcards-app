"""Tests for pinned deck functionality."""
import pytest
from sqlmodel import Session

from app.models import Deck, User, UserDeckProgress


class TestPinDeckAPI:
    """Test the pin deck API endpoints."""

    def test_pin_deck_success(self, client, test_user_token: str, test_deck: Deck, db: Session):
        """Test pinning a deck successfully."""
        response = client.put(
            f"/api/v1/me/decks/{test_deck.id}/pin",
            json={"pinned": True},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 200
        assert response.json()["message"] == "Deck pin updated"

        # Verify in database
        from sqlmodel import select
        progress = db.exec(
            select(UserDeckProgress).where(UserDeckProgress.deck_id == test_deck.id)
        ).first()
        assert progress is not None
        assert progress.pinned is True

    def test_unpin_deck_success(self, client, test_user_token: str, test_deck: Deck, test_user: User, db: Session):
        """Test unpinning a deck successfully."""
        # First pin the deck
        progress = UserDeckProgress(
            user_id=test_user.id,
            deck_id=test_deck.id,
            percent_complete=0.0,
            pinned=True
        )
        db.add(progress)
        db.commit()

        # Now unpin it
        response = client.put(
            f"/api/v1/me/decks/{test_deck.id}/pin",
            json={"pinned": False},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 200

        # Verify in database
        db.refresh(progress)
        assert progress.pinned is False

    def test_pin_deck_creates_progress_if_not_exists(
        self, client, test_user_token: str, test_deck: Deck, test_user: User, db: Session
    ):
        """Test that pinning creates a UserDeckProgress record if it doesn't exist."""
        from sqlmodel import select
        # Verify no progress exists
        progress = db.exec(
            select(UserDeckProgress).where(
                UserDeckProgress.user_id == test_user.id,
                UserDeckProgress.deck_id == test_deck.id
            )
        ).first()
        assert progress is None

        # Pin the deck
        response = client.put(
            f"/api/v1/me/decks/{test_deck.id}/pin",
            json={"pinned": True},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 200

        # Verify progress was created
        progress = db.exec(
            select(UserDeckProgress).where(
                UserDeckProgress.user_id == test_user.id,
                UserDeckProgress.deck_id == test_deck.id
            )
        ).first()
        assert progress is not None
        assert progress.pinned is True
        assert progress.percent_complete == 0.0

    def test_pin_nonexistent_deck_fails(self, client, test_user_token: str):
        """Test that pinning a non-existent deck returns 404."""
        response = client.put(
            "/api/v1/me/decks/99999/pin",
            json={"pinned": True},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_pin_deck_requires_authentication(self, client, test_deck: Deck):
        """Test that pinning a deck requires authentication."""
        response = client.put(
            f"/api/v1/me/decks/{test_deck.id}/pin",
            json={"pinned": True}
        )

        assert response.status_code == 401


class TestDeckListWithPinnedStatus:
    """Test that deck list endpoints include pinned status."""

    def test_list_decks_includes_pinned_status(
        self, client, test_user_token: str, test_deck: Deck, test_user: User, db: Session
    ):
        """Test that listing decks includes the pinned status."""
        # Pin the deck
        progress = UserDeckProgress(
            user_id=test_user.id,
            deck_id=test_deck.id,
            percent_complete=0.0,
            pinned=True
        )
        db.add(progress)
        db.commit()

        # Get deck list
        response = client.get(
            "/api/v1/decks",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 200
        decks = response.json()

        # Find our test deck
        test_deck_data = next((d for d in decks if d["id"] == test_deck.id), None)
        assert test_deck_data is not None
        assert test_deck_data["is_pinned"] is True

    def test_list_decks_unpinned_by_default(
        self, client, test_user_token: str, test_deck: Deck
    ):
        """Test that decks are unpinned by default."""
        response = client.get(
            "/api/v1/decks",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 200
        decks = response.json()

        # Find our test deck
        test_deck_data = next((d for d in decks if d["id"] == test_deck.id), None)
        assert test_deck_data is not None
        assert test_deck_data["is_pinned"] is False

    def test_list_decks_without_auth_shows_unpinned(self, client, test_deck: Deck):
        """Test that listing decks without authentication shows all decks as unpinned."""
        response = client.get("/api/v1/decks")

        assert response.status_code == 200
        decks = response.json()

        # All decks should be unpinned for unauthenticated users
        for deck in decks:
            assert deck["is_pinned"] is False

    def test_list_decks_different_users_different_pins(
        self, client, test_user_token: str, admin_user_token: str, test_deck: Deck, test_user: User, admin_user: User, db: Session
    ):
        """Test that different users have different pin states for the same deck."""
        # Pin the deck for test_user
        progress = UserDeckProgress(
            user_id=test_user.id,
            deck_id=test_deck.id,
            percent_complete=0.0,
            pinned=True
        )
        db.add(progress)
        db.commit()

        # Get deck list as test_user
        response1 = client.get(
            "/api/v1/decks",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        decks1 = response1.json()
        test_deck_data1 = next((d for d in decks1 if d["id"] == test_deck.id), None)
        assert test_deck_data1["is_pinned"] is True

        # Get deck list as admin_user
        response2 = client.get(
            "/api/v1/decks",
            headers={"Authorization": f"Bearer {admin_user_token}"}
        )
        decks2 = response2.json()
        test_deck_data2 = next((d for d in decks2 if d["id"] == test_deck.id), None)
        assert test_deck_data2["is_pinned"] is False


class TestPinDeckIntegration:
    """Integration tests for pinned deck workflows."""

    def test_pin_deck_persists_across_requests(
        self, client, test_user_token: str, test_deck: Deck
    ):
        """Test that pinned status persists across multiple API requests."""
        # Pin the deck
        client.put(
            f"/api/v1/me/decks/{test_deck.id}/pin",
            json={"pinned": True},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        # Make multiple requests to verify persistence
        for _ in range(3):
            response = client.get(
                "/api/v1/decks",
                headers={"Authorization": f"Bearer {test_user_token}"}
            )
            decks = response.json()
            test_deck_data = next((d for d in decks if d["id"] == test_deck.id), None)
            assert test_deck_data["is_pinned"] is True
