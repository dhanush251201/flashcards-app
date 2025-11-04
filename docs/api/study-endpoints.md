# Study Session Endpoints

Complete API reference for study operations.

## Create Study Session

**Endpoint:** `POST /api/v1/study/sessions`
**Auth Required:** Yes

**Request Body:**
```json
{
  "deck_id": 1,
  "mode": "review",
  "config": {
    "card_limit": 20,
    "shuffle": true
  }
}
```

**Success Response:** `201 Created`
```json
{
  "id": 1,
  "deck_id": 1,
  "mode": "review",
  "status": "active",
  "started_at": "2024-01-01T12:00:00Z"
}
```

## Get Session State

**Endpoint:** `GET /api/v1/study/sessions/{session_id}`
**Auth Required:** Yes

**Success Response:** `200 OK`

## Submit Answer

**Endpoint:** `POST /api/v1/study/sessions/{session_id}/answer`
**Auth Required:** Yes

**Request Body:**
```json
{
  "card_id": 1,
  "user_answer": "Paris",
  "quality": 4
}
```

**Success Response:** `200 OK`

## Finish Session

**Endpoint:** `POST /api/v1/study/sessions/{session_id}/finish`
**Auth Required:** Yes

**Success Response:** `200 OK`

## Get Session Statistics

**Endpoint:** `GET /api/v1/study/sessions/{session_id}/statistics`
**Auth Required:** Yes

**Success Response:** `200 OK`
```json
{
  "total_cards": 20,
  "correct": 18,
  "incorrect": 2,
  "accuracy": 0.9,
  "avg_quality": 4.2
}
```
