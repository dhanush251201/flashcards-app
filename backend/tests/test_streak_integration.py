"""Integration tests for streak tracking with quiz sessions."""
from datetime import date, timedelta

import pytest
from sqlmodel import Session

from app.models import QuizSession, User
from app.models.enums import QuizMode, QuizStatus
from app.services.study import finish_session


class TestStreakIntegration:
    """Test streak updates when completing quiz sessions."""

    def test_finish_session_updates_streak_first_time(
        self, db: Session, test_user: User, test_deck, test_cards
    ):
        """Test that finishing a session for the first time sets streak to 1."""
        # Create and finish a session
        session = QuizSession(
            user_id=test_user.id,
            deck_id=test_deck.id,
            mode=QuizMode.PRACTICE,
            status=QuizStatus.ACTIVE,
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        # Verify user has no streak initially
        assert test_user.current_streak == 0
        assert test_user.longest_streak == 0

        # Finish the session
        finish_session(db, session, test_user)

        # Refresh user to get updated data
        db.refresh(test_user)

        # Verify streak was updated
        assert test_user.current_streak == 1
        assert test_user.longest_streak == 1
        assert test_user.last_activity_date == date.today()

    def test_finish_multiple_sessions_same_day(
        self, db: Session, test_user: User, test_deck, test_cards
    ):
        """Test that finishing multiple sessions on same day doesn't increase streak."""
        # Set up initial streak
        test_user.current_streak = 5
        test_user.longest_streak = 10
        test_user.last_activity_date = date.today()
        db.add(test_user)
        db.commit()

        # Create and finish first session
        session1 = QuizSession(
            user_id=test_user.id,
            deck_id=test_deck.id,
            mode=QuizMode.PRACTICE,
            status=QuizStatus.ACTIVE,
        )
        db.add(session1)
        db.commit()
        db.refresh(session1)
        finish_session(db, session1, test_user)
        db.refresh(test_user)

        # Verify no change
        assert test_user.current_streak == 5

        # Create and finish second session
        session2 = QuizSession(
            user_id=test_user.id,
            deck_id=test_deck.id,
            mode=QuizMode.REVIEW,
            status=QuizStatus.ACTIVE,
        )
        db.add(session2)
        db.commit()
        db.refresh(session2)
        finish_session(db, session2, test_user)
        db.refresh(test_user)

        # Verify still no change
        assert test_user.current_streak == 5
        assert test_user.longest_streak == 10

    def test_finish_session_consecutive_days(
        self, db: Session, test_user: User, test_deck, test_cards
    ):
        """Test simulating consecutive day activity (manual date adjustment for testing)."""
        # Simulate yesterday's activity
        yesterday = date.today() - timedelta(days=1)
        test_user.current_streak = 3
        test_user.longest_streak = 5
        test_user.last_activity_date = yesterday
        db.add(test_user)
        db.commit()

        # Create and finish session today
        session = QuizSession(
            user_id=test_user.id,
            deck_id=test_deck.id,
            mode=QuizMode.EXAM,
            status=QuizStatus.ACTIVE,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        finish_session(db, session, test_user)
        db.refresh(test_user)

        # Verify streak incremented
        assert test_user.current_streak == 4
        assert test_user.longest_streak == 5
        assert test_user.last_activity_date == date.today()

    def test_finish_session_after_missed_day(
        self, db: Session, test_user: User, test_deck, test_cards
    ):
        """Test that streak resets after missing a day."""
        # Simulate activity from 2 days ago
        two_days_ago = date.today() - timedelta(days=2)
        test_user.current_streak = 10
        test_user.longest_streak = 15
        test_user.last_activity_date = two_days_ago
        db.add(test_user)
        db.commit()

        # Create and finish session today
        session = QuizSession(
            user_id=test_user.id,
            deck_id=test_deck.id,
            mode=QuizMode.PRACTICE,
            status=QuizStatus.ACTIVE,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        finish_session(db, session, test_user)
        db.refresh(test_user)

        # Verify streak reset to 1
        assert test_user.current_streak == 1
        assert test_user.longest_streak == 15  # Longest preserved
        assert test_user.last_activity_date == date.today()

    def test_finish_session_breaks_record(
        self, db: Session, test_user: User, test_deck, test_cards
    ):
        """Test that finishing a session updates longest streak when record is broken."""
        # Set up user about to break their record
        yesterday = date.today() - timedelta(days=1)
        test_user.current_streak = 20
        test_user.longest_streak = 20
        test_user.last_activity_date = yesterday
        db.add(test_user)
        db.commit()

        # Create and finish session today
        session = QuizSession(
            user_id=test_user.id,
            deck_id=test_deck.id,
            mode=QuizMode.REVIEW,
            status=QuizStatus.ACTIVE,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        finish_session(db, session, test_user)
        db.refresh(test_user)

        # Verify new record
        assert test_user.current_streak == 21
        assert test_user.longest_streak == 21
        assert test_user.last_activity_date == date.today()


class TestStreakAPIIntegration:
    """Test streak API through full request lifecycle."""

    def test_streak_updates_via_api(
        self, client, test_user_token: str, test_deck, test_cards, db: Session, test_user: User
    ):
        """Test that streak updates when finishing a session via API."""
        # Verify initial state
        response = client.get(
            "/api/v1/me/streak",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert response.status_code == 200
        assert response.json()["current_streak"] == 0

        # Create a session
        create_response = client.post(
            "/api/v1/study/sessions",
            json={"deck_id": test_deck.id, "mode": "practice"},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert create_response.status_code == 201
        session_id = create_response.json()["id"]

        # Finish the session
        finish_response = client.post(
            f"/api/v1/study/sessions/{session_id}/finish",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert finish_response.status_code == 200

        # Verify streak updated
        streak_response = client.get(
            "/api/v1/me/streak",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert streak_response.status_code == 200
        data = streak_response.json()
        assert data["current_streak"] == 1
        assert data["longest_streak"] == 1
        assert data["is_active"] is True

    def test_user_profile_shows_updated_streak(
        self, client, test_user_token: str, test_deck, test_cards, db: Session
    ):
        """Test that user profile endpoint shows updated streak after session."""
        # Create and finish a session
        create_response = client.post(
            "/api/v1/study/sessions",
            json={"deck_id": test_deck.id, "mode": "review"},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        session_id = create_response.json()["id"]

        client.post(
            f"/api/v1/study/sessions/{session_id}/finish",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        # Check user profile
        profile_response = client.get(
            "/api/v1/me",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert profile_response.status_code == 200
        data = profile_response.json()
        assert data["current_streak"] == 1
        assert data["longest_streak"] == 1
