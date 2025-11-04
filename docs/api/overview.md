# API Reference Overview

Complete REST API documentation for Flash-Decks backend.

## Base URL

```
Development: http://localhost:8000/api/v1
Production: https://api.flashdecks.com/api/v1
```

## Authentication

All endpoints except `/auth/signup` and `/auth/login` require authentication.

**Header:**
```
Authorization: Bearer <access_token>
```

**Token Expiration:**
- Access Token: 30 minutes
- Refresh Token: 7 days

**Token Refresh:**
When receiving 401, call `/auth/refresh` with refresh token to obtain new tokens.

## Response Format

### Success Response

```json
{
  "id": 1,
  "title": "Spanish Vocabulary",
  "created_at": "2024-01-01T12:00:00Z"
}
```

### Error Response

```json
{
  "detail": "Deck not found"
}
```

**HTTP Status Codes:**
- `200` OK - Success
- `201` Created - Resource created
- `204` No Content - Success, no body
- `400` Bad Request - Invalid input
- `401` Unauthorized - Missing/invalid token
- `403` Forbidden - Insufficient permissions
- `404` Not Found - Resource doesn't exist
- `422` Unprocessable Entity - Validation error
- `500` Internal Server Error - Server error

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `offset` (integer, default: 0)
- `limit` (integer, default: 20, max: 100)

**Example:**
```
GET /decks?offset=20&limit=20
```

## Filtering & Search

**Decks:**
- `search` - Search title/description
- `tags` - Filter by tags (comma-separated)
- `is_public` - Filter by visibility

**Example:**
```
GET /decks?search=spanish&tags=beginner&is_public=true
```

## Endpoint Categories

### Authentication
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login and get tokens
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout (client-side)

### Decks
- `GET /decks` - List decks
- `GET /decks/{id}` - Get deck details
- `POST /decks` - Create deck
- `PUT /decks/{id}` - Update deck
- `DELETE /decks/{id}` - Delete deck
- `POST /decks/{id}/cards` - Add card to deck
- `PUT /cards/{id}` - Update card
- `DELETE /cards/{id}` - Delete card

### Study Sessions
- `POST /study/sessions` - Create study session
- `GET /study/sessions/{id}` - Get session state
- `POST /study/sessions/{id}/answer` - Submit answer
- `POST /study/sessions/{id}/finish` - Complete session
- `GET /study/sessions/{id}/statistics` - Session stats
- `GET /study/reviews/due` - Get due review cards

### Users
- `GET /users/me` - Get current user profile
- `PUT /users/me/password` - Change password
- `GET /users/me/streak` - Get streak statistics
- `PUT /decks/{id}/pin` - Pin/unpin deck

## Interactive API Documentation

Visit `/docs` for Swagger UI with interactive testing:
```
http://localhost:8000/docs
```

Alternative ReDoc interface:
```
http://localhost:8000/redoc
```

## Rate Limiting

**Current:** No rate limiting (development)
**Planned:** 100 requests/minute per user

## CORS

Allowed origins configured via `CORS_ORIGINS` environment variable.

## Further Reading

- [Authentication Endpoints](./authentication-endpoints.md)
- [Deck Endpoints](./deck-endpoints.md)
- [Study Endpoints](./study-endpoints.md)
- [User Endpoints](./user-endpoints.md)
