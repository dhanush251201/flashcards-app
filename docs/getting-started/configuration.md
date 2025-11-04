# Configuration Guide

This guide covers all configuration options for Flash-Decks, including environment variables, application settings, and deployment configurations.

## Environment Variables

### Backend Configuration

Located in `/backend/.env` or set in your deployment environment.

#### Core Settings

```env
# Application name displayed in API docs
PROJECT_NAME=Flash-Decks

# Environment: development, staging, production
ENVIRONMENT=development
```

#### Database Configuration

```env
# PostgreSQL connection string
# Format: postgresql://user:password@host:port/database
DATABASE_URL=postgresql://flashdecks:password@localhost:5432/flashdecks_db

# Example for Docker:
DATABASE_URL=postgresql://flashdecks:password@db:5432/flashdecks_db

# Example for cloud services (Heroku, Railway, etc.):
DATABASE_URL=postgresql://user:pass@host.provider.com:5432/dbname
```

**Connection String Components:**
- `user`: Database username (e.g., `flashdecks`)
- `password`: Database password (use strong passwords in production!)
- `host`: Database host (`localhost`, `db` for Docker, or remote host)
- `port`: PostgreSQL port (default: `5432`)
- `database`: Database name (e.g., `flashdecks_db`)

#### Security Settings

```env
# JWT Secret Keys - MUST be changed in production!
# Generate with: openssl rand -hex 32
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET_KEY=your-super-secret-refresh-key-change-this-in-production

# Token expiration times (in minutes)
ACCESS_TOKEN_EXPIRE_MINUTES=30        # 30 minutes
REFRESH_TOKEN_EXPIRE_MINUTES=10080    # 7 days

# Password hashing algorithm (argon2, bcrypt)
PASSWORD_HASH_ALGORITHM=argon2
```

**Security Best Practices:**
- Use different keys for `JWT_SECRET_KEY` and `JWT_REFRESH_SECRET_KEY`
- Never commit actual secrets to version control
- Rotate secrets periodically in production
- Use at least 32 characters of random data

#### CORS Configuration

```env
# Comma-separated list of allowed origins
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://yourdomain.com

# Development (allow all - NOT for production):
CORS_ORIGINS=*
```

**Common Configurations:**
- Local development: `http://localhost:5173,http://localhost:3000`
- Production: `https://app.yourdomain.com,https://www.yourdomain.com`
- Multiple environments: List all frontend URLs

#### Logging Configuration

```env
# Logging level: DEBUG, INFO, WARNING, ERROR, CRITICAL
LOG_LEVEL=INFO

# Log format: json, text
LOG_FORMAT=json

# Log to file (optional)
LOG_FILE=/var/log/flashdecks/app.log
```

**Log Levels:**
- `DEBUG`: Detailed information for diagnosing problems
- `INFO`: Confirmation that things are working (default)
- `WARNING`: Something unexpected happened
- `ERROR`: Serious problem, some function failed
- `CRITICAL`: Critical error, application may not continue

#### Performance Settings

```env
# Database connection pool settings
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10
DB_POOL_TIMEOUT=30

# API rate limiting (requests per minute)
RATE_LIMIT_PER_MINUTE=60
```

### Frontend Configuration

Located in `/frontend/.env` or `/frontend/.env.local`.

#### API Configuration

```env
# Backend API base URL (without /api/v1)
VITE_API_BASE_URL=http://localhost:8000/api/v1

# Production example:
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
```

**Important Notes:**
- All Vite env vars must start with `VITE_`
- Set at build time, not runtime
- For Docker, pass as build arg

#### Feature Flags

```env
# Enable experimental features
VITE_ENABLE_OFFLINE_MODE=false
VITE_ENABLE_VOICE_INPUT=false
VITE_ENABLE_AI_SUGGESTIONS=false

# Analytics
VITE_ENABLE_ANALYTICS=false
VITE_ANALYTICS_ID=your-analytics-id
```

#### App Configuration

```env
# Application name
VITE_APP_NAME=Flash-Decks

# Default theme: light, dark, system
VITE_DEFAULT_THEME=system

# Items per page
VITE_DECKS_PER_PAGE=12
VITE_CARDS_PER_PAGE=20
```

### Docker Configuration

Located in `/docker/.env` or `/docker/docker-compose.yml`.

#### Database Service

```env
# PostgreSQL configuration
POSTGRES_USER=flashdecks
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=flashdecks_db

# PostgreSQL settings
POSTGRES_INITDB_ARGS=--encoding=UTF8 --locale=en_US.UTF-8
```

#### Service Ports

```yaml
# In docker-compose.yml
services:
  db:
    ports:
      - "5432:5432"  # PostgreSQL

  backend:
    ports:
      - "8000:8000"  # FastAPI

  frontend:
    ports:
      - "5173:80"    # Nginx serving React app
```

**Changing Ports:**
```yaml
# If port 5432 is in use, map to different host port:
ports:
  - "5433:5432"  # Access via localhost:5433, internal still 5432

# Update DATABASE_URL accordingly:
DATABASE_URL=postgresql://user:pass@localhost:5433/db
```

#### Volume Mounts

```yaml
volumes:
  # Persistent database storage
  postgres_data:

  # Development hot-reload (optional)
  backend:
    volumes:
      - ../backend:/app

  frontend:
    volumes:
      - ../frontend/src:/app/src
```

## Application Configuration Files

### Backend Configuration Class

Located at `/backend/app/core/config.py`:

```python
class Settings(BaseSettings):
    # Project metadata
    PROJECT_NAME: str = "Flash-Decks"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str
    DB_ECHO: bool = False  # Log SQL queries

    # Security
    JWT_SECRET_KEY: str
    JWT_REFRESH_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 10080

    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    CORS_CREDENTIALS: bool = True
    CORS_METHODS: List[str] = ["*"]
    CORS_HEADERS: List[str] = ["*"]

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True
```

**Customization:**
Edit this file to add new configuration options, then access via:
```python
from app.core.config import get_settings

settings = get_settings()
print(settings.PROJECT_NAME)
```

### Frontend Configuration

#### Vite Configuration

Located at `/frontend/vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    host: true,  // Expose to network
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
        },
      },
    },
  },
})
```

#### Tailwind Configuration

Located at `/frontend/tailwind.config.ts`:

```typescript
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],

  darkMode: 'class',  // or 'media' for system preference

  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          // ... full color scale
          900: '#0c4a6e',
        },
      },

      animation: {
        'flip': 'flip 0.6s ease-in-out',
      },

      keyframes: {
        flip: {
          '0%, 100%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(180deg)' },
        },
      },
    },
  },

  plugins: [],
}
```

## Configuration by Environment

### Development Environment

**Goals:** Fast iteration, detailed logging, hot reload

#### Backend `.env`
```env
ENVIRONMENT=development
DATABASE_URL=postgresql://flashdecks:localdev@localhost:5432/flashdecks_db
LOG_LEVEL=DEBUG
DB_ECHO=true  # Log all SQL queries
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

#### Frontend `.env.local`
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_ENABLE_DEBUG=true
```

**Development Tips:**
- Use `.env.local` for personal overrides (gitignored)
- Enable SQL logging to debug queries
- Use `DEBUG` log level for detailed traces

### Staging Environment

**Goals:** Test production configuration, real-like data

#### Backend
```env
ENVIRONMENT=staging
DATABASE_URL=postgresql://user:pass@staging-db.example.com:5432/flashdecks_staging
LOG_LEVEL=INFO
JWT_SECRET_KEY=staging-specific-secret-key
CORS_ORIGINS=https://staging.flashdecks.com
```

#### Frontend
```env
VITE_API_BASE_URL=https://api-staging.flashdecks.com/api/v1
VITE_ENABLE_ANALYTICS=true
VITE_ANALYTICS_ID=staging-analytics-id
```

### Production Environment

**Goals:** Security, performance, reliability

#### Backend
```env
ENVIRONMENT=production
DATABASE_URL=postgresql://prod_user:complex_password@prod-db.example.com:5432/flashdecks_prod
LOG_LEVEL=WARNING
LOG_FORMAT=json
JWT_SECRET_KEY=super-secure-randomly-generated-secret
JWT_REFRESH_SECRET_KEY=different-super-secure-secret
CORS_ORIGINS=https://flashdecks.com,https://www.flashdecks.com
ACCESS_TOKEN_EXPIRE_MINUTES=15  # Shorter for security
DB_POOL_SIZE=20  # Larger pool for production load
RATE_LIMIT_PER_MINUTE=30  # Stricter rate limiting
```

#### Frontend
```env
VITE_API_BASE_URL=https://api.flashdecks.com/api/v1
VITE_ENABLE_ANALYTICS=true
VITE_ANALYTICS_ID=production-analytics-id
VITE_ENABLE_DEBUG=false
```

**Production Checklist:**
- ✅ Strong, unique JWT secrets
- ✅ Restrictive CORS origins (no wildcards)
- ✅ HTTPS everywhere
- ✅ Shorter token expiration
- ✅ Lower log level (INFO or WARNING)
- ✅ Secure database passwords
- ✅ Rate limiting enabled
- ✅ Analytics and monitoring
- ✅ Backup strategy configured

## Database Configuration

### Connection Pooling

Edit `/backend/app/db/session.py`:

```python
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DB_ECHO,
    pool_size=10,           # Number of persistent connections
    max_overflow=20,        # Additional connections when pool full
    pool_timeout=30,        # Seconds to wait for connection
    pool_recycle=3600,      # Recycle connections after 1 hour
    pool_pre_ping=True,     # Verify connection before use
)
```

**Tuning Guidelines:**
- **Light usage**: `pool_size=5`, `max_overflow=10`
- **Medium usage**: `pool_size=10`, `max_overflow=20`
- **Heavy usage**: `pool_size=20`, `max_overflow=40`

### Migration Configuration

Located at `/backend/alembic.ini`:

```ini
[alembic]
script_location = alembic
sqlalchemy.url = postgresql://user:pass@localhost:5432/flashdecks_db

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic
```

**Common Commands:**
```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View current version
alembic current

# View migration history
alembic history
```

## Advanced Configuration

### API Documentation

Configure Swagger UI in `/backend/app/main.py`:

```python
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    docs_url="/docs",           # Swagger UI at /docs
    redoc_url="/redoc",         # ReDoc at /redoc
    openapi_url="/openapi.json" # OpenAPI schema
)
```

**Disable in production (optional):**
```python
app = FastAPI(
    title=settings.PROJECT_NAME,
    docs_url=None if settings.ENVIRONMENT == "production" else "/docs",
    redoc_url=None if settings.ENVIRONMENT == "production" else "/redoc",
)
```

### CORS Fine-Tuning

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],  # Custom headers
    max_age=3600,  # Cache preflight requests
)
```

### Request Validation

```python
# In settings.py
class Settings(BaseSettings):
    # Increase limits for file uploads
    MAX_REQUEST_SIZE: int = 10_000_000  # 10MB
    MAX_UPLOAD_SIZE: int = 5_000_000    # 5MB

    # Validation
    MIN_PASSWORD_LENGTH: int = 8
    MAX_DECK_CARDS: int = 1000
    MAX_TAGS_PER_DECK: int = 10
```

## Configuration Management Tips

### Environment Variable Hierarchy

1. **System environment variables** (highest priority)
2. **`.env` file in project root**
3. **Default values in `config.py`** (lowest priority)

### Secrets Management

**Development:**
- Use `.env` files (gitignored)
- Share example file: `.env.example`

**Production:**
- Use platform secret management:
  - **Docker**: `docker secret create`
  - **Kubernetes**: Secrets and ConfigMaps
  - **Cloud**: AWS Secrets Manager, Google Secret Manager
  - **Platform**: Heroku Config Vars, Vercel Env Variables

**Example `.env.example`:**
```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Security (CHANGE THESE!)
JWT_SECRET_KEY=change-me-in-production
JWT_REFRESH_SECRET_KEY=change-me-in-production

# CORS
CORS_ORIGINS=http://localhost:5173
```

### Configuration Validation

Add validation in `/backend/app/core/config.py`:

```python
from pydantic import validator, PostgresDsn

class Settings(BaseSettings):
    DATABASE_URL: PostgresDsn

    @validator("JWT_SECRET_KEY")
    def validate_secret_key(cls, v):
        if v == "change-me-in-production":
            raise ValueError("You must change JWT_SECRET_KEY in production!")
        if len(v) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters")
        return v

    @validator("CORS_ORIGINS")
    def validate_cors_production(cls, v, values):
        if values.get("ENVIRONMENT") == "production" and "*" in v:
            raise ValueError("Wildcard CORS not allowed in production!")
        return v
```

## Troubleshooting Configuration

### Backend won't start

**Check:**
```bash
# Validate environment variables
python -c "from app.core.config import get_settings; print(get_settings())"

# Test database connection
python -c "from app.db.session import engine; engine.connect()"
```

### Frontend can't reach backend

**Check:**
```bash
# Verify API URL
echo $VITE_API_BASE_URL

# Test from browser console
fetch('http://localhost:8000/api/v1/health').then(r => r.json())

# Check CORS configuration
curl -H "Origin: http://localhost:5173" -I http://localhost:8000/api/v1/health
```

### Docker services can't communicate

**Check:**
```bash
# Verify network
docker network ls
docker network inspect docker_default

# Check DNS resolution
docker compose exec backend ping db
docker compose exec frontend ping backend
```

## Next Steps

- [Development Setup](../development/setup.md) - Configure for development
- [Deployment Guide](../deployment/production.md) - Production configuration
- [Security Best Practices](../deployment/security.md) - Secure your deployment

---

**Need help?** Configuration issues are common! Check the [troubleshooting guide](../development/troubleshooting.md) or open an issue.
