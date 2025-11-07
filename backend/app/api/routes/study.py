from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from ...api.deps import get_current_active_user
from ...db.session import get_db
from ...models import Card, QuizSession, User
from ...schemas.common import Message
from ...schemas.study import (
    ActivityData,
    DueReviewCard,
    SessionStatistics,
    StudyAnswerCreate,
    StudyAnswerRead,
    StudySessionCreate,
    StudySessionRead,
)
from ...services import study as study_service


router = APIRouter(prefix="/study", tags=["study"])


@router.post("/sessions", response_model=StudySessionRead, status_code=status.HTTP_201_CREATED)
def create_study_session(
    payload: StudySessionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> StudySessionRead:
    session = study_service.create_session(db, current_user, payload)
    return StudySessionRead.model_validate(session)


@router.get("/sessions/{session_id}", response_model=StudySessionRead)
def read_study_session(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> StudySessionRead:
    session = study_service.get_session_or_404(db, session_id, current_user)
    return StudySessionRead.model_validate(session)


@router.post("/sessions/{session_id}/answer", response_model=StudyAnswerRead)
async def submit_answer(
    session_id: int,
    payload: StudyAnswerCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> StudyAnswerRead:
    session = study_service.get_session_or_404(db, session_id, current_user)
    card = db.get(Card, payload.card_id)
    if not card or card.deck_id != session.deck_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not part of session deck")
    response, llm_feedback = await study_service.record_answer(db, session, card, current_user, payload)

    # Create response dict with LLM feedback
    response_dict = StudyAnswerRead.model_validate(response).model_dump()
    response_dict["llm_feedback"] = llm_feedback

    return StudyAnswerRead(**response_dict)


@router.post("/sessions/{session_id}/finish", response_model=StudySessionRead)
def finish_session(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> StudySessionRead:
    session = study_service.get_session_or_404(db, session_id, current_user)
    session = study_service.finish_session(db, session, current_user)
    return StudySessionRead.model_validate(session)


@router.get("/sessions/{session_id}/statistics", response_model=SessionStatistics)
def get_session_statistics(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> SessionStatistics:
    session = study_service.get_session_or_404(db, session_id, current_user)
    stats = study_service.get_session_statistics(db, session)
    return SessionStatistics(**stats)


@router.get("/reviews/due", response_model=list[DueReviewCard])
def get_due_reviews(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[DueReviewCard]:
    return study_service.due_reviews(db, current_user)


@router.get("/activity", response_model=list[ActivityData])
def get_activity(
    days: int = 7,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list[ActivityData]:
    """Get quiz activity data for the past N days (default 7)."""
    activity_data = study_service.get_activity_data(db, current_user, days)
    return [ActivityData(**item) for item in activity_data]

