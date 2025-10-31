"""Tests for study service functions."""
import datetime as dt
import json

import pytest
from fastapi import HTTPException
from sqlmodel import Session

from app.models import Card, QuizSession, SRSReview, User
from app.models.enums import CardType, QuizMode, QuizStatus
from app.schemas.study import StudyAnswerCreate, StudySessionCreate
from app.services.study import (
    _apply_sm2,
    _check_answer_correctness,
    _check_cloze_answer,
    _normalize_answer,
    create_session,
    due_reviews,
    finish_session,
    get_session_or_404,
    record_answer,
)


@pytest.mark.unit
class TestNormalizeAnswer:
    """Test answer normalization."""

    def test_normalize_lowercase(self):
        assert _normalize_answer("PARIS") == "paris"

    def test_normalize_strips_whitespace(self):
        assert _normalize_answer("  Paris  ") == "paris"

    def test_normalize_none(self):
        assert _normalize_answer(None) == ""

    def test_normalize_empty(self):
        assert _normalize_answer("") == ""


@pytest.mark.unit
class TestCheckClozeAnswer:
    """Test cloze answer checking."""

    def test_cloze_single_blank_correct(self):
        card = Card(
            deck_id=1,
            type=CardType.CLOZE,
            prompt="The capital is [...]",
            answer="Paris",
            cloze_data={"blanks": [{"answer": "Paris"}]},
        )
        assert _check_cloze_answer(card, '["Paris"]') is True

    def test_cloze_single_blank_case_insensitive(self):
        card = Card(
            deck_id=1,
            type=CardType.CLOZE,
            prompt="The capital is [...]",
            answer="Paris",
            cloze_data={"blanks": [{"answer": "Paris"}]},
        )
        assert _check_cloze_answer(card, '["paris"]') is True

    def test_cloze_multiple_blanks_correct(self):
        card = Card(
            deck_id=1,
            type=CardType.CLOZE,
            prompt="[...] is the capital of [...]",
            answer="Paris, France",
            cloze_data={"blanks": [{"answer": "Paris"}, {"answer": "France"}]},
        )
        assert _check_cloze_answer(card, '["Paris", "France"]') is True

    def test_cloze_multiple_acceptable_answers(self):
        card = Card(
            deck_id=1,
            type=CardType.CLOZE,
            prompt="[...] is known for [...]",
            answer="Paris, Art",
            cloze_data={"blanks": [{"answer": "Paris"}, {"answer": ["Art", "Fashion", "Culture"]}]},
        )
        assert _check_cloze_answer(card, '["Paris", "Art"]') is True
        assert _check_cloze_answer(card, '["Paris", "Fashion"]') is True
        assert _check_cloze_answer(card, '["Paris", "Culture"]') is True

    def test_cloze_wrong_answer(self):
        card = Card(
            deck_id=1,
            type=CardType.CLOZE,
            prompt="The capital is [...]",
            answer="Paris",
            cloze_data={"blanks": [{"answer": "Paris"}]},
        )
        assert _check_cloze_answer(card, '["London"]') is False

    def test_cloze_wrong_number_of_blanks(self):
        card = Card(
            deck_id=1,
            type=CardType.CLOZE,
            prompt="The capital is [...]",
            answer="Paris",
            cloze_data={"blanks": [{"answer": "Paris"}]},
        )
        assert _check_cloze_answer(card, '["Paris", "Extra"]') is False

    def test_cloze_invalid_json(self):
        card = Card(
            deck_id=1,
            type=CardType.CLOZE,
            prompt="The capital is [...]",
            answer="Paris",
            cloze_data={"blanks": [{"answer": "Paris"}]},
        )
        assert _check_cloze_answer(card, "not json") is False

    def test_cloze_no_data(self):
        card = Card(
            deck_id=1,
            type=CardType.CLOZE,
            prompt="The capital is [...]",
            answer="Paris",
            cloze_data=None,
        )
        assert _check_cloze_answer(card, '["Paris"]') is False


@pytest.mark.unit
class TestCheckAnswerCorrectness:
    """Test answer correctness checking for different card types."""

    def test_multiple_choice_correct(self):
        card = Card(
            deck_id=1,
            type=CardType.MULTIPLE_CHOICE,
            prompt="What is 2+2?",
            answer="4",
            options=["2", "3", "4", "5"],
        )
        assert _check_answer_correctness(card, "4") is True

    def test_multiple_choice_incorrect(self):
        card = Card(
            deck_id=1,
            type=CardType.MULTIPLE_CHOICE,
            prompt="What is 2+2?",
            answer="4",
            options=["2", "3", "4", "5"],
        )
        assert _check_answer_correctness(card, "3") is False

    def test_short_answer_correct(self):
        card = Card(
            deck_id=1,
            type=CardType.SHORT_ANSWER,
            prompt="Capital of France?",
            answer="Paris",
        )
        assert _check_answer_correctness(card, "Paris") is True

    def test_short_answer_case_insensitive(self):
        card = Card(
            deck_id=1,
            type=CardType.SHORT_ANSWER,
            prompt="Capital of France?",
            answer="Paris",
        )
        assert _check_answer_correctness(card, "paris") is True

    def test_short_answer_with_multiple_valid_answers(self):
        card = Card(
            deck_id=1,
            type=CardType.SHORT_ANSWER,
            prompt="Capital of USA?",
            answer="Washington D.C.",
            options=["Washington D.C.", "Washington DC", "DC"],
        )
        assert _check_answer_correctness(card, "DC") is True
        assert _check_answer_correctness(card, "washington dc") is True

    def test_empty_answer(self):
        card = Card(
            deck_id=1,
            type=CardType.SHORT_ANSWER,
            prompt="Question?",
            answer="Answer",
        )
        assert _check_answer_correctness(card, None) is False
        assert _check_answer_correctness(card, "") is False


@pytest.mark.unit
class TestSM2Algorithm:
    """Test SM-2 spaced repetition algorithm."""

    def test_quality_below_3_resets_interval(self):
        review = SRSReview(
            user_id=1,
            card_id=1,
            repetitions=5,
            interval_days=20,
            easiness=2.5,
            due_at=dt.datetime.now(dt.timezone.utc),
        )
        _apply_sm2(review, quality=2)
        assert review.repetitions == 0
        assert review.interval_days == 1

    def test_quality_3_or_above_first_rep(self):
        review = SRSReview(
            user_id=1,
            card_id=1,
            repetitions=0,
            interval_days=0,
            easiness=2.5,
            due_at=dt.datetime.now(dt.timezone.utc),
        )
        _apply_sm2(review, quality=3)
        assert review.repetitions == 1
        assert review.interval_days == 1

    def test_quality_3_or_above_second_rep(self):
        review = SRSReview(
            user_id=1,
            card_id=1,
            repetitions=1,
            interval_days=1,
            easiness=2.5,
            due_at=dt.datetime.now(dt.timezone.utc),
        )
        _apply_sm2(review, quality=4)
        assert review.repetitions == 2
        assert review.interval_days == 6

    def test_quality_3_or_above_subsequent_reps(self):
        review = SRSReview(
            user_id=1,
            card_id=1,
            repetitions=2,
            interval_days=6,
            easiness=2.5,
            due_at=dt.datetime.now(dt.timezone.utc),
        )
        _apply_sm2(review, quality=5)
        assert review.repetitions == 3
        assert review.interval_days == 15  # round(6 * 2.5) = 15

    def test_easiness_adjustment(self):
        review = SRSReview(
            user_id=1,
            card_id=1,
            repetitions=2,
            interval_days=6,
            easiness=2.5,
            due_at=dt.datetime.now(dt.timezone.utc),
        )
        initial_easiness = review.easiness
        _apply_sm2(review, quality=5)
        assert review.easiness >= initial_easiness

        _apply_sm2(review, quality=0)
        assert review.easiness < 2.5

    def test_easiness_minimum(self):
        review = SRSReview(
            user_id=1,
            card_id=1,
            repetitions=2,
            interval_days=6,
            easiness=1.3,
            due_at=dt.datetime.now(dt.timezone.utc),
        )
        _apply_sm2(review, quality=0)
        assert review.easiness >= 1.3

    def test_invalid_quality_raises_error(self):
        review = SRSReview(
            user_id=1,
            card_id=1,
            repetitions=0,
            interval_days=0,
            easiness=2.5,
            due_at=dt.datetime.now(dt.timezone.utc),
        )
        with pytest.raises(HTTPException):
            _apply_sm2(review, quality=-1)
        with pytest.raises(HTTPException):
            _apply_sm2(review, quality=6)

    def test_due_date_updated(self):
        review = SRSReview(
            user_id=1,
            card_id=1,
            repetitions=2,
            interval_days=6,
            easiness=2.5,
            due_at=dt.datetime.now(dt.timezone.utc),
        )
        before = dt.datetime.now(dt.timezone.utc)
        _apply_sm2(review, quality=4)
        assert review.due_at > before


@pytest.mark.integration
class TestSessionManagement:
    """Test quiz session management."""

    def test_create_session(self, db: Session, test_user: User, test_deck):
        payload = StudySessionCreate(deck_id=test_deck.id, mode=QuizMode.REVIEW)
        session = create_session(db, test_user, payload)
        assert session.id is not None
        assert session.user_id == test_user.id
        assert session.deck_id == test_deck.id
        assert session.mode == QuizMode.REVIEW
        assert session.status == QuizStatus.ACTIVE

    def test_get_session_or_404_success(self, db: Session, test_user: User, quiz_session):
        retrieved = get_session_or_404(db, quiz_session.id, test_user)
        assert retrieved.id == quiz_session.id

    def test_get_session_or_404_not_found(self, db: Session, test_user: User):
        with pytest.raises(HTTPException) as exc:
            get_session_or_404(db, 999999, test_user)
        assert exc.value.status_code == 404

    def test_get_session_or_404_wrong_user(self, db: Session, test_user: User, admin_user: User, quiz_session):
        with pytest.raises(HTTPException) as exc:
            get_session_or_404(db, quiz_session.id, admin_user)
        assert exc.value.status_code == 404

    def test_finish_session(self, db: Session, quiz_session, test_user):
        finished = finish_session(db, quiz_session, test_user)
        assert finished.status == QuizStatus.COMPLETED
        assert finished.ended_at is not None


@pytest.mark.integration
class TestRecordAnswer:
    """Test recording quiz answers."""

    def test_record_answer_review_mode_with_quality(self, db: Session, test_user: User, quiz_session, test_cards):
        quiz_session.mode = QuizMode.REVIEW
        db.add(quiz_session)
        db.commit()

        card = test_cards[0]
        answer_in = StudyAnswerCreate(card_id=card.id, user_answer="4", quality=4)
        response = record_answer(db, quiz_session, card, test_user, answer_in)

        assert response.id is not None
        assert response.session_id == quiz_session.id
        assert response.card_id == card.id
        assert response.quality == 4

    def test_record_answer_practice_mode_auto_grades(self, db: Session, test_user: User, quiz_session, test_cards):
        quiz_session.mode = QuizMode.PRACTICE
        db.add(quiz_session)
        db.commit()

        card = test_cards[0]  # Multiple choice card
        answer_in = StudyAnswerCreate(card_id=card.id, user_answer="4")
        response = record_answer(db, quiz_session, card, test_user, answer_in)

        assert response.is_correct is True

    def test_record_answer_exam_mode_auto_grades(self, db: Session, test_user: User, quiz_session, test_cards):
        quiz_session.mode = QuizMode.EXAM
        db.add(quiz_session)
        db.commit()

        card = test_cards[1]  # Short answer card
        answer_in = StudyAnswerCreate(card_id=card.id, user_answer="Paris")
        response = record_answer(db, quiz_session, card, test_user, answer_in)

        assert response.is_correct is True

    def test_record_answer_creates_srs_review(self, db: Session, test_user: User, quiz_session, test_cards):
        quiz_session.mode = QuizMode.REVIEW
        db.add(quiz_session)
        db.commit()

        card = test_cards[0]
        answer_in = StudyAnswerCreate(card_id=card.id, user_answer="4", quality=4)
        record_answer(db, quiz_session, card, test_user, answer_in)

        # Check SRS review was created
        from sqlmodel import select
        review = db.exec(select(SRSReview).where(SRSReview.user_id == test_user.id, SRSReview.card_id == card.id)).first()
        assert review is not None


@pytest.mark.integration
class TestDueReviews:
    """Test due review retrieval."""

    def test_due_reviews_returns_due_cards(self, db: Session, test_user: User, srs_review):
        results = due_reviews(db, test_user)
        assert len(results) == 1
        assert results[0].card_id == srs_review.card_id

    def test_due_reviews_excludes_future_cards(self, db: Session, test_user: User, test_cards):
        # Create a review that's not due yet
        future_review = SRSReview(
            user_id=test_user.id,
            card_id=test_cards[1].id,
            repetitions=2,
            interval_days=10,
            easiness=2.5,
            due_at=dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=5),
        )
        db.add(future_review)
        db.commit()

        results = due_reviews(db, test_user)
        assert all(r.card_id != test_cards[1].id for r in results)

    def test_due_reviews_empty_for_new_user(self, db: Session, admin_user: User):
        results = due_reviews(db, admin_user)
        assert len(results) == 0
