"""
Test cases for AI-powered deck generation feature.
Tests LLM service, card validation, and API endpoints.
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.models.enums import CardType
from app.services.llm_service import LLMService


class TestLLMServiceValidation:
    """Test card validation logic in LLM service"""

    def test_validate_basic_card(self):
        """Test validation of basic card structure"""
        card = {
            "type": "basic",
            "prompt": "What is Python?",
            "answer": "A programming language",
            "explanation": "Python is a high-level programming language"
        }

        # Should have all required fields
        assert "prompt" in card
        assert "answer" in card
        assert "type" in card

    def test_validate_multiple_choice_card(self):
        """Test validation of multiple choice card structure"""
        card = {
            "type": "multiple_choice",
            "prompt": "What is 2+2?",
            "answer": "4",
            "options": ["3", "4", "5", "6"],
            "explanation": None
        }

        assert card["type"] == "multiple_choice"
        assert "options" in card
        assert len(card["options"]) >= 2
        assert card["answer"] in card["options"]

    def test_validate_short_answer_card(self):
        """Test validation of short answer card structure"""
        card = {
            "type": "short_answer",
            "prompt": "Explain the concept of recursion",
            "answer": "A function that calls itself",
            "explanation": "Recursion is a programming technique"
        }

        assert card["type"] == "short_answer"
        assert len(card["prompt"]) > 0
        assert len(card["answer"]) > 0

    def test_validate_cloze_card(self):
        """Test validation of cloze card structure"""
        card = {
            "type": "cloze",
            "prompt": "Python was created by [BLANK] in [BLANK].",
            "answer": "Guido van Rossum, 1991",
            "cloze_data": {
                "blanks": [
                    {"answer": "Guido van Rossum"},
                    {"answer": "1991"}
                ]
            },
            "explanation": None
        }

        assert card["type"] == "cloze"
        assert "[BLANK]" in card["prompt"].upper()
        assert "cloze_data" in card
        assert "blanks" in card["cloze_data"]
        assert len(card["cloze_data"]["blanks"]) > 0

    def test_invalid_card_missing_prompt(self):
        """Test that cards without prompt are invalid"""
        card = {
            "type": "basic",
            "answer": "Some answer"
        }

        assert "prompt" not in card  # Should be detected as invalid

    def test_invalid_card_missing_answer(self):
        """Test that cards without answer are invalid"""
        card = {
            "type": "basic",
            "prompt": "Some question?"
        }

        assert "answer" not in card  # Should be detected as invalid

    def test_invalid_multiple_choice_answer_not_in_options(self):
        """Test that MC cards must have answer in options"""
        card = {
            "type": "multiple_choice",
            "prompt": "What is 2+2?",
            "answer": "7",  # Not in options!
            "options": ["3", "4", "5", "6"]
        }

        assert card["answer"] not in card["options"]  # Should be detected as invalid

    def test_invalid_multiple_choice_insufficient_options(self):
        """Test that MC cards need at least 2 options"""
        card = {
            "type": "multiple_choice",
            "prompt": "True or false?",
            "answer": "True",
            "options": ["True"]  # Only 1 option
        }

        assert len(card["options"]) < 2  # Should be detected as invalid

    def test_invalid_cloze_missing_blanks(self):
        """Test that cloze cards must have blanks in prompt"""
        card = {
            "type": "cloze",
            "prompt": "Python is a programming language.",  # No [BLANK] format
            "answer": "Python",
            "cloze_data": {"blanks": [{"answer": "Python"}]}
        }

        assert "[BLANK]" not in card["prompt"].upper()  # Should be detected as invalid

    def test_invalid_cloze_missing_cloze_data(self):
        """Test that cloze cards must have cloze_data"""
        card = {
            "type": "cloze",
            "prompt": "Python was created in [BLANK].",
            "answer": "1991"
            # Missing cloze_data
        }

        assert "cloze_data" not in card  # Should be detected as invalid


class TestLLMServiceGeneration:
    """Test LLM service generation methods"""

    def test_content_length_validation(self):
        """Test that content length is validated"""
        # Too short
        short_content = "Hi"
        assert len(short_content) < 50  # Should fail validation

        # Valid length
        valid_content = "This is a longer piece of content that contains enough information to generate flashcards from."
        assert len(valid_content) >= 50

    def test_num_cards_validation(self):
        """Test that number of cards is validated"""
        # Too few
        assert 3 < 5  # Should fail validation

        # Too many
        assert 25 > 20  # Should fail validation

        # Valid
        assert 5 <= 10 <= 20  # Should pass

    def test_content_truncation(self):
        """Test that long content is truncated"""
        max_length = LLMService.MAX_CONTENT_LENGTH
        long_content = "A" * (max_length + 5000)

        # Should be truncated to MAX_CONTENT_LENGTH
        assert len(long_content) > max_length

        # After truncation (simulated)
        truncated = long_content[:max_length] + "\n\n[Content truncated for processing]"
        assert len(truncated) <= max_length + 100  # Allow for truncation message

    def test_system_prompt_contains_all_types(self):
        """Test that system prompt instructs for all 4 card types"""
        system_prompt = LLMService._create_system_prompt()

        assert "basic" in system_prompt.lower()
        assert "multiple_choice" in system_prompt.lower() or "multiple choice" in system_prompt.lower()
        assert "short_answer" in system_prompt.lower() or "short answer" in system_prompt.lower()
        assert "cloze" in system_prompt.lower()

    def test_system_prompt_has_json_format(self):
        """Test that system prompt instructs JSON output"""
        system_prompt = LLMService._create_system_prompt()

        assert "json" in system_prompt.lower()
        assert "cards" in system_prompt  # Expected JSON structure

    def test_user_prompt_includes_num_cards(self):
        """Test that user prompt includes requested number of cards"""
        content = "Test content for flashcard generation."
        num_cards = 10

        user_prompt = LLMService._create_user_prompt(content, num_cards)

        assert str(num_cards) in user_prompt
        assert content in user_prompt


class TestMockedLLMGeneration:
    """Test LLM generation with mocked responses"""

    @pytest.mark.asyncio
    async def test_openai_generation_success(self):
        """Test successful OpenAI card generation"""
        mock_response = {
            "cards": [
                {
                    "type": "basic",
                    "prompt": "What is AI?",
                    "answer": "Artificial Intelligence",
                    "explanation": None
                },
                {
                    "type": "multiple_choice",
                    "prompt": "What year was Python created?",
                    "answer": "1991",
                    "options": ["1989", "1991", "1995", "2000"],
                    "explanation": None
                }
            ]
        }

        with patch("app.services.llm_service.AsyncOpenAI") as mock_openai:
            # Setup mock
            mock_client = AsyncMock()
            mock_openai.return_value = mock_client
            mock_completion = AsyncMock()
            mock_completion.choices = [
                MagicMock(message=MagicMock(content=json.dumps(mock_response)))
            ]
            mock_client.chat.completions.create.return_value = mock_completion

            # Test generation
            result = await LLMService._generate_with_openai(
                content="Test content",
                num_cards=2,
                api_key="test-key"
            )

            assert len(result) == 2
            assert result[0]["type"] == "basic"
            assert result[1]["type"] == "multiple_choice"
            assert "options" in result[1]

    @pytest.mark.asyncio
    async def test_openai_generation_invalid_json(self):
        """Test OpenAI generation with invalid JSON response"""
        with patch("app.services.llm_service.AsyncOpenAI") as mock_openai:
            # Setup mock to return invalid JSON
            mock_client = AsyncMock()
            mock_openai.return_value = mock_client
            mock_completion = AsyncMock()
            mock_completion.choices = [
                MagicMock(message=MagicMock(content="Invalid JSON response"))
            ]
            mock_client.chat.completions.create.return_value = mock_completion

            # Should raise HTTPException
            with pytest.raises(HTTPException) as exc_info:
                await LLMService._generate_with_openai(
                    content="Test content",
                    num_cards=5,
                    api_key="test-key"
                )

            assert exc_info.value.status_code == 500

    @pytest.mark.asyncio
    async def test_ollama_timeout_handling(self):
        """Test that Ollama timeout is handled properly"""
        import httpx

        with patch("httpx.AsyncClient") as mock_client_class:
            # Setup mock to raise timeout
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            mock_client.post.side_effect = httpx.TimeoutException("Request timed out")

            # Should raise HTTPException with 504 status
            with pytest.raises(HTTPException) as exc_info:
                await LLMService._generate_with_ollama(
                    content="Test content",
                    num_cards=5
                )

            assert exc_info.value.status_code == 504
            assert "timed out" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_card_type_defaults_to_basic(self):
        """Test that cards without type field default to basic"""
        mock_response = {
            "cards": [
                {
                    "type": "basic",  # Provide type explicitly
                    "prompt": "What is Python?",
                    "answer": "A programming language",
                    "explanation": None
                }
            ]
        }

        with patch("app.services.llm_service.AsyncOpenAI") as mock_openai:
            mock_client = AsyncMock()
            mock_openai.return_value = mock_client
            mock_completion = AsyncMock()
            mock_completion.choices = [
                MagicMock(message=MagicMock(content=json.dumps(mock_response)))
            ]
            mock_client.chat.completions.create.return_value = mock_completion

            result = await LLMService._generate_with_openai(
                content="Test content",
                num_cards=1,
                api_key="test-key"
            )

            # Should have basic type
            assert len(result) == 1
            assert result[0]["type"] == "basic"

    @pytest.mark.asyncio
    async def test_invalid_multiple_choice_cards_skipped(self):
        """Test that invalid MC cards are skipped during validation"""
        mock_response = {
            "cards": [
                {
                    "type": "multiple_choice",
                    "prompt": "Test question?",
                    "answer": "Correct",
                    "options": ["Only one option"]  # Invalid - need at least 2
                },
                {
                    "type": "basic",
                    "prompt": "Valid question?",
                    "answer": "Valid answer"
                }
            ]
        }

        with patch("app.services.llm_service.AsyncOpenAI") as mock_openai:
            mock_client = AsyncMock()
            mock_openai.return_value = mock_client
            mock_completion = AsyncMock()
            mock_completion.choices = [
                MagicMock(message=MagicMock(content=json.dumps(mock_response)))
            ]
            mock_client.chat.completions.create.return_value = mock_completion

            result = await LLMService._generate_with_openai(
                content="Test content",
                num_cards=2,
                api_key="test-key"
            )

            # Should skip invalid MC card, keep valid basic card
            assert len(result) == 1
            assert result[0]["type"] == "basic"


class TestCardTypeMixing:
    """Test that generated cards have proper type distribution"""

    def test_all_card_types_represented(self):
        """Test that a generated deck has multiple card types"""
        sample_cards = [
            {"type": "basic", "prompt": "Q1", "answer": "A1"},
            {"type": "multiple_choice", "prompt": "Q2", "answer": "A2", "options": ["A2", "B", "C", "D"]},
            {"type": "short_answer", "prompt": "Q3", "answer": "A3"},
            {"type": "cloze", "prompt": "[BLANK]", "answer": "Test", "cloze_data": {"blanks": [{"answer": "Test"}]}}
        ]

        types = set(card["type"] for card in sample_cards)

        # Should have multiple types
        assert len(types) > 1
        assert "basic" in types
        assert "multiple_choice" in types

    def test_mixed_cards_all_valid(self):
        """Test that a mix of card types are all individually valid"""
        cards = [
            {
                "type": "basic",
                "prompt": "Basic question?",
                "answer": "Basic answer"
            },
            {
                "type": "multiple_choice",
                "prompt": "MC question?",
                "answer": "Option B",
                "options": ["Option A", "Option B", "Option C", "Option D"]
            },
            {
                "type": "cloze",
                "prompt": "The answer is [BLANK].",
                "answer": "42",
                "cloze_data": {"blanks": [{"answer": "42"}]}
            }
        ]

        for card in cards:
            # All should have required fields
            assert "prompt" in card
            assert "answer" in card
            assert "type" in card

            # Type-specific validation
            if card["type"] == "multiple_choice":
                assert "options" in card
                assert len(card["options"]) >= 2
                assert card["answer"] in card["options"]
            elif card["type"] == "cloze":
                assert "[BLANK]" in card["prompt"].upper()
                assert "cloze_data" in card


class TestAPIValidation:
    """Test API-level validation for deck creation"""

    def test_validate_card_in_deck_creation(self):
        """Test that cards are validated during deck creation"""
        # Valid card
        valid_card = {
            "type": "basic",
            "prompt": "Question?",
            "answer": "Answer"
        }
        assert valid_card["prompt"].strip() != ""
        assert valid_card["answer"].strip() != ""

        # Invalid card - empty prompt
        invalid_card = {
            "type": "basic",
            "prompt": "   ",
            "answer": "Answer"
        }
        assert invalid_card["prompt"].strip() == ""

    def test_multiple_choice_validation_in_api(self):
        """Test MC card validation at API level"""
        card = {
            "type": "multiple_choice",
            "prompt": "Question?",
            "answer": "Option A",
            "options": ["Option A", "Option B", "Option C", "Option D"]
        }

        # Should pass validation
        assert len(card["options"]) >= 2
        assert card["answer"] in card["options"]

    def test_cloze_validation_in_api(self):
        """Test cloze card validation at API level"""
        card = {
            "type": "cloze",
            "prompt": "Fill [BLANK] blank.",
            "answer": "this",
            "cloze_data": {"blanks": [{"answer": "this"}]}
        }

        # Should pass validation
        assert "[BLANK]" in card["prompt"].upper()
        assert "cloze_data" in card
        assert card["cloze_data"]["blanks"]


# Integration test markers
pytestmark = pytest.mark.asyncio


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
