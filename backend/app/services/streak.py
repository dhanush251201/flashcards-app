"""
Service for managing user streak tracking.

A streak represents consecutive days a user has completed at least one quiz.
If a user misses a day, the streak resets to 1 (not 0, since they're starting fresh).
"""
from datetime import date, datetime, timedelta, timezone

from sqlmodel import Session

from ..models import User


def update_user_streak(db: Session, user: User) -> User:
    """
    Update user's streak based on their activity.

    Logic:
    - If user studied today already: no change
    - If last activity was yesterday: increment streak
    - If last activity was more than 1 day ago: reset streak to 1
    - Always update longest_streak if current exceeds it

    Args:
        db: Database session
        user: User object to update

    Returns:
        Updated user object
    """
    today = datetime.now(tz=timezone.utc).date()

    # If this is the first activity ever
    if user.last_activity_date is None:
        user.current_streak = 1
        user.longest_streak = 1
        user.last_activity_date = today
    # If already studied today, don't change anything
    elif user.last_activity_date == today:
        pass  # No update needed
    # If studied yesterday, increment streak
    elif user.last_activity_date == today - timedelta(days=1):
        user.current_streak += 1
        user.longest_streak = max(user.longest_streak, user.current_streak)
        user.last_activity_date = today
    # If missed one or more days, reset streak
    else:
        user.current_streak = 1
        user.last_activity_date = today
        # longest_streak remains unchanged

    db.add(user)
    return user


def get_streak_stats(user: User) -> dict:
    """
    Get streak statistics for a user.

    Args:
        user: User object

    Returns:
        Dictionary with streak statistics
    """
    today = datetime.now(tz=timezone.utc).date()

    # Check if streak is still active (studied today or yesterday)
    is_active = False
    if user.last_activity_date:
        days_since_activity = (today - user.last_activity_date).days
        is_active = days_since_activity <= 1

    return {
        "current_streak": user.current_streak if is_active else 0,
        "longest_streak": user.longest_streak,
        "last_activity_date": user.last_activity_date,
        "is_active": is_active,
    }
