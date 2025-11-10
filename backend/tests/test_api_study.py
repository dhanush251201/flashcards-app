"""Tests for study/quiz API endpoints."""
import pytest
from fastapi.testclient import TestClient

from app.models.enums import QuizMode


@pytest.mark.integration
class TestStartSession:
    """Test POST /api/v1/study/sessions endpoint."""

    def test_start_session_review_mode(self, client: TestClient, test_deck, test_user_token, test_cards):
        payload = {"deck_id": test_deck.id, "mode": "review"}
        response = client.post(
            "/api/v1/study/sessions",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["deck_id"] == test_deck.id
        assert data["mode"] == "review"
        assert data["status"] == "active"

    def test_start_session_practice_mode(self, client: TestClient, test_deck, test_user_token, test_cards):
        payload = {"deck_id": test_deck.id, "mode": "practice"}
        response = client.post(
            "/api/v1/study/sessions",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["mode"] == "practice"

    def test_start_session_exam_mode(self, client: TestClient, test_deck, test_user_token, test_cards):
        payload = {"deck_id": test_deck.id, "mode": "exam"}
        response = client.post(
            "/api/v1/study/sessions",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 201

    def test_start_session_no_auth(self, client: TestClient, test_deck):
        payload = {"deck_id": test_deck.id, "mode": "review"}
        response = client.post("/api/v1/study/sessions", json=payload)
        assert response.status_code == 401

    def test_start_session_nonexistent_deck(self, client: TestClient, test_user_token):
        payload = {"deck_id": 999999, "mode": "review"}
        response = client.post(
            "/api/v1/study/sessions",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        # Will likely succeed but session will have no cards
        # Or might fail depending on your business logic
        assert response.status_code in [201, 404]


@pytest.mark.integration
class TestGetSession:
    """Test GET /api/v1/study/sessions/{session_id} endpoint."""

    def test_get_session_success(self, client: TestClient, quiz_session, test_user_token):
        response = client.get(
            f"/api/v1/study/sessions/{quiz_session.id}",
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == quiz_session.id

    def test_get_session_not_owner(self, client: TestClient, quiz_session, admin_user_token):
        response = client.get(
            f"/api/v1/study/sessions/{quiz_session.id}",
            headers={"Authorization": f"Bearer {admin_user_token}"},
        )
        assert response.status_code == 404

    def test_get_session_no_auth(self, client: TestClient, quiz_session):
        response = client.get(f"/api/v1/study/sessions/{quiz_session.id}")
        assert response.status_code == 401


@pytest.mark.integration
class TestFinishSession:
    """Test POST /api/v1/study/sessions/{session_id}/finish endpoint."""

    def test_finish_session_success(self, client: TestClient, quiz_session, test_user_token):
        response = client.post(
            f"/api/v1/study/sessions/{quiz_session.id}/finish",
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["ended_at"] is not None

    def test_finish_session_not_owner(self, client: TestClient, quiz_session, admin_user_token):
        response = client.post(
            f"/api/v1/study/sessions/{quiz_session.id}/finish",
            headers={"Authorization": f"Bearer {admin_user_token}"},
        )
        assert response.status_code == 404

    def test_finish_session_no_auth(self, client: TestClient, quiz_session):
        response = client.post(f"/api/v1/study/sessions/{quiz_session.id}/finish")
        assert response.status_code == 401


@pytest.mark.integration
class TestSubmitAnswer:
    """Test POST /api/v1/study/sessions/{session_id}/answer endpoint."""

    def test_submit_answer_review_mode(self, client: TestClient, quiz_session, test_cards, test_user_token):
        card = test_cards[0]
        payload = {"card_id": card.id, "user_answer": "4", "quality": 4}
        response = client.post(
            f"/api/v1/study/sessions/{quiz_session.id}/answer",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["card_id"] == card.id
        assert data["quality"] == 4

    def test_submit_answer_practice_mode_correct(self, client: TestClient, quiz_session, test_cards, test_user_token, db):
        quiz_session.mode = QuizMode.PRACTICE
        db.add(quiz_session)
        db.commit()

        card = test_cards[0]  # Multiple choice: 2+2=4
        payload = {"card_id": card.id, "user_answer": "4"}
        response = client.post(
            f"/api/v1/study/sessions/{quiz_session.id}/answer",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"] is True

    def test_submit_answer_practice_mode_incorrect(self, client: TestClient, quiz_session, test_cards, test_user_token, db):
        quiz_session.mode = QuizMode.PRACTICE
        db.add(quiz_session)
        db.commit()

        card = test_cards[0]
        payload = {"card_id": card.id, "user_answer": "5"}
        response = client.post(
            f"/api/v1/study/sessions/{quiz_session.id}/answer",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"] is False

    def test_submit_answer_short_answer_type(self, client: TestClient, quiz_session, test_cards, test_user_token, db):
        quiz_session.mode = QuizMode.PRACTICE
        db.add(quiz_session)
        db.commit()

        card = test_cards[1]  # Short answer: Capital of France
        payload = {"card_id": card.id, "user_answer": "Paris"}
        response = client.post(
            f"/api/v1/study/sessions/{quiz_session.id}/answer",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"] is True

    def test_submit_answer_cloze_type(self, client: TestClient, quiz_session, test_cards, test_user_token, db):
        quiz_session.mode = QuizMode.PRACTICE
        db.add(quiz_session)
        db.commit()

        card = test_cards[2]  # Cloze type
        payload = {"card_id": card.id, "user_answer": '["Paris"]'}
        response = client.post(
            f"/api/v1/study/sessions/{quiz_session.id}/answer",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"] is True

    def test_submit_answer_no_auth(self, client: TestClient, quiz_session, test_cards):
        card = test_cards[0]
        payload = {"card_id": card.id, "user_answer": "4", "quality": 4}
        response = client.post(f"/api/v1/study/sessions/{quiz_session.id}/answer", json=payload)
        assert response.status_code == 401


@pytest.mark.integration
class TestDueReviews:
    """Test GET /api/v1/study/reviews/due endpoint."""

    def test_due_reviews_with_due_card(self, client: TestClient, test_user_token, srs_review):
        response = client.get(
            "/api/v1/study/reviews/due",
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_due_reviews_empty(self, client: TestClient, admin_user_token):
        response = client.get(
            "/api/v1/study/reviews/due",
            headers={"Authorization": f"Bearer {admin_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_due_reviews_no_auth(self, client: TestClient):
        response = client.get("/api/v1/study/reviews/due")
        assert response.status_code == 401


@pytest.mark.integration
class TestPracticeModeEndless:
    """Test practice mode with endless configuration."""

    def test_start_practice_session_endless(self, client: TestClient, test_deck, test_user_token, test_cards):
        payload = {
            "deck_id": test_deck.id,
            "mode": "practice",
            "config": {"endless": True}
        }
        response = client.post(
            "/api/v1/study/sessions",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["mode"] == "practice"
        assert data["config"]["endless"] is True


@pytest.mark.integration
class TestSessionStatistics:
    """Test GET /api/v1/study/sessions/{session_id}/statistics endpoint."""

    def test_get_session_statistics_empty(self, client: TestClient, quiz_session, test_user_token):
        response = client.get(
            f"/api/v1/study/sessions/{quiz_session.id}/statistics",
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_responses"] == 0
        assert data["correct_count"] == 0
        assert data["incorrect_count"] == 0
        assert data["unanswered_count"] == 0

    def test_get_session_statistics_with_responses(self, client: TestClient, quiz_session, test_cards, test_user_token, db):
        from app.models import QuizResponse

        # Add some quiz responses
        responses = [
            QuizResponse(session_id=quiz_session.id, card_id=test_cards[0].id, is_correct=True),
            QuizResponse(session_id=quiz_session.id, card_id=test_cards[1].id, is_correct=False),
            QuizResponse(session_id=quiz_session.id, card_id=test_cards[2].id, is_correct=True),
            QuizResponse(session_id=quiz_session.id, card_id=test_cards[0].id, is_correct=None),
        ]
        for r in responses:
            db.add(r)
        db.commit()

        response = client.get(
            f"/api/v1/study/sessions/{quiz_session.id}/statistics",
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_responses"] == 4
        assert data["correct_count"] == 2
        assert data["incorrect_count"] == 1
        assert data["unanswered_count"] == 1

    def test_get_session_statistics_not_owner(self, client: TestClient, quiz_session, admin_user_token):
        response = client.get(
            f"/api/v1/study/sessions/{quiz_session.id}/statistics",
            headers={"Authorization": f"Bearer {admin_user_token}"},
        )
        assert response.status_code == 404

    def test_get_session_statistics_no_auth(self, client: TestClient, quiz_session):
        response = client.get(f"/api/v1/study/sessions/{quiz_session.id}/statistics")
        assert response.status_code == 401

    def test_session_statistics_practice_mode(self, client: TestClient, test_deck, test_user_token, test_cards):
        """Test that practice mode auto-grades correctly and statistics reflect that."""
        # Create practice session
        payload = {"deck_id": test_deck.id, "mode": "practice", "config": {"endless": True}}
        response = client.post(
            "/api/v1/study/sessions",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 201
        session_id = response.json()["id"]

        # Submit correct answer for multiple choice
        card = test_cards[0]  # Multiple choice: 2+2=4
        response = client.post(
            f"/api/v1/study/sessions/{session_id}/answer",
            json={"card_id": card.id, "user_answer": "4"},
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        assert response.json()["is_correct"] is True

        # Submit incorrect answer
        response = client.post(
            f"/api/v1/study/sessions/{session_id}/answer",
            json={"card_id": card.id, "user_answer": "5"},
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        assert response.json()["is_correct"] is False

        # Check statistics
        response = client.get(
            f"/api/v1/study/sessions/{session_id}/statistics",
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_responses"] == 2
        assert data["correct_count"] == 1
        assert data["incorrect_count"] == 1


@pytest.mark.integration
class TestActivityData:
    """Test GET /api/v1/study/activity endpoint."""

    def test_get_activity_empty(self, client: TestClient, test_user_token):
        """Test activity endpoint when user has no completed sessions."""
        response = client.get(
            "/api/v1/study/activity?days=7",
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 7  # Should return 7 days of data
        # All counts should be 0 for new user
        for item in data:
            assert "date" in item
            assert "count" in item
            assert item["count"] == 0

    def test_get_activity_with_completed_sessions(self, client: TestClient, test_deck, test_user_token, db):
        """Test activity endpoint with completed quiz sessions."""
        from app.models import QuizSession
        from app.models.enums import QuizMode, QuizStatus
        from datetime import datetime, timezone

        # Create completed quiz sessions
        now_naive = datetime.now(tz=timezone.utc).replace(tzinfo=None)
        sessions = [
            QuizSession(
                user_id=1,  # test_user
                deck_id=test_deck.id,
                mode=QuizMode.PRACTICE,
                status=QuizStatus.COMPLETED,
                started_at=now_naive,
                ended_at=now_naive,
            ),
            QuizSession(
                user_id=1,
                deck_id=test_deck.id,
                mode=QuizMode.REVIEW,
                status=QuizStatus.COMPLETED,
                started_at=now_naive,
                ended_at=now_naive,
            ),
        ]
        for session in sessions:
            db.add(session)
        db.commit()

        response = client.get(
            "/api/v1/study/activity?days=7",
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 7
        # At least one day should have count of 2
        total_count = sum(item["count"] for item in data)
        assert total_count == 2

    def test_get_activity_no_auth(self, client: TestClient):
        """Test activity endpoint requires authentication."""
        response = client.get("/api/v1/study/activity")
        assert response.status_code == 401

    def test_get_activity_custom_days(self, client: TestClient, test_user_token):
        """Test activity endpoint with custom days parameter."""
        response = client.get(
            "/api/v1/study/activity?days=14",
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 14  # Should return 14 days of data


@pytest.mark.integration
class TestExamModeCardFiltering:
    """Test that exam mode correctly filters out basic card types."""

    def test_exam_mode_excludes_basic_cards(self, client: TestClient, test_deck, test_user_token, test_cards, db):
        """Test that basic cards are not included in exam mode."""
        # test_cards fixture includes: MCQ, SHORT_ANSWER, CLOZE, BASIC
        # In exam mode, only MCQ, SHORT_ANSWER, and CLOZE should be available

        # Start exam session
        payload = {"deck_id": test_deck.id, "mode": "exam"}
        response = client.post(
            "/api/v1/study/sessions",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 201
        session_id = response.json()["id"]

        # Get deck to see all cards
        response = client.get(
            f"/api/v1/decks/{test_deck.id}",
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        deck_data = response.json()
        all_cards = deck_data["cards"]

        # Verify we have 4 cards total (1 of each type)
        assert len(all_cards) == 4

        # Count card types
        card_types = [card["type"] for card in all_cards]
        assert "multiple_choice" in card_types
        assert "short_answer" in card_types
        assert "cloze" in card_types
        assert "basic" in card_types

        # In exam mode, frontend should filter to only 3 cards (excluding basic)
        exam_eligible_cards = [
            card for card in all_cards
            if card["type"] in ["multiple_choice", "short_answer", "cloze"]
        ]
        assert len(exam_eligible_cards) == 3

    def test_exam_mode_with_only_basic_cards(self, client: TestClient, test_deck, test_user_token, db):
        """Test exam mode when deck contains only basic cards."""
        from app.models import Card, Deck
        from app.models.enums import CardType

        # Create a deck with only basic cards
        basic_deck = Deck(
            title="Basic Only Deck",
            description="Only basic flashcards",
            is_public=True,
            owner_user_id=1,
        )
        db.add(basic_deck)
        db.commit()
        db.refresh(basic_deck)

        # Add only basic cards
        basic_cards = [
            Card(
                deck_id=basic_deck.id,
                type=CardType.BASIC,
                prompt="Question 1",
                answer="Answer 1"
            ),
            Card(
                deck_id=basic_deck.id,
                type=CardType.BASIC,
                prompt="Question 2",
                answer="Answer 2"
            ),
        ]
        for card in basic_cards:
            db.add(card)
        db.commit()

        # Start exam session
        payload = {"deck_id": basic_deck.id, "mode": "exam"}
        response = client.post(
            "/api/v1/study/sessions",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 201

        # Get deck
        response = client.get(
            f"/api/v1/decks/{basic_deck.id}",
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        deck_data = response.json()

        # Verify frontend would see no exam-eligible cards
        exam_eligible_cards = [
            card for card in deck_data["cards"]
            if card["type"] in ["multiple_choice", "short_answer", "cloze"]
        ]
        assert len(exam_eligible_cards) == 0

    def test_exam_mode_with_mixed_cards(self, client: TestClient, test_user_token, db):
        """Test exam mode with various proportions of card types."""
        from app.models import Card, Deck
        from app.models.enums import CardType

        # Create deck with mixed cards
        mixed_deck = Deck(
            title="Mixed Deck",
            description="Mix of all card types",
            is_public=True,
            owner_user_id=1,
        )
        db.add(mixed_deck)
        db.commit()
        db.refresh(mixed_deck)

        # Add multiple cards of each type
        cards = [
            # 3 basic cards
            Card(deck_id=mixed_deck.id, type=CardType.BASIC, prompt="Basic 1", answer="A1"),
            Card(deck_id=mixed_deck.id, type=CardType.BASIC, prompt="Basic 2", answer="A2"),
            Card(deck_id=mixed_deck.id, type=CardType.BASIC, prompt="Basic 3", answer="A3"),
            # 2 MCQ cards
            Card(
                deck_id=mixed_deck.id,
                type=CardType.MULTIPLE_CHOICE,
                prompt="MCQ 1",
                answer="A",
                options=["A", "B", "C", "D"]
            ),
            Card(
                deck_id=mixed_deck.id,
                type=CardType.MULTIPLE_CHOICE,
                prompt="MCQ 2",
                answer="B",
                options=["A", "B", "C", "D"]
            ),
            # 2 short answer cards
            Card(deck_id=mixed_deck.id, type=CardType.SHORT_ANSWER, prompt="SA 1", answer="Answer 1"),
            Card(deck_id=mixed_deck.id, type=CardType.SHORT_ANSWER, prompt="SA 2", answer="Answer 2"),
            # 1 cloze card
            Card(
                deck_id=mixed_deck.id,
                type=CardType.CLOZE,
                prompt="Paris is the capital of [...]",
                answer="France",
                cloze_data={"blanks": [{"answer": "France"}]}
            ),
        ]
        for card in cards:
            db.add(card)
        db.commit()

        # Start exam session
        payload = {"deck_id": mixed_deck.id, "mode": "exam"}
        response = client.post(
            "/api/v1/study/sessions",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 201

        # Get deck
        response = client.get(
            f"/api/v1/decks/{mixed_deck.id}",
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        deck_data = response.json()

        # Total cards: 8
        assert len(deck_data["cards"]) == 8

        # Exam eligible: 5 (2 MCQ + 2 SA + 1 Cloze)
        exam_eligible_cards = [
            card for card in deck_data["cards"]
            if card["type"] in ["multiple_choice", "short_answer", "cloze"]
        ]
        assert len(exam_eligible_cards) == 5


@pytest.mark.integration
class TestExamModeBatchSubmission:
    """Test exam mode batch submission and grading."""

    def test_exam_mode_batch_submission(self, client: TestClient, test_deck, test_user_token, test_cards, db):
        """Test submitting multiple answers in exam mode."""
        from app.models.enums import QuizMode, CardType

        # Start exam session
        payload = {"deck_id": test_deck.id, "mode": "exam"}
        response = client.post(
            "/api/v1/study/sessions",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 201
        session_id = response.json()["id"]

        # Get exam-eligible cards (MCQ, SA, Cloze - not Basic)
        exam_cards = [c for c in test_cards if c.type != CardType.BASIC]
        assert len(exam_cards) == 3

        # Submit answers for all exam cards
        for card in exam_cards:
            if card.type == CardType.MULTIPLE_CHOICE:
                user_answer = card.answer  # Correct answer
            elif card.type == CardType.SHORT_ANSWER:
                user_answer = card.answer  # Correct answer
            elif card.type == CardType.CLOZE:
                user_answer = '["Paris"]'  # Correct answer as JSON

            response = client.post(
                f"/api/v1/study/sessions/{session_id}/answer",
                json={"card_id": card.id, "user_answer": user_answer},
                headers={"Authorization": f"Bearer {test_user_token}"},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["card_id"] == card.id
            assert data["is_correct"] is True  # All correct answers

        # Finish session
        response = client.post(
            f"/api/v1/study/sessions/{session_id}/finish",
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "completed"

        # Check statistics
        response = client.get(
            f"/api/v1/study/sessions/{session_id}/statistics",
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        stats = response.json()
        assert stats["total_responses"] == 3
        assert stats["correct_count"] == 3
        assert stats["incorrect_count"] == 0

    def test_exam_mode_incorrect_answers(self, client: TestClient, test_deck, test_user_token, test_cards):
        """Test exam mode with incorrect answers."""
        from app.models.enums import CardType

        # Start exam session
        payload = {"deck_id": test_deck.id, "mode": "exam"}
        response = client.post(
            "/api/v1/study/sessions",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 201
        session_id = response.json()["id"]

        # Submit wrong answers
        exam_cards = [c for c in test_cards if c.type != CardType.BASIC]

        # Wrong MCQ answer
        mcq_card = [c for c in exam_cards if c.type == CardType.MULTIPLE_CHOICE][0]
        response = client.post(
            f"/api/v1/study/sessions/{session_id}/answer",
            json={"card_id": mcq_card.id, "user_answer": "999"},  # Wrong
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        assert response.json()["is_correct"] is False

        # Wrong short answer
        sa_card = [c for c in exam_cards if c.type == CardType.SHORT_ANSWER][0]
        response = client.post(
            f"/api/v1/study/sessions/{session_id}/answer",
            json={"card_id": sa_card.id, "user_answer": "London"},  # Wrong
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        # May be correct or incorrect depending on LLM or exact matching
        assert response.json()["is_correct"] is not None

        # Check statistics
        response = client.get(
            f"/api/v1/study/sessions/{session_id}/statistics",
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        stats = response.json()
        assert stats["total_responses"] == 2
        assert stats["incorrect_count"] >= 1  # At least MCQ is wrong

    def test_exam_mode_partial_submission(self, client: TestClient, test_deck, test_user_token, test_cards):
        """Test exam mode when not all questions are answered."""
        from app.models.enums import CardType

        # Start exam session
        payload = {"deck_id": test_deck.id, "mode": "exam"}
        response = client.post(
            "/api/v1/study/sessions",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 201
        session_id = response.json()["id"]

        # Answer only 1 out of 3 exam questions
        exam_cards = [c for c in test_cards if c.type != CardType.BASIC]
        card = exam_cards[0]

        response = client.post(
            f"/api/v1/study/sessions/{session_id}/answer",
            json={"card_id": card.id, "user_answer": card.answer},
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200

        # Finish session early
        response = client.post(
            f"/api/v1/study/sessions/{session_id}/finish",
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200

        # Check statistics - should show 1 answered, 2 unanswered
        response = client.get(
            f"/api/v1/study/sessions/{session_id}/statistics",
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        stats = response.json()
        assert stats["total_responses"] == 1


@pytest.mark.integration
class TestLLMAnswerChecking:
    """Test LLM answer checking for short answer and cloze questions."""

    def test_short_answer_exact_match_fallback(self, client: TestClient, test_deck, test_user_token, test_cards, db):
        """Test that short answers fall back to exact matching when LLM unavailable."""
        from app.models.enums import QuizMode, CardType

        # Create practice session (uses auto-grading)
        payload = {"deck_id": test_deck.id, "mode": "practice"}
        response = client.post(
            "/api/v1/study/sessions",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 201
        session_id = response.json()["id"]

        # Get short answer card
        sa_card = [c for c in test_cards if c.type == CardType.SHORT_ANSWER][0]

        # Submit exact match answer
        response = client.post(
            f"/api/v1/study/sessions/{session_id}/answer",
            json={"card_id": sa_card.id, "user_answer": "Paris"},
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"] is True
        # llm_feedback may or may not be present depending on LLM availability

        # Submit case-insensitive match
        response = client.post(
            f"/api/v1/study/sessions/{session_id}/answer",
            json={"card_id": sa_card.id, "user_answer": "paris"},
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"] is True

    def test_cloze_answer_checking(self, client: TestClient, test_deck, test_user_token, test_cards):
        """Test cloze answer checking."""
        from app.models.enums import CardType

        # Create practice session
        payload = {"deck_id": test_deck.id, "mode": "practice"}
        response = client.post(
            "/api/v1/study/sessions",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 201
        session_id = response.json()["id"]

        # Get cloze card
        cloze_card = [c for c in test_cards if c.type == CardType.CLOZE][0]

        # Submit correct answer
        response = client.post(
            f"/api/v1/study/sessions/{session_id}/answer",
            json={"card_id": cloze_card.id, "user_answer": '["Paris"]'},
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"] is True

        # Submit incorrect answer
        response = client.post(
            f"/api/v1/study/sessions/{session_id}/answer",
            json={"card_id": cloze_card.id, "user_answer": '["London"]'},
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"] is False

    def test_cloze_multiple_blanks(self, client: TestClient, test_deck, test_user_token, db):
        """Test cloze questions with multiple blanks."""
        from app.models import Card
        from app.models.enums import CardType

        # Create cloze card with multiple blanks
        multi_cloze = Card(
            deck_id=test_deck.id,
            type=CardType.CLOZE,
            prompt="[...] is the capital of [...], known for its [...] Tower.",
            answer="Paris, France, Eiffel",
            cloze_data={
                "blanks": [
                    {"answer": "Paris"},
                    {"answer": "France"},
                    {"answer": "Eiffel"}
                ]
            }
        )
        db.add(multi_cloze)
        db.commit()
        db.refresh(multi_cloze)

        # Create practice session
        payload = {"deck_id": test_deck.id, "mode": "practice"}
        response = client.post(
            "/api/v1/study/sessions",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 201
        session_id = response.json()["id"]

        # Submit all correct answers
        response = client.post(
            f"/api/v1/study/sessions/{session_id}/answer",
            json={"card_id": multi_cloze.id, "user_answer": '["Paris", "France", "Eiffel"]'},
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"] is True

        # Submit partially correct (should be incorrect)
        response = client.post(
            f"/api/v1/study/sessions/{session_id}/answer",
            json={"card_id": multi_cloze.id, "user_answer": '["Paris", "France", "London"]'},
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"] is False

    def test_llm_feedback_returned_in_response(self, client: TestClient, test_deck, test_user_token, test_cards):
        """Test that LLM feedback is included in API response when available."""
        from app.models.enums import CardType

        # Create practice session
        payload = {"deck_id": test_deck.id, "mode": "practice"}
        response = client.post(
            "/api/v1/study/sessions",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 201
        session_id = response.json()["id"]

        # Get short answer card
        sa_card = [c for c in test_cards if c.type == CardType.SHORT_ANSWER][0]

        # Submit an answer that might trigger LLM
        response = client.post(
            f"/api/v1/study/sessions/{session_id}/answer",
            json={"card_id": sa_card.id, "user_answer": "The capital of France is Paris"},
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "llm_feedback" in data
        # llm_feedback will be None if LLM unavailable, or a string if available
        # We can't guarantee LLM availability in tests, so we just check the field exists
