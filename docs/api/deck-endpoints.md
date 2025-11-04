# Deck Management Endpoints

Complete API reference for deck and card operations.

## List Decks

**Endpoint:** `GET /api/v1/decks`
**Auth Required:** Yes

**Query Parameters:**
- `offset` (int, default: 0)
- `limit` (int, default: 20)
- `search` (string) - Search title/description
- `tags` (string) - Comma-separated tags
- `is_public` (boolean) - Filter by visibility

**Success Response:** `200 OK`
```json
[
  {
    "id": 1,
    "title": "Spanish Vocabulary",
    "description": "Essential Spanish words",
    "is_public": true,
    "owner_user_id": 1,
    "card_count": 50,
    "tags": ["spanish", "vocabulary"],
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

## Get Deck

**Endpoint:** `GET /api/v1/decks/{deck_id}`
**Auth Required:** Yes

**Success Response:** `200 OK`
```json
{
  "id": 1,
  "title": "Spanish Vocabulary",
  "cards": [
    {
      "id": 1,
      "type": "basic",
      "prompt": "Hello",
      "answer": "Hola"
    }
  ]
}
```

## Create Deck

**Endpoint:** `POST /api/v1/decks`
**Auth Required:** Yes

**Request Body:**
```json
{
  "title": "My Deck",
  "description": "Deck description",
  "is_public": false,
  "tags": ["tag1", "tag2"]
}
```

**Success Response:** `201 Created`

## Add Card

**Endpoint:** `POST /api/v1/decks/{deck_id}/cards`
**Auth Required:** Yes (Owner or Admin)

**Request Body:**
```json
{
  "type": "multiple_choice",
  "prompt": "What is 2+2?",
  "answer": "4",
  "options": ["3", "4", "5", "6"],
  "explanation": "Basic arithmetic"
}
```

**Success Response:** `201 Created`
