# User Management Endpoints

Complete API reference for user operations.

## Get Current User

**Endpoint:** `GET /api/v1/users/me`
**Auth Required:** Yes

**Success Response:** `200 OK`
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "USER",
  "current_streak": 7,
  "longest_streak": 15,
  "created_at": "2024-01-01T12:00:00Z"
}
```

## Change Password

**Endpoint:** `PUT /api/v1/users/me/password`
**Auth Required:** Yes

**Request Body:**
```json
{
  "current_password": "OldPass123!",
  "new_password": "NewSecurePass456!"
}
```

**Success Response:** `200 OK`
```json
{
  "message": "Password updated successfully"
}
```

## Get Streak Statistics

**Endpoint:** `GET /api/v1/users/me/streak`
**Auth Required:** Yes

**Success Response:** `200 OK`
```json
{
  "current_streak": 7,
  "longest_streak": 15,
  "last_activity_date": "2024-01-15"
}
```

## Pin/Unpin Deck

**Endpoint:** `PUT /api/v1/decks/{deck_id}/pin`
**Auth Required:** Yes

**Request Body:**
```json
{
  "pinned": true
}
```

**Success Response:** `200 OK`
