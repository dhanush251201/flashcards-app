# Authentication System

Flash-Decks implements a secure JWT-based authentication system with refresh token rotation for stateless, scalable user sessions.

## Overview

**Authentication Method:** JWT (JSON Web Tokens)
**Token Strategy:** Access + Refresh Token Pattern
**Password Security:** Argon2 Hashing
**Session Management:** Stateless

## Features

- Email/password registration
- Secure login with JWT tokens
- Automatic token refresh
- Password change functionality
- Role-based access control (USER, ADMIN)

## User Registration

### Process

1. User submits registration form
2. Backend validates email uniqueness
3. Password hashed with Argon2
4. User record created
5. Auto-login with JWT tokens

### API Endpoint

```
POST /api/v1/auth/signup
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "full_name": "John Doe"
}
```

**Response:**
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

### Password Requirements

- Minimum 8 characters
- Recommended: Mix of uppercase, lowercase, numbers, symbols

### Email Validation

- Must be valid email format
- Must be unique (not already registered)
- Max 320 characters (RFC 5321)

## User Login

### Process

1. User submits credentials
2. Backend verifies email exists
3. Password verified against Argon2 hash
4. JWT tokens generated and returned
5. Frontend stores tokens securely

### API Endpoint

```
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=user@example.com&password=SecurePass123!
```

**Note:** Uses OAuth2 password flow format (username field contains email)

**Response:** Same as signup

### Login Security

- Failed attempts logged (future: rate limiting)
- Passwords never stored in plaintext
- Argon2 hashing (memory-hard, GPU-resistant)
- Token expiration enforced

## Token System

### Access Token

**Purpose:** Authenticate API requests
**Lifetime:** 30 minutes
**Usage:** Included in Authorization header

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Payload:**
```json
{
  "sub": "1",
  "exp": 1234567890
}
```

### Refresh Token

**Purpose:** Obtain new access tokens
**Lifetime:** 7 days
**Usage:** Call refresh endpoint when access token expires

### Token Storage

**Frontend (Zustand + localStorage):**
```typescript
{
  accessToken: "eyJ...",
  refreshToken: "eyJ...",
  user: { id, email, full_name, role }
}
```

**Security Considerations:**
- localStorage vulnerable to XSS
- Consider httpOnly cookies for production
- Current implementation: acceptable for SPA with CSP

## Token Refresh Flow

### Automatic Refresh

Frontend Axios interceptor handles token refresh automatically:

```
1. API request fails with 401 Unauthorized
2. Interceptor catches error
3. Calls /api/v1/auth/refresh with refresh token
4. Receives new access + refresh tokens
5. Stores new tokens
6. Retries original request
7. User experiences seamless auth
```

### Refresh Endpoint

```
POST /api/v1/auth/refresh
```

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "access_token": "eyJ...(new)",
  "refresh_token": "eyJ...(new)",
  "token_type": "bearer"
}
```

### Token Rotation

Each refresh issues NEW tokens (both access and refresh). Old refresh token becomes invalid. This limits the damage from stolen refresh tokens.

## Logout

### Client-Side Logout

```
POST /api/v1/auth/logout
```

Frontend clears tokens from storage. Since JWTs are stateless, backend doesn't track sessions. Tokens remain valid until expiration.

**Frontend:**
```typescript
authStore.clear()
navigate('/login')
```

### Security Note

For immediate revocation, implement:
- Token blacklist (Redis)
- Shorter token lifetimes
- Refresh token families

## Authorization

### Role-Based Access Control

**Roles:**
- `USER`: Standard user (default)
- `ADMIN`: Administrator with elevated permissions

### Protected Routes

**Backend:**
```python
@router.delete("/decks/{deck_id}")
def delete_any_deck(
    deck_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)  # Admin only
):
    # ...
```

**Frontend:**
```typescript
{user.role === 'ADMIN' && (
  <Button onClick={deleteAllDecks}>Delete All</Button>
)}
```

### Resource-Level Authorization

Users can only modify their own resources:

```python
def verify_deck_ownership(db: Session, deck_id: int, user: User):
    deck = db.get(Deck, deck_id)
    if deck.owner_user_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(403, "Not authorized")
    return deck
```

## Security Features

### Password Hashing

**Algorithm:** Argon2
**Why Argon2?**
- Winner of Password Hashing Competition (2015)
- Memory-hard (resistant to GPU/ASIC attacks)
- Configurable time and memory cost
- Automatic salting

**Implementation:**
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# Hashing
hashed = pwd_context.hash("password123")
# Result: $argon2id$v=19$m=65536,t=3,p=4$...(unique per password)

# Verification
is_valid = pwd_context.verify("password123", hashed)
```

### JWT Security

**Signing Algorithm:** HS256 (HMAC with SHA-256)
**Secret Keys:**
- Separate secrets for access and refresh tokens
- Minimum 32 characters
- Stored in environment variables
- Rotated periodically in production

**Token Structure:**
```
Header.Payload.Signature

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9  # Header
.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ  # Payload
.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c  # Signature
```

### Protection Against Common Attacks

**SQL Injection:**
- Parameterized queries via SQLModel/SQLAlchemy
- No raw SQL with user input

**XSS (Cross-Site Scripting):**
- React automatically escapes output
- Content Security Policy headers (future)

**CSRF (Cross-Site Request Forgery):**
- JWT in Authorization header (not cookies)
- SameSite cookie attribute if using cookies

**Brute Force:**
- Account lockout after failed attempts (future)
- Rate limiting (future)
- Strong password requirements

## Password Management

### Change Password

```
PUT /api/v1/users/me/password
```

**Request:**
```json
{
  "current_password": "OldPass123!",
  "new_password": "NewSecurePass456!"
}
```

**Requires:**
- Valid access token
- Correct current password
- New password meets requirements

**Response:**
```json
{
  "message": "Password updated successfully"
}
```

### Password Reset (Future)

Not yet implemented. Planned flow:
1. Request reset link via email
2. Receive time-limited token
3. Submit new password with token
4. Password updated, all sessions invalidated

## Frontend Implementation

### Auth Store (Zustand)

```typescript
// store/authStore.ts
interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  isHydrated: boolean
  setTokens: (access: string, refresh: string) => void
  setUser: (user: AuthUser | null) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isHydrated: false,
      setTokens: (access, refresh) => set({ accessToken: access, refreshToken: refresh }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    {
      name: 'flashdecks-auth',
      onRehydrateStorage: () => (state) => {
        state.isHydrated = true
      },
    }
  )
)
```

### API Client Interceptors

```typescript
// lib/apiClient.ts
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true
      try {
        const { refreshToken } = useAuthStore.getState()
        const { data } = await axios.post('/auth/refresh', { refresh_token: refreshToken })
        useAuthStore.getState().setTokens(data.access_token, data.refresh_token)
        error.config.headers.Authorization = `Bearer ${data.access_token}`
        return apiClient(error.config)
      } catch (refreshError) {
        useAuthStore.getState().clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
```

### Protected Routes

```typescript
// routes/ProtectedRoute.tsx
export const ProtectedRoute = () => {
  const { accessToken, isHydrated } = useAuthStore()

  if (!isHydrated) return <LoadingSpinner />
  if (!accessToken) return <Navigate to="/login" replace />

  return <Outlet />
}
```

## Best Practices

### For Users

- Use strong, unique passwords
- Don't share credentials
- Log out on shared devices
- Update password if suspicious activity

### For Developers

- Never commit JWT secrets to version control
- Use environment variables for secrets
- Rotate secrets periodically
- Implement rate limiting for auth endpoints
- Log authentication events
- Consider 2FA for sensitive accounts
- Use HTTPS in production (always!)

## Troubleshooting

### "Invalid credentials" on login
- Check email is correct
- Check password is correct
- Ensure account was created successfully

### Token expired errors
- Access token expires after 30 minutes
- Should auto-refresh via interceptor
- If persisting, clear localStorage and login again

### Can't access protected routes
- Ensure logged in
- Check accessToken in localStorage
- Verify token not expired
- Try logout and login again

## Future Enhancements

- Two-factor authentication (2FA)
- Social login (Google, GitHub)
- Password reset via email
- Email verification
- Account lockout after failed attempts
- Session management dashboard
- Remember me functionality
- Security audit logs

## Further Reading

- [API Reference: Authentication Endpoints](../api/authentication-endpoints.md)
- [Backend Security](../architecture/backend-architecture.md#security-implementation)
- [Configuration Guide](../getting-started/configuration.md)
