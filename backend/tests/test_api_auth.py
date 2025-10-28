"""Tests for authentication API endpoints."""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import User
from app.models.enums import UserRole


@pytest.mark.integration
class TestSignup:
    """Test POST /api/v1/auth/signup endpoint."""

    def test_signup_success(self, client: TestClient):
        payload = {
            "email": "newuser@example.com",
            "password": "securepassword123",
            "full_name": "New User",
        }
        response = client.post("/api/v1/auth/signup", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_signup_duplicate_email(self, client: TestClient, test_user: User):
        payload = {
            "email": test_user.email,
            "password": "password123",
            "full_name": "Duplicate",
        }
        response = client.post("/api/v1/auth/signup", json=payload)
        assert response.status_code == 400

    def test_signup_invalid_email(self, client: TestClient):
        payload = {
            "email": "not-an-email",
            "password": "password123",
        }
        response = client.post("/api/v1/auth/signup", json=payload)
        assert response.status_code == 422

    def test_signup_missing_password(self, client: TestClient):
        payload = {
            "email": "user@example.com",
        }
        response = client.post("/api/v1/auth/signup", json=payload)
        assert response.status_code == 422


@pytest.mark.integration
class TestLogin:
    """Test POST /api/v1/auth/login endpoint."""

    def test_login_success(self, client: TestClient, test_user: User):
        # OAuth2PasswordRequestForm uses 'username' field but we pass email
        payload = {"username": test_user.email, "password": "testpassword123"}
        response = client.post("/api/v1/auth/login", data=payload)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client: TestClient, test_user: User):
        payload = {"username": test_user.email, "password": "wrongpassword"}
        response = client.post("/api/v1/auth/login", data=payload)
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client: TestClient):
        payload = {"username": "nonexistent@example.com", "password": "password123"}
        response = client.post("/api/v1/auth/login", data=payload)
        assert response.status_code == 401

    def test_login_inactive_user_gets_token(self, client: TestClient, db: Session):
        # API allows inactive users to get tokens but blocks them at protected endpoints
        from app.services.auth import hash_password
        user = User(
            email="inactive@example.com",
            hashed_password=hash_password("password123"),
            role=UserRole.USER,
            is_active=False,
        )
        db.add(user)
        db.commit()

        # Inactive users can get tokens
        payload = {"username": "inactive@example.com", "password": "password123"}
        response = client.post("/api/v1/auth/login", data=payload)
        # The API allows login but is_active check happens at protected endpoints
        assert response.status_code == 200


@pytest.mark.integration
class TestGetCurrentUser:
    """Test GET /api/v1/me endpoint."""

    def test_get_current_user_success(self, client: TestClient, test_user: User, test_user_token):
        response = client.get(
            "/api/v1/me",
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert data["full_name"] == test_user.full_name

    def test_get_current_user_no_token(self, client: TestClient):
        response = client.get("/api/v1/me")
        assert response.status_code == 401

    def test_get_current_user_invalid_token(self, client: TestClient):
        response = client.get(
            "/api/v1/me",
            headers={"Authorization": "Bearer invalid_token"},
        )
        assert response.status_code == 401


@pytest.mark.integration
class TestChangePassword:
    """Test PUT /api/v1/me/password endpoint."""

    def test_change_password_success(self, client: TestClient, test_user: User, test_user_token):
        payload = {
            "current_password": "testpassword123",
            "new_password": "newsecurepassword456",
        }
        response = client.put(
            "/api/v1/me/password",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 200

        # Verify can login with new password
        login_response = client.post(
            "/api/v1/auth/login",
            data={"username": test_user.email, "password": "newsecurepassword456"},
        )
        assert login_response.status_code == 200

    def test_change_password_wrong_current(self, client: TestClient, test_user_token):
        payload = {
            "current_password": "wrongpassword",
            "new_password": "newsecurepassword456",
        }
        response = client.put(
            "/api/v1/me/password",
            json=payload,
            headers={"Authorization": f"Bearer {test_user_token}"},
        )
        assert response.status_code == 400

    def test_change_password_no_auth(self, client: TestClient):
        payload = {
            "current_password": "test",
            "new_password": "new",
        }
        response = client.put("/api/v1/me/password", json=payload)
        assert response.status_code == 401


@pytest.mark.integration
class TestRefreshToken:
    """Test POST /api/v1/auth/refresh endpoint."""

    def test_refresh_token_success(self, client: TestClient):
        # First login to get tokens
        signup_response = client.post(
            "/api/v1/auth/signup",
            json={"email": "refresh@example.com", "password": "password123"},
        )
        assert signup_response.status_code == 201
        tokens = signup_response.json()
        refresh_token = tokens["refresh_token"]

        # Use refresh token to get new access token
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_refresh_token_invalid(self, client: TestClient):
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid_token"},
        )
        assert response.status_code == 401
