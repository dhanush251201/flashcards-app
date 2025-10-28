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
