"""
LLM Service for AI-powered flashcard generation.
Supports both OpenAI and Ollama providers with agentic AI patterns.
"""

import json
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from loguru import logger
from openai import AsyncOpenAI, OpenAIError
import httpx

from ..models.user import User


class LLMService:
    """Service for generating flashcards using LLMs"""

    # Default model configurations
    OPENAI_MODEL = "gpt-4o-mini"  # Fast and cost-effective
    OLLAMA_MODEL = "gpt-oss:20b"  # Default Ollama model (using available model)
    OLLAMA_BASE_URL = "http://host.docker.internal:11434"  # Access host machine from Docker

    # Generation parameters
    TEMPERATURE = 0.7
    MAX_TOKENS = 4000
    MAX_CONTENT_LENGTH = 10000  # Maximum characters of content to send to LLM

    @staticmethod
    def _create_system_prompt() -> str:
        """Create the system prompt for flashcard generation"""
        return """You are an expert educational content creator specializing in creating high-quality flashcards.

Your task is to analyze the provided text and generate flashcards using FOUR different question types:
1. BASIC - Simple question and answer pairs
2. MULTIPLE_CHOICE - Questions with 4 options and one correct answer
3. SHORT_ANSWER - Open-ended questions with a definitive answer
4. CLOZE - Fill-in-the-blank style questions

Guidelines for each type:
- BASIC: Simple Q&A for definitions, facts, concepts
- MULTIPLE_CHOICE: Include 4 plausible options with one correct answer. Distractors should be related but clearly incorrect.
- SHORT_ANSWER: Test deeper understanding with questions requiring constructed responses
- CLOZE: Create sentences with missing key terms. Use [BLANK] for each blank (not {{c1::text}}).

General guidelines:
- Create a balanced mix of all 4 question types
- Focus on key concepts, definitions, facts, and relationships
- Ensure questions are specific and unambiguous
- Keep answers concise but complete
- Add explanations for complex or nuanced topics
- Avoid overly simple or trivial questions
- Ensure flashcards are self-contained and understandable

You must respond ONLY with valid JSON in the following format:
{
  "cards": [
    {
      "type": "basic",
      "prompt": "What is photosynthesis?",
      "answer": "The process by which plants convert light energy into chemical energy",
      "explanation": "Optional explanation (can be null)"
    },
    {
      "type": "multiple_choice",
      "prompt": "What is the primary function of mitochondria?",
      "answer": "Energy production",
      "options": ["Energy production", "Protein synthesis", "DNA storage", "Waste removal"],
      "explanation": "Optional explanation (can be null)"
    },
    {
      "type": "short_answer",
      "prompt": "Explain the relationship between DNA and RNA in protein synthesis.",
      "answer": "DNA is transcribed into RNA, which is then translated into proteins",
      "explanation": "Optional explanation (can be null)"
    },
    {
      "type": "cloze",
      "prompt": "The [BLANK] is known as the powerhouse of the cell because it produces [BLANK].",
      "answer": "mitochondria, ATP",
      "cloze_data": {
        "blanks": [
          {"answer": "mitochondria"},
          {"answer": "ATP"}
        ]
      },
      "explanation": "Optional explanation (can be null)"
    }
  ]
}

IMPORTANT:
- For MULTIPLE_CHOICE, the "answer" field must be the exact correct option text (one of the items in "options")
- For CLOZE, use [BLANK] for each blank in the prompt (in order). The answer should be comma-separated values. The cloze_data.blanks array should contain objects with "answer" field for each blank.
- Ensure a good mix of all 4 types
DO NOT include any text before or after the JSON. The response must be valid JSON that can be parsed."""

    @staticmethod
    def _create_user_prompt(content: str, num_cards: int) -> str:
        """Create the user prompt with content and requirements"""
        return f"""Please analyze the following content and generate exactly {num_cards} high-quality flashcards.

Content:
{content}

Generate exactly {num_cards} flashcards covering the most important concepts from this content.
Respond with ONLY the JSON object, no additional text."""

    @staticmethod
    async def generate_flashcards(
        content: str,
        num_cards: int,
        user: User
    ) -> List[Dict[str, Any]]:
        """
        Generate flashcards from content using the appropriate LLM provider.

        Args:
            content: Text content to generate flashcards from
            num_cards: Number of flashcards to generate (5-20)
            user: User object containing LLM settings

        Returns:
            List of flashcard dictionaries with prompt, answer, and optional explanation

        Raises:
            HTTPException: If generation fails or no provider is available
        """
        # Validate number of cards
        if not 5 <= num_cards <= 20:
            raise HTTPException(
                status_code=400,
                detail="Number of cards must be between 5 and 20"
            )

        # Validate content
        if not content or len(content.strip()) < 50:
            raise HTTPException(
                status_code=400,
                detail="Content too short. Please provide more substantial content for flashcard generation."
            )

        # Truncate content if too long to prevent overwhelming the LLM
        if len(content) > LLMService.MAX_CONTENT_LENGTH:
            logger.warning(f"Content length {len(content)} exceeds maximum {LLMService.MAX_CONTENT_LENGTH}. Truncating.")
            content = content[:LLMService.MAX_CONTENT_LENGTH] + "\n\n[Content truncated for processing]"

        # Determine which provider to use
        use_openai = bool(user.openai_api_key)
        use_ollama = not use_openai

        # If user has preference and API key, respect it
        if user.llm_provider_preference == "openai" and user.openai_api_key:
            use_openai = True
            use_ollama = False
        elif user.llm_provider_preference == "ollama":
            use_openai = False
            use_ollama = True

        try:
            if use_openai:
                logger.info(f"Generating {num_cards} flashcards using OpenAI for user {user.id}")
                return await LLMService._generate_with_openai(
                    content, num_cards, user.openai_api_key
                )
            elif use_ollama:
                logger.info(f"Generating {num_cards} flashcards using Ollama for user {user.id}")
                # First check if Ollama is available
                if not await LLMService.check_ollama_availability():
                    raise HTTPException(
                        status_code=503,
                        detail="Ollama is not available. Please install Ollama or provide an OpenAI API key in settings."
                    )
                return await LLMService._generate_with_ollama(content, num_cards)
            else:
                raise HTTPException(
                    status_code=400,
                    detail="No LLM provider configured. Please set up OpenAI API key or install Ollama."
                )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error generating flashcards: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate flashcards: {str(e)}"
            )

    @staticmethod
    async def _generate_with_openai(
        content: str,
        num_cards: int,
        api_key: str
    ) -> List[Dict[str, Any]]:
        """Generate flashcards using OpenAI API"""
        try:
            client = AsyncOpenAI(api_key=api_key)

            response = await client.chat.completions.create(
                model=LLMService.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": LLMService._create_system_prompt()},
                    {"role": "user", "content": LLMService._create_user_prompt(content, num_cards)}
                ],
                temperature=LLMService.TEMPERATURE,
                max_tokens=LLMService.MAX_TOKENS,
                response_format={"type": "json_object"}  # Ensure JSON response
            )

            # Parse the response
            response_text = response.choices[0].message.content
            flashcards_data = json.loads(response_text)

            # Validate response structure
            if "cards" not in flashcards_data:
                raise ValueError("Invalid response format: missing 'cards' field")

            cards = flashcards_data["cards"]

            # Validate we got the right number of cards
            if len(cards) != num_cards:
                logger.warning(
                    f"Requested {num_cards} cards but got {len(cards)}. Using what we got."
                )

            # Validate each card
            validated_cards = []
            for i, card in enumerate(cards):
                if "prompt" not in card or "answer" not in card or "type" not in card:
                    logger.warning(f"Card {i} missing required fields, skipping")
                    continue

                card_type = card.get("type", "basic")

                # Validate card type
                if card_type not in ["basic", "multiple_choice", "short_answer", "cloze"]:
                    logger.warning(f"Card {i} has invalid type '{card_type}', defaulting to 'basic'")
                    card_type = "basic"

                validated_card = {
                    "type": card_type,
                    "prompt": card["prompt"],
                    "answer": card["answer"],
                    "explanation": card.get("explanation")
                }

                # Add type-specific fields
                if card_type == "multiple_choice":
                    options = card.get("options", [])
                    if not options or len(options) < 2:
                        logger.warning(f"Card {i} is multiple_choice but has insufficient options, skipping")
                        continue
                    validated_card["options"] = options

                elif card_type == "cloze":
                    cloze_data = card.get("cloze_data")
                    if not cloze_data or "blanks" not in cloze_data:
                        logger.warning(f"Card {i} is cloze but missing cloze_data, skipping")
                        continue
                    validated_card["cloze_data"] = cloze_data

                validated_cards.append(validated_card)

            if not validated_cards:
                raise ValueError("No valid flashcards were generated")

            return validated_cards

        except OpenAIError as e:
            logger.error(f"OpenAI API error: {str(e)}")
            if "invalid_api_key" in str(e).lower():
                raise HTTPException(
                    status_code=401,
                    detail="Invalid OpenAI API key. Please update your settings."
                )
            raise HTTPException(
                status_code=500,
                detail=f"OpenAI API error: {str(e)}"
            )
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenAI response as JSON: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to parse LLM response. Please try again."
            )
        except Exception as e:
            logger.error(f"Error in OpenAI generation: {str(e)}")
            raise

    @staticmethod
    async def _generate_with_ollama(
        content: str,
        num_cards: int
    ) -> List[Dict[str, Any]]:
        """Generate flashcards using Ollama"""
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:  # Increased to 5 minutes for complex prompts
                response = await client.post(
                    f"{LLMService.OLLAMA_BASE_URL}/api/chat",
                    json={
                        "model": LLMService.OLLAMA_MODEL,
                        "messages": [
                            {"role": "system", "content": LLMService._create_system_prompt()},
                            {"role": "user", "content": LLMService._create_user_prompt(content, num_cards)}
                        ],
                        "stream": False,
                        "options": {
                            "temperature": LLMService.TEMPERATURE,
                            "num_predict": LLMService.MAX_TOKENS
                        },
                        "format": "json"  # Request JSON format
                    }
                )

                if response.status_code != 200:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Ollama API error: {response.text}"
                    )

                result = response.json()
                response_text = result.get("message", {}).get("content", "")

                # Log the raw response for debugging
                logger.debug(f"Ollama raw response (first 500 chars): {response_text[:500]}")

                # Parse the response
                flashcards_data = json.loads(response_text)

                # Log the parsed response structure for debugging
                logger.info(f"Parsed {len(flashcards_data.get('cards', []))} cards from Ollama response")

                # Validate response structure
                if "cards" not in flashcards_data:
                    logger.error(f"Invalid response format. Response keys: {flashcards_data.keys()}")
                    raise ValueError("Invalid response format: missing 'cards' field")

                cards = flashcards_data["cards"]

                # Validate we got cards
                if len(cards) != num_cards:
                    logger.warning(
                        f"Requested {num_cards} cards but got {len(cards)}. Using what we got."
                    )

                # Validate each card
                validated_cards = []
                for i, card in enumerate(cards):
                    # Only require prompt and answer, type is optional and defaults to "basic"
                    if "prompt" not in card or "answer" not in card:
                        logger.warning(f"Card {i} missing required fields (prompt or answer). Card keys: {card.keys()}")
                        continue

                    card_type = card.get("type", "basic")  # Default to basic if type is missing

                    # Validate card type
                    if card_type not in ["basic", "multiple_choice", "short_answer", "cloze"]:
                        logger.warning(f"Card {i} has invalid type '{card_type}', defaulting to 'basic'")
                        card_type = "basic"

                    validated_card = {
                        "type": card_type,
                        "prompt": card["prompt"],
                        "answer": card["answer"],
                        "explanation": card.get("explanation")
                    }

                    # Add type-specific fields
                    if card_type == "multiple_choice":
                        options = card.get("options", [])
                        if not options or len(options) < 2:
                            logger.warning(f"Card {i} is multiple_choice but has insufficient options, skipping")
                            continue
                        validated_card["options"] = options

                    elif card_type == "cloze":
                        cloze_data = card.get("cloze_data")
                        if not cloze_data or "blanks" not in cloze_data:
                            logger.warning(f"Card {i} is cloze but missing cloze_data, skipping")
                            continue
                        validated_card["cloze_data"] = cloze_data

                    validated_cards.append(validated_card)

                if not validated_cards:
                    logger.error(f"No valid flashcards generated. Total cards received: {len(cards)}")
                    if cards:
                        logger.error(f"Sample card structure: {cards[0]}")
                    raise ValueError("No valid flashcards were generated")

                logger.info(f"Successfully validated {len(validated_cards)} flashcards")
                return validated_cards

        except httpx.ConnectError:
            logger.error("Could not connect to Ollama")
            raise HTTPException(
                status_code=503,
                detail="Could not connect to Ollama. Please ensure Ollama is running."
            )
        except httpx.TimeoutException:
            logger.error("Ollama request timed out")
            raise HTTPException(
                status_code=504,
                detail="Ollama request timed out. Please try again with shorter content."
            )
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Ollama response as JSON: {str(e)}")
            logger.error(f"Response text (first 1000 chars): {response_text[:1000] if 'response_text' in locals() else 'N/A'}")
            raise HTTPException(
                status_code=500,
                detail="Failed to parse LLM response. The model may not be following JSON format. Please try again."
            )
        except Exception as e:
            logger.error(f"Error in Ollama generation: {str(e)}")
            raise

    @staticmethod
    async def check_ollama_availability() -> bool:
        """
        Check if Ollama is available and running.

        Returns:
            True if Ollama is available, False otherwise
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{LLMService.OLLAMA_BASE_URL}/api/tags")
                return response.status_code == 200
        except Exception as e:
            logger.debug(f"Ollama not available: {str(e)}")
            return False

    @staticmethod
    def _create_answer_checking_prompt(question: str, expected_answer: str, user_answer: str) -> str:
        """Create prompt for checking answer correctness"""
        return f"""You are an expert educator tasked with evaluating student answers.

Question: {question}
Expected Answer: {expected_answer}
Student's Answer: {user_answer}

Evaluate if the student's answer is semantically correct compared to the expected answer. Consider:
1. The core meaning and concepts are the same
2. Minor wording differences are acceptable
3. Synonyms and paraphrasing are acceptable
4. Spelling and grammar errors should be ignored if the meaning is clear

You must respond with ONLY a JSON object in this exact format:
{{
  "is_correct": true or false,
  "feedback": "Brief explanation of why the answer is correct or incorrect. If incorrect, provide the correct answer and optionally a helpful explanation."
}}

Important:
- The "is_correct" field must be a boolean (true/false)
- The "feedback" field should be a concise string (1-2 sentences)
- If the answer is correct, the feedback should be encouraging (e.g., "Correct! Great job.")
- If incorrect, provide the correct answer and a brief explanation of why
- DO NOT include any text before or after the JSON"""

    @staticmethod
    async def check_answer(
        question: str,
        expected_answer: str,
        user_answer: str,
        user: Optional[User] = None
    ) -> Dict[str, Any]:
        """
        Use LLM to check if a user's answer is semantically correct.

        Args:
            question: The question prompt
            expected_answer: The correct/expected answer
            user_answer: The user's submitted answer
            user: Optional user object for LLM provider preference

        Returns:
            Dict with 'is_correct' (bool) and 'feedback' (str) keys

        Raises:
            Returns None if LLM checking fails (falls back to exact matching)
        """
        # Validate inputs
        if not question or not expected_answer or not user_answer:
            return None

        # Determine which provider to use
        use_openai = user and bool(user.openai_api_key)
        use_ollama = not use_openai

        if user and user.llm_provider_preference == "openai" and user.openai_api_key:
            use_openai = True
            use_ollama = False
        elif user and user.llm_provider_preference == "ollama":
            use_openai = False
            use_ollama = True

        try:
            if use_openai:
                logger.info("Checking answer using OpenAI")
                return await LLMService._check_answer_with_openai(
                    question, expected_answer, user_answer, user.openai_api_key
                )
            elif use_ollama:
                logger.info("Checking answer using Ollama")
                # Check if Ollama is available
                if await LLMService.check_ollama_availability():
                    return await LLMService._check_answer_with_ollama(
                        question, expected_answer, user_answer
                    )
                else:
                    logger.warning("Ollama not available for answer checking")
                    return None
            else:
                logger.info("No LLM provider available for answer checking")
                return None

        except Exception as e:
            logger.error(f"Error checking answer with LLM: {str(e)}")
            return None

    @staticmethod
    async def _check_answer_with_openai(
        question: str,
        expected_answer: str,
        user_answer: str,
        api_key: str
    ) -> Dict[str, Any]:
        """Check answer using OpenAI API"""
        try:
            client = AsyncOpenAI(api_key=api_key)

            response = await client.chat.completions.create(
                model=LLMService.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are an expert educator evaluating student answers. Respond only with valid JSON."},
                    {"role": "user", "content": LLMService._create_answer_checking_prompt(question, expected_answer, user_answer)}
                ],
                temperature=0.3,  # Lower temperature for more consistent evaluation
                max_tokens=500,
                response_format={"type": "json_object"}
            )

            response_text = response.choices[0].message.content
            result = json.loads(response_text)

            # Validate response structure
            if "is_correct" not in result or "feedback" not in result:
                logger.error("Invalid response format from OpenAI")
                return None

            return result

        except Exception as e:
            logger.error(f"Error in OpenAI answer checking: {str(e)}")
            return None

    @staticmethod
    async def _check_answer_with_ollama(
        question: str,
        expected_answer: str,
        user_answer: str
    ) -> Dict[str, Any]:
        """Check answer using Ollama"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{LLMService.OLLAMA_BASE_URL}/api/chat",
                    json={
                        "model": LLMService.OLLAMA_MODEL,
                        "messages": [
                            {"role": "system", "content": "You are an expert educator evaluating student answers. Respond only with valid JSON."},
                            {"role": "user", "content": LLMService._create_answer_checking_prompt(question, expected_answer, user_answer)}
                        ],
                        "stream": False,
                        "options": {
                            "temperature": 0.3,
                            "num_predict": 500
                        },
                        "format": "json"
                    }
                )

                if response.status_code != 200:
                    logger.error(f"Ollama API error: {response.text}")
                    return None

                result = response.json()
                response_text = result.get("message", {}).get("content", "")

                parsed_result = json.loads(response_text)

                # Validate response structure
                if "is_correct" not in parsed_result or "feedback" not in parsed_result:
                    logger.error("Invalid response format from Ollama")
                    return None

                return parsed_result

        except Exception as e:
            logger.error(f"Error in Ollama answer checking: {str(e)}")
            return None


# Singleton instance
llm_service = LLMService()
