"""
API routes for AI-powered deck generation.
Handles file uploads, parsing, and LLM-based flashcard generation.
"""

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from loguru import logger
from pydantic import BaseModel, Field
from sqlmodel import Session

from ...api.deps import get_current_active_user
from ...db.session import get_db
from ...models import User
from ...schemas.deck import DeckCreate, DeckRead
from ...services.file_parser import file_parser_service
from ...services.llm_service import llm_service
from ...services import decks as deck_service

router = APIRouter(prefix="/ai-decks", tags=["ai-decks"])


class OllamaStatusResponse(BaseModel):
    """Response model for Ollama availability check"""
    available: bool
    message: str


class GeneratedCardsResponse(BaseModel):
    """Response model for generated flashcards"""
    cards: List[Dict[str, Any]]
    count: int


@router.get("/ollama/status", response_model=OllamaStatusResponse)
async def check_ollama_status() -> OllamaStatusResponse:
    """
    Check if Ollama is installed and running.

    Returns:
        OllamaStatusResponse with availability status and message
    """
    is_available = await llm_service.check_ollama_availability()

    if is_available:
        return OllamaStatusResponse(
            available=True,
            message="Ollama is available and running"
        )
    else:
        return OllamaStatusResponse(
            available=False,
            message="Ollama is not available. Please install and run Ollama, or configure an OpenAI API key in settings."
        )


@router.post("/generate-from-file", response_model=GeneratedCardsResponse)
async def generate_cards_from_file(
    file: UploadFile = File(..., description="PDF, PPT, DOCX, or TXT file"),
    num_cards: int = Form(..., ge=5, le=20, description="Number of flashcards to generate (5-20)"),
    current_user: User = Depends(get_current_active_user),
) -> GeneratedCardsResponse:
    """
    Generate flashcards from an uploaded file using AI.

    This endpoint:
    1. Accepts file upload (PDF, PPT, DOCX, TXT)
    2. Parses and extracts text content
    3. Uses LLM (OpenAI or Ollama) to generate flashcards
    4. Returns generated cards for user review

    The user can then review and edit the cards before creating a deck.

    Args:
        file: Uploaded file (PDF, PPT, DOCX, or TXT)
        num_cards: Number of flashcards to generate (5-20)
        current_user: Authenticated user

    Returns:
        GeneratedCardsResponse with list of generated flashcards
    """
    try:
        # Step 1: Parse the uploaded file
        logger.info(f"Parsing file {file.filename} for user {current_user.id}")
        content = await file_parser_service.parse_file(file)

        if not content or len(content.strip()) < 50:
            raise HTTPException(
                status_code=400,
                detail="File content is too short. Please upload a file with more substantial content."
            )

        logger.info(f"Extracted {len(content)} characters from {file.filename}")

        # Step 2: Generate flashcards using LLM
        logger.info(f"Generating {num_cards} flashcards using LLM for user {current_user.id}")
        cards = await llm_service.generate_flashcards(
            content=content,
            num_cards=num_cards,
            user=current_user
        )

        logger.info(f"Successfully generated {len(cards)} flashcards")

        return GeneratedCardsResponse(
            cards=cards,
            count=len(cards)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating flashcards from file: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate flashcards: {str(e)}"
        )


class CreateDeckFromCardsRequest(BaseModel):
    """Request model for creating a deck from generated cards"""
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    tag_names: List[str] = Field(default_factory=list)
    cards: List[Dict[str, Any]] = Field(..., min_items=1)


@router.post("/create-deck", response_model=DeckRead)
async def create_deck_from_generated_cards(
    payload: CreateDeckFromCardsRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> DeckRead:
    """
    Create a new deck from AI-generated flashcards.

    This endpoint allows users to create a deck after reviewing and potentially
    editing the AI-generated flashcards.

    Args:
        payload: Deck creation request with title, description, tags, and cards
        current_user: Authenticated user
        db: Database session

    Returns:
        Created deck with all cards
    """
    try:
        # Transform cards to the format expected by DeckCreate
        cards_data = []
        for i, card in enumerate(payload.cards):
            card_type = card.get("type", "basic")
            prompt = card.get("prompt", "").strip()
            answer = card.get("answer", "").strip()

            # Basic validation
            if not prompt:
                raise HTTPException(
                    status_code=400,
                    detail=f"Card {i + 1}: Prompt is required"
                )
            if not answer:
                raise HTTPException(
                    status_code=400,
                    detail=f"Card {i + 1}: Answer is required"
                )

            card_data = {
                "type": card_type,
                "prompt": prompt,
                "answer": answer,
                "explanation": card.get("explanation")
            }

            # Add type-specific fields with validation
            if card_type == "multiple_choice":
                options = card.get("options", [])
                if not options or len(options) < 2:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Card {i + 1}: Multiple choice cards must have at least 2 options"
                    )
                if answer not in options:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Card {i + 1}: Answer must be one of the options"
                    )
                card_data["options"] = options

            elif card_type == "cloze":
                cloze_data = card.get("cloze_data", {})
                if not cloze_data or "blanks" not in cloze_data or not cloze_data["blanks"]:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Card {i + 1}: Cloze cards must have cloze_data with blanks"
                    )
                if "{{c" not in prompt:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Card {i + 1}: Cloze cards must contain at least one blank"
                    )
                card_data["cloze_data"] = cloze_data

            cards_data.append(card_data)

        # Create DeckCreate schema
        deck_create = DeckCreate(
            title=payload.title,
            description=payload.description,
            is_public=False,  # AI-generated decks are private by default
            tag_names=payload.tag_names,
            cards=cards_data
        )

        # Create the deck using the existing deck service
        deck = deck_service.create_deck(
            db=db,
            owner=current_user,
            deck_in=deck_create
        )

        logger.info(f"Created AI-powered deck {deck.id} with {len(cards_data)} cards for user {current_user.id}")

        return deck

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating deck from generated cards: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create deck: {str(e)}"
        )
