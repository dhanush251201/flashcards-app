from fastapi import APIRouter

from .routes import ai_decks, auth, decks, study, users


api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(decks.router)
api_router.include_router(study.router)
api_router.include_router(ai_decks.router)

