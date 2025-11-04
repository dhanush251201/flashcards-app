# Authentication Endpoints

Complete API reference for authentication operations.

## POST /auth/signup

Register a new user account.

**Endpoint:** `POST /api/v1/auth/signup`
**Auth Required:** No

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```

**Success Response:** `201 Created`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "USER"
  }
}
```

**Error Responses:**
- `400` - Email already registered
- `422` - Invalid email format

## POST /auth/login

Authenticate user and receive tokens.

**Endpoint:** `POST /api/v1/auth/login`
**Auth Required:** No
**Content-Type:** `application/x-www-form-urlencoded`

**Request Body:**
```
username=user@example.com&password=SecurePass123!
```

**Success Response:** `200 OK`
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

**Error Responses:**
- `401` - Invalid credentials

## POST /auth/refresh

Obtain new access token using refresh token.

**Endpoint:** `POST /api/v1/auth/refresh`
**Auth Required:** No

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response:** `200 OK`
```json
{
  "access_token": "eyJ...(new)",
  "refresh_token": "eyJ...(new)",
  "token_type": "bearer"
}
```

**Error Responses:**
- `401` - Invalid/expired refresh token

## POST /auth/logout

Logout user (client-side token clearing).

**Endpoint:** `POST /api/v1/auth/logout`
**Auth Required:** Yes

**Request:** No body

**Success Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```
