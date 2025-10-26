from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session

from ...db.session import get_db
from ...models import User
from ...services import auth as auth_service
from ...schemas.auth import LoginRequest, RefreshRequest, RefreshResponse, SignupRequest, Token
from ...schemas.common import Message
from ...schemas.user import UserRead


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)) -> Token:
    user = auth_service.create_user(db, payload)
    access_token, refresh_token = auth_service.issue_tokens_for_user(user)
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> Token:
    user = auth_service.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token, refresh_token = auth_service.issue_tokens_for_user(user)
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/logout", response_model=Message)
def logout() -> Message:
    # Client should drop tokens; server retains stateless JWT.
    return Message(message="Logged out")


@router.post("/refresh", response_model=RefreshResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> RefreshResponse:
    decoded = auth_service.decode_token(payload.refresh_token, token_type="refresh")
    user_id = decoded.get("sub")
    user = db.get(User, int(user_id)) if user_id else None
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    access_token, refresh_token = auth_service.issue_tokens_for_user(user)
    return RefreshResponse(access_token=access_token, refresh_token=refresh_token)

