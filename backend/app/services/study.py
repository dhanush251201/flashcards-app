from datetime import datetime, timedelta, timezone
from typing import Iterable, List, Tuple, Optional, Dict, Any
import json

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlmodel import Session

from ..models import Card, QuizResponse, QuizSession, SRSReview, User, UserDeckProgress
from ..models.enums import CardType, QuizMode, QuizStatus
from ..schemas.study import DueReviewCard, StudyAnswerCreate, StudySessionCreate
from . import streak as streak_service
from .llm_service import llm_service


def create_session(db: Session, user: User, payload: StudySessionCreate) -> QuizSession:
    session = QuizSession(
        user_id=user.id,
        deck_id=payload.deck_id,
        mode=payload.mode,
        status=QuizStatus.ACTIVE,
        config=payload.config.model_dump() if payload.config else None,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_session_or_404(db: Session, session_id: int, user: User) -> QuizSession:
    session = db.get(QuizSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


def finish_session(db: Session, session: QuizSession, user: User) -> QuizSession:
    session.status = QuizStatus.COMPLETED
    session.ended_at = datetime.now(tz=timezone.utc)
    db.add(session)

    # Update user's streak when they complete a session
    streak_service.update_user_streak(db, user)

    db.commit()
    db.refresh(session)
    return session


def _get_review_state(db: Session, user: User, card: Card) -> SRSReview:
    review = db.exec(
        select(SRSReview).where(SRSReview.user_id == user.id, SRSReview.card_id == card.id)
    ).scalar_one_or_none()
    if review:
        return review
    review = SRSReview(user_id=user.id, card_id=card.id)
    db.add(review)
    db.flush()
    return review


def _apply_sm2(review: SRSReview, quality: int) -> None:
    if quality < 0 or quality > 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quality must be between 0 and 5")

    if quality < 3:
        review.repetitions = 0
        review.interval_days = 1
    else:
        if review.repetitions == 0:
            review.repetitions = 1
            review.interval_days = 1
        elif review.repetitions == 1:
            review.repetitions = 2
            review.interval_days = 6
        else:
            review.interval_days = max(1, round(review.interval_days * review.easiness))
            review.repetitions += 1

    review.easiness = max(
        1.3,
        review.easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
    )
    review.last_quality = quality
    review.due_at = datetime.now(tz=timezone.utc) + timedelta(days=review.interval_days)


def _normalize_answer(text: str | None) -> str:
    """Normalize answer text for comparison (lowercase, strip whitespace)."""
    if not text:
        return ""
    return text.strip().lower()


def _check_cloze_answer(card: Card, user_answer: str | None) -> bool:
    """
    Check if user answer is correct for CLOZE type cards.
    Expected format for user_answer: JSON string with array of answers
    Expected format for cloze_data: {"blanks": [{"answer": "Paris"}, {"answer": ["Art", "Fashion"]}]}
    """
    if not user_answer or not card.cloze_data:
        return False

    try:
        # Parse user answers
        user_answers = json.loads(user_answer) if isinstance(user_answer, str) else user_answer
        if not isinstance(user_answers, list):
            return False

        # Get expected answers from cloze_data
        blanks = card.cloze_data.get("blanks", [])
        if len(user_answers) != len(blanks):
            return False

        # Check each blank
        for i, blank in enumerate(blanks):
            user_ans = _normalize_answer(user_answers[i])

            # Get acceptable answers for this blank
            if "answer" in blank:
                acceptable = blank["answer"]
                # Support both single answer and multiple acceptable answers
                if isinstance(acceptable, list):
                    acceptable_answers = [_normalize_answer(ans) for ans in acceptable]
                else:
                    acceptable_answers = [_normalize_answer(acceptable)]

                if user_ans not in acceptable_answers:
                    return False
            else:
                return False

        return True
    except (json.JSONDecodeError, KeyError, IndexError):
        return False


def _check_answer_correctness(card: Card, user_answer: str | None) -> bool:
    """Check if user answer is correct for the given card type."""
    if not user_answer:
        return False

    normalized_user_answer = _normalize_answer(user_answer)

    if card.type == CardType.MULTIPLE_CHOICE:
        return user_answer == card.answer

    elif card.type == CardType.SHORT_ANSWER:
        # For SHORT_ANSWER, support multiple valid answers stored in options
        # If options is None or empty, fall back to exact match with card.answer
        if card.options:
            # options can be a list of acceptable answers
            valid_answers = card.options if isinstance(card.options, list) else [card.answer]
            return normalized_user_answer in [_normalize_answer(ans) for ans in valid_answers]
        else:
            return normalized_user_answer == _normalize_answer(card.answer)

    elif card.type == CardType.CLOZE:
        return _check_cloze_answer(card, user_answer)

    return False


async def _check_answer_with_llm(card: Card, user_answer: str | None, user: User) -> Optional[Dict[str, Any]]:
    """
    Use LLM to check answer for SHORT_ANSWER and CLOZE type cards.

    Returns:
        Dict with 'is_correct' and 'feedback' keys, or None if LLM unavailable
    """
    from loguru import logger

    logger.info(f"_check_answer_with_llm called for card type: {card.type}")

    if not user_answer:
        logger.warning("No user answer provided")
        return None

    # Prepare the question and expected answer based on card type
    question = card.prompt
    expected_answer = card.answer

    # For cloze cards, we need to extract the expected answers from cloze_data
    if card.type == CardType.CLOZE and card.cloze_data:
        blanks = card.cloze_data.get("blanks", [])
        expected_answers = [blank.get("answer") for blank in blanks if blank.get("answer")]
        if expected_answers:
            expected_answer = ", ".join(str(ans) for ans in expected_answers)

    logger.info(f"Calling LLM service to check answer. User has OpenAI key: {bool(user.openai_api_key)}")

    # Call LLM service
    try:
        result = await llm_service.check_answer(
            question=question,
            expected_answer=expected_answer,
            user_answer=user_answer,
            user=user
        )
        logger.info(f"LLM service returned: {result}")
        return result
    except Exception as e:
        logger.error(f"Exception in _check_answer_with_llm: {str(e)}")
        # If LLM fails, return None to fallback to exact matching
        return None


async def record_answer(
    db: Session,
    session: QuizSession,
    card: Card,
    user: User,
    answer_in: StudyAnswerCreate,
) -> tuple[QuizResponse, Optional[str]]:
    """
    Record a user's answer to a card.

    Returns:
        Tuple of (QuizResponse, llm_feedback)
    """
    from loguru import logger

    is_correct: bool | None = None
    quality = answer_in.quality
    llm_feedback: Optional[str] = None

    logger.info(f"record_answer: session mode={session.mode}, card type={card.type}")

    # Auto-grade for PRACTICE and EXAM modes with supported card types
    if session.mode in [QuizMode.PRACTICE, QuizMode.EXAM] and card.type in [CardType.MULTIPLE_CHOICE, CardType.SHORT_ANSWER, CardType.CLOZE]:
        logger.info(f"Auto-grading for {session.mode} mode")
        # Try LLM-based checking first for SHORT_ANSWER and CLOZE
        if card.type in [CardType.SHORT_ANSWER, CardType.CLOZE]:
            logger.info(f"Attempting LLM check for {card.type}")
            llm_result = await _check_answer_with_llm(card, answer_in.user_answer, user)
            if llm_result:
                is_correct = llm_result.get("is_correct")
                llm_feedback = llm_result.get("feedback")
                logger.info(f"LLM check successful: is_correct={is_correct}, has_feedback={bool(llm_feedback)}")
            else:
                logger.info("LLM check returned None, falling back to exact matching")
                # Fallback to exact matching
                is_correct = _check_answer_correctness(card, answer_in.user_answer)
        else:
            # For multiple choice, use exact matching
            logger.info("Using exact matching for multiple choice")
            is_correct = _check_answer_correctness(card, answer_in.user_answer)
    else:
        logger.info(f"Not auto-grading: mode={session.mode}, card_type={card.type}")

    response = QuizResponse(
        session_id=session.id,
        card_id=card.id,
        user_answer=answer_in.user_answer,
        quality=quality,
        is_correct=is_correct,
    )
    db.add(response)

    if session.mode == QuizMode.REVIEW and quality is not None:
        review = _get_review_state(db, user, card)
        _apply_sm2(review, quality)

    _update_progress(db, user, session.deck_id)

    db.commit()
    db.refresh(response)
    return response, llm_feedback


def _update_progress(db: Session, user: User, deck_id: int) -> None:
    progress = db.exec(
        select(UserDeckProgress).where(UserDeckProgress.user_id == user.id, UserDeckProgress.deck_id == deck_id)
    ).scalar_one_or_none()

    if not progress:
        progress = UserDeckProgress(user_id=user.id, deck_id=deck_id, percent_complete=0.0)
        db.add(progress)

    total_cards = int(db.exec(select(func.count(Card.id)).where(Card.deck_id == deck_id)).scalar_one())

    reviewed_cards = int(
        db.exec(
            select(func.count(QuizResponse.id))
            .join(QuizSession, QuizSession.id == QuizResponse.session_id)
            .where(
                QuizSession.user_id == user.id,
                QuizSession.deck_id == deck_id,
            )
        ).scalar_one()
    )

    if total_cards:
        progress.percent_complete = min(100.0, (reviewed_cards / total_cards) * 100)
    progress.last_studied_at = datetime.now(tz=timezone.utc)
    progress.streak = max(progress.streak, 1)

    db.add(progress)


def due_reviews(db: Session, user: User) -> List[DueReviewCard]:
    rows = db.exec(
        select(SRSReview, Card)
        .join(Card, Card.id == SRSReview.card_id)
        .where(SRSReview.user_id == user.id, SRSReview.due_at <= func.now())
        .order_by(SRSReview.due_at)
    ).all()

    results: list[DueReviewCard] = []
    for review, card in rows:
        results.append(
            DueReviewCard(
                card_id=card.id,
                deck_id=card.deck_id,
                due_at=review.due_at,
                repetitions=review.repetitions,
                interval_days=review.interval_days,
                easiness=review.easiness,
            )
        )
    return results


def get_session_statistics(db: Session, session: QuizSession) -> dict:
    """
    Get statistics for a quiz session.

    Returns:
        dict with total_responses, correct_count, incorrect_count, unanswered_count
    """
    from sqlalchemy import func as sql_func, case

    # Query counts directly from database to avoid SQLAlchemy mapper cache issues
    result = db.exec(
        select(
            sql_func.count().label("total"),
            sql_func.sum(case((QuizResponse.is_correct == True, 1), else_=0)).label("correct"),
            sql_func.sum(case((QuizResponse.is_correct == False, 1), else_=0)).label("incorrect"),
            sql_func.sum(case((QuizResponse.is_correct == None, 1), else_=0)).label("unanswered"),
        ).where(QuizResponse.session_id == session.id)
    ).first()

    return {
        "total_responses": result.total or 0,
        "correct_count": result.correct or 0,
        "incorrect_count": result.incorrect or 0,
        "unanswered_count": result.unanswered or 0,
    }


def get_activity_data(db: Session, user: User, days: int = 7) -> List[dict]:
    """
    Get quiz activity data for the past N days.

    Returns a list of dicts with date and count of completed quiz sessions.
    """
    from sqlalchemy import cast, Date

    # Calculate the start date (N days ago)
    start_date = datetime.now(tz=timezone.utc) - timedelta(days=days - 1)
    start_of_day = start_date.replace(hour=0, minute=0, second=0, microsecond=0)

    # Query completed quiz sessions grouped by date
    # Use func.date() for SQLite compatibility
    result = db.exec(
        select(
            func.date(QuizSession.started_at).label("date"),
            func.count(QuizSession.id).label("count")
        )
        .where(
            QuizSession.user_id == user.id,
            QuizSession.status == QuizStatus.COMPLETED,
            QuizSession.started_at >= start_of_day
        )
        .group_by(func.date(QuizSession.started_at))
        .order_by(func.date(QuizSession.started_at))
    ).all()

    # Create a dict for easy lookup (date is already string from func.date())
    activity_dict = {row.date: row.count for row in result}

    # Generate data for all days in the range, filling in 0 for days with no activity
    activity_data = []
    for i in range(days):
        date = (datetime.now(tz=timezone.utc) - timedelta(days=days - 1 - i)).date()
        date_str = str(date)
        activity_data.append({
            "date": date_str,
            "count": activity_dict.get(date_str, 0)
        })

    return activity_data
