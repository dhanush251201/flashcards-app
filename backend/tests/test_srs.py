import datetime as dt

from app.models.study import SRSReview
from app.services.study import _apply_sm2


def test_sm2_low_quality_resets_interval():
    review = SRSReview(user_id=1, card_id=1, repetitions=3, interval_days=12, easiness=2.5, due_at=dt.datetime.now(dt.timezone.utc))
    _apply_sm2(review, 2)
    assert review.repetitions == 0
    assert review.interval_days == 1
    assert review.easiness <= 2.5


def test_sm2_high_quality_increases_interval():
    review = SRSReview(user_id=1, card_id=2, repetitions=2, interval_days=6, easiness=2.5, due_at=dt.datetime.now(dt.timezone.utc))
    _apply_sm2(review, 5)
    assert review.repetitions >= 3
    assert review.interval_days >= 6
    assert review.easiness >= 2.5

