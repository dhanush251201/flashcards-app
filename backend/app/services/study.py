from datetime import datetime, timedelta, timezone
from typing import Iterable, List, Tuple

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlmodel import Session

from ..models import Card, QuizResponse, QuizSession, SRSReview, User, UserDeckProgress
from ..models.enums import CardType, QuizMode, QuizStatus
from ..schemas.study import DueReviewCard, StudyAnswerCreate, StudySessionCreate


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


def finish_session(db: Session, session: QuizSession) -> QuizSession:
    session.status = QuizStatus.COMPLETED
    session.ended_at = datetime.now(tz=timezone.utc)
    db.add(session)
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


def record_answer(
    db: Session,
    session: QuizSession,
    card: Card,
    user: User,
    answer_in: StudyAnswerCreate,
) -> QuizResponse:
    is_correct: bool | None = None
    quality = answer_in.quality

    if session.mode == QuizMode.PRACTICE and card.type == CardType.MULTIPLE_CHOICE:
        is_correct = answer_in.user_answer == card.answer
    elif session.mode == QuizMode.EXAM:
        is_correct = answer_in.user_answer == card.answer

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
    return response


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
