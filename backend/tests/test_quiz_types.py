"""
Integration tests for SHORT_ANSWER and CLOZE quiz types.

This module tests the full functionality of both quiz types including:
- Card creation with proper data structures
- Answer grading logic
- Multiple acceptable answers
- Case-insensitive matching
"""

import pytest
from app.services.study import _normalize_answer, _check_answer_correctness, _check_cloze_answer
from app.models import Card
from app.models.enums import CardType


class TestShortAnswerType:
    """Tests for SHORT_ANSWER card type."""

    def test_normalize_answer_strips_whitespace(self):
        """Test that answer normalization removes leading/trailing whitespace."""
        assert _normalize_answer("  Paris  ") == "paris"
        assert _normalize_answer("Paris\n") == "paris"

    def test_normalize_answer_lowercases(self):
        """Test that answer normalization converts to lowercase."""
        assert _normalize_answer("PARIS") == "paris"
        assert _normalize_answer("PaRiS") == "paris"

    def test_short_answer_exact_match(self):
        """Test SHORT_ANSWER with exact answer match."""
        card = Card(
            id=1,
            deck_id=1,
            type=CardType.SHORT_ANSWER,
            prompt="What is the capital of France?",
            answer="Paris",
            options=None,
            cloze_data=None
        )

        # Exact match should work
        assert _check_answer_correctness(card, "Paris") is True

        # Case-insensitive match
        assert _check_answer_correctness(card, "paris") is True
        assert _check_answer_correctness(card, "PARIS") is True

        # With whitespace
        assert _check_answer_correctness(card, "  Paris  ") is True

        # Wrong answer
        assert _check_answer_correctness(card, "London") is False

    def test_short_answer_multiple_acceptable_answers(self):
        """Test SHORT_ANSWER with multiple acceptable answers in options."""
        card = Card(
            id=1,
            deck_id=1,
            type=CardType.SHORT_ANSWER,
            prompt="What is the capital of France?",
            answer="Paris",
            options=["Paris", "París", "Capital of France"],
            cloze_data=None
        )

        # All acceptable answers should work
        assert _check_answer_correctness(card, "Paris") is True
        assert _check_answer_correctness(card, "París") is True
        assert _check_answer_correctness(card, "capital of france") is True

        # Wrong answer
        assert _check_answer_correctness(card, "London") is False

    def test_short_answer_empty_input(self):
        """Test SHORT_ANSWER with empty user input."""
        card = Card(
            id=1,
            deck_id=1,
            type=CardType.SHORT_ANSWER,
            prompt="What is the capital of France?",
            answer="Paris",
            options=None,
            cloze_data=None
        )

        assert _check_answer_correctness(card, "") is False
        assert _check_answer_correctness(card, None) is False
        assert _check_answer_correctness(card, "   ") is False


class TestClozeType:
    """Tests for CLOZE card type."""

    def test_cloze_single_blank_correct(self):
        """Test CLOZE with single blank - correct answer."""
        card = Card(
            id=1,
            deck_id=1,
            type=CardType.CLOZE,
            prompt="The capital of France is [BLANK].",
            answer="Paris",
            options=None,
            cloze_data={
                "blanks": [
                    {"answer": "Paris"}
                ]
            }
        )

        # Correct answer as JSON array
        assert _check_cloze_answer(card, '["Paris"]') is True
        assert _check_cloze_answer(card, '["paris"]') is True  # Case-insensitive
        assert _check_cloze_answer(card, '["  Paris  "]') is True  # Whitespace handling

    def test_cloze_single_blank_incorrect(self):
        """Test CLOZE with single blank - incorrect answer."""
        card = Card(
            id=1,
            deck_id=1,
            type=CardType.CLOZE,
            prompt="The capital of France is [BLANK].",
            answer="Paris",
            options=None,
            cloze_data={
                "blanks": [
                    {"answer": "Paris"}
                ]
            }
        )

        assert _check_cloze_answer(card, '["London"]') is False

    def test_cloze_multiple_blanks_all_correct(self):
        """Test CLOZE with multiple blanks - all correct."""
        card = Card(
            id=1,
            deck_id=1,
            type=CardType.CLOZE,
            prompt="The capital of [BLANK] is [BLANK].",
            answer="France, Paris",
            options=None,
            cloze_data={
                "blanks": [
                    {"answer": "France"},
                    {"answer": "Paris"}
                ]
            }
        )

        assert _check_cloze_answer(card, '["France", "Paris"]') is True
        assert _check_cloze_answer(card, '["france", "paris"]') is True

    def test_cloze_multiple_blanks_partial_correct(self):
        """Test CLOZE with multiple blanks - only some correct (should fail)."""
        card = Card(
            id=1,
            deck_id=1,
            type=CardType.CLOZE,
            prompt="The capital of [BLANK] is [BLANK].",
            answer="France, Paris",
            options=None,
            cloze_data={
                "blanks": [
                    {"answer": "France"},
                    {"answer": "Paris"}
                ]
            }
        )

        # First correct, second wrong
        assert _check_cloze_answer(card, '["France", "London"]') is False

        # First wrong, second correct
        assert _check_cloze_answer(card, '["Spain", "Paris"]') is False

    def test_cloze_multiple_acceptable_answers_per_blank(self):
        """Test CLOZE with multiple acceptable answers for each blank."""
        card = Card(
            id=1,
            deck_id=1,
            type=CardType.CLOZE,
            prompt="The capital of France is [BLANK] and it's known for the [BLANK] Tower.",
            answer="Paris, Eiffel",
            options=None,
            cloze_data={
                "blanks": [
                    {"answer": ["Paris", "París"]},
                    {"answer": ["Eiffel", "Eifel"]}
                ]
            }
        )

        # Different combinations of acceptable answers
        assert _check_cloze_answer(card, '["Paris", "Eiffel"]') is True
        assert _check_cloze_answer(card, '["París", "Eiffel"]') is True
        assert _check_cloze_answer(card, '["Paris", "Eifel"]') is True
        assert _check_cloze_answer(card, '["parís", "eifel"]') is True  # Case-insensitive

        # Wrong answers
        assert _check_cloze_answer(card, '["London", "Eiffel"]') is False
        assert _check_cloze_answer(card, '["Paris", "Tower"]') is False

    def test_cloze_wrong_number_of_blanks(self):
        """Test CLOZE fails when user provides wrong number of answers."""
        card = Card(
            id=1,
            deck_id=1,
            type=CardType.CLOZE,
            prompt="The capital of [BLANK] is [BLANK].",
            answer="France, Paris",
            options=None,
            cloze_data={
                "blanks": [
                    {"answer": "France"},
                    {"answer": "Paris"}
                ]
            }
        )

        # Too few answers
        assert _check_cloze_answer(card, '["France"]') is False

        # Too many answers
        assert _check_cloze_answer(card, '["France", "Paris", "Extra"]') is False

    def test_cloze_empty_input(self):
        """Test CLOZE with empty or invalid input."""
        card = Card(
            id=1,
            deck_id=1,
            type=CardType.CLOZE,
            prompt="The capital of France is [BLANK].",
            answer="Paris",
            options=None,
            cloze_data={
                "blanks": [
                    {"answer": "Paris"}
                ]
            }
        )

        assert _check_cloze_answer(card, "") is False
        assert _check_cloze_answer(card, None) is False
        assert _check_cloze_answer(card, "[]") is False
        assert _check_cloze_answer(card, "not json") is False

    def test_cloze_missing_cloze_data(self):
        """Test CLOZE fails gracefully when cloze_data is missing."""
        card = Card(
            id=1,
            deck_id=1,
            type=CardType.CLOZE,
            prompt="The capital of France is [BLANK].",
            answer="Paris",
            options=None,
            cloze_data=None
        )

        assert _check_cloze_answer(card, '["Paris"]') is False


class TestMultipleChoiceCompat:
    """Tests to ensure MULTIPLE_CHOICE still works correctly."""

    def test_multiple_choice_correct_answer(self):
        """Test MULTIPLE_CHOICE with correct answer."""
        card = Card(
            id=1,
            deck_id=1,
            type=CardType.MULTIPLE_CHOICE,
            prompt="What is 2+2?",
            answer="4",
            options=["3", "4", "5"],
            cloze_data=None
        )

        # Multiple choice uses exact match (not case-insensitive)
        assert _check_answer_correctness(card, "4") is True
        assert _check_answer_correctness(card, "3") is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
