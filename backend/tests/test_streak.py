"""Tests for user streak tracking functionality."""
from datetime import date, timedelta

import pytest
from sqlmodel import Session

from app.models import User
from app.services.streak import update_user_streak, get_streak_stats


class TestStreakService:
    """Test the streak service functions."""

    def test_first_activity_sets_streak_to_one(self, db: Session, test_user: User):
        """Test that first activity initializes streak to 1."""
        assert test_user.current_streak == 0
        assert test_user.longest_streak == 0
        assert test_user.last_activity_date is None

        update_user_streak(db, test_user)

        assert test_user.current_streak == 1
        assert test_user.longest_streak == 1
        assert test_user.last_activity_date == date.today()

    def test_same_day_activity_no_change(self, db: Session, test_user: User):
        """Test that multiple activities on the same day don't change streak."""
        # Set initial activity
        test_user.current_streak = 5
        test_user.longest_streak = 10
        test_user.last_activity_date = date.today()
        db.add(test_user)
        db.commit()

        # Update again on same day
        update_user_streak(db, test_user)

        assert test_user.current_streak == 5
        assert test_user.longest_streak == 10
        assert test_user.last_activity_date == date.today()

    def test_consecutive_day_increments_streak(self, db: Session, test_user: User):
        """Test that activity on consecutive days increments streak."""
        yesterday = date.today() - timedelta(days=1)
        test_user.current_streak = 5
        test_user.longest_streak = 10
        test_user.last_activity_date = yesterday
        db.add(test_user)
        db.commit()

        update_user_streak(db, test_user)

        assert test_user.current_streak == 6
        assert test_user.longest_streak == 10  # Not exceeded yet
        assert test_user.last_activity_date == date.today()

    def test_consecutive_days_updates_longest_streak(self, db: Session, test_user: User):
        """Test that longest streak is updated when current exceeds it."""
        yesterday = date.today() - timedelta(days=1)
        test_user.current_streak = 10
        test_user.longest_streak = 10
        test_user.last_activity_date = yesterday
        db.add(test_user)
        db.commit()

        update_user_streak(db, test_user)

        assert test_user.current_streak == 11
        assert test_user.longest_streak == 11
        assert test_user.last_activity_date == date.today()

    def test_missed_day_resets_streak(self, db: Session, test_user: User):
        """Test that missing a day resets streak to 1."""
        two_days_ago = date.today() - timedelta(days=2)
        test_user.current_streak = 15
        test_user.longest_streak = 20
        test_user.last_activity_date = two_days_ago
        db.add(test_user)
        db.commit()

        update_user_streak(db, test_user)

        assert test_user.current_streak == 1
        assert test_user.longest_streak == 20  # Longest streak preserved
        assert test_user.last_activity_date == date.today()

    def test_missed_multiple_days_resets_streak(self, db: Session, test_user: User):
        """Test that missing multiple days resets streak to 1."""
        week_ago = date.today() - timedelta(days=7)
        test_user.current_streak = 30
        test_user.longest_streak = 50
        test_user.last_activity_date = week_ago
        db.add(test_user)
        db.commit()

        update_user_streak(db, test_user)

        assert test_user.current_streak == 1
        assert test_user.longest_streak == 50
        assert test_user.last_activity_date == date.today()


class TestStreakStats:
    """Test the get_streak_stats function."""

    def test_streak_stats_active_today(self, test_user: User):
        """Test streak stats when user studied today."""
        test_user.current_streak = 10
        test_user.longest_streak = 15
        test_user.last_activity_date = date.today()

        stats = get_streak_stats(test_user)

        assert stats["current_streak"] == 10
        assert stats["longest_streak"] == 15
        assert stats["last_activity_date"] == date.today()
        assert stats["is_active"] is True

    def test_streak_stats_active_yesterday(self, test_user: User):
        """Test streak stats when user studied yesterday (still active)."""
        yesterday = date.today() - timedelta(days=1)
        test_user.current_streak = 5
        test_user.longest_streak = 10
        test_user.last_activity_date = yesterday

        stats = get_streak_stats(test_user)

        assert stats["current_streak"] == 5
        assert stats["longest_streak"] == 10
        assert stats["last_activity_date"] == yesterday
        assert stats["is_active"] is True

    def test_streak_stats_inactive(self, test_user: User):
        """Test streak stats when user missed a day (inactive)."""
        two_days_ago = date.today() - timedelta(days=2)
        test_user.current_streak = 8
        test_user.longest_streak = 12
        test_user.last_activity_date = two_days_ago

        stats = get_streak_stats(test_user)

        assert stats["current_streak"] == 0  # Shows 0 when inactive
        assert stats["longest_streak"] == 12
        assert stats["last_activity_date"] == two_days_ago
        assert stats["is_active"] is False

    def test_streak_stats_no_activity(self, test_user: User):
        """Test streak stats for user with no activity."""
        test_user.current_streak = 0
        test_user.longest_streak = 0
        test_user.last_activity_date = None

        stats = get_streak_stats(test_user)

        assert stats["current_streak"] == 0
        assert stats["longest_streak"] == 0
        assert stats["last_activity_date"] is None
        assert stats["is_active"] is False


class TestStreakAPI:
    """Test the streak API endpoints."""

    def test_get_streak_endpoint(self, client, test_user_token: str, test_user: User, db: Session):
        """Test the GET /api/v1/me/streak endpoint."""
        # Set up user with streak data
        test_user.current_streak = 7
        test_user.longest_streak = 15
        test_user.last_activity_date = date.today()
        db.add(test_user)
        db.commit()

        response = client.get(
            "/api/v1/me/streak",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["current_streak"] == 7
        assert data["longest_streak"] == 15
        assert data["is_active"] is True

    def test_user_read_includes_streak(self, client, test_user_token: str, test_user: User, db: Session):
        """Test that GET /api/v1/me includes streak fields."""
        test_user.current_streak = 3
        test_user.longest_streak = 8
        test_user.last_activity_date = date.today()
        db.add(test_user)
        db.commit()

        response = client.get(
            "/api/v1/me",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["current_streak"] == 3
        assert data["longest_streak"] == 8
        assert data["last_activity_date"] == str(date.today())

    def test_streak_unauthorized(self, client):
        """Test that streak endpoint requires authentication."""
        response = client.get("/api/v1/me/streak")
        assert response.status_code == 401
