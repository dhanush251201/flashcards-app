# Environment Variables Reference

Complete reference of all environment variables for Flash-Decks.

## Backend Variables

### Required

```env
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET_KEY=your-secret-key-min-32-chars
JWT_REFRESH_SECRET_KEY=different-secret-key-min-32-chars
```

### Optional

```env
# Application
PROJECT_NAME="Flash-Decks"
API_V1_STR="/api/v1"
LOG_LEVEL="INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL

# Security
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_MINUTES=10080  # 7 days
CORS_ORIGINS="http://localhost:5173,http://localhost:3000"

# Database
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_TIMEOUT=30
```

## Frontend Variables

### Required

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Optional

```env
VITE_APP_NAME="Flash-Decks"
VITE_DEFAULT_THEME="system"  # light, dark, system
```

## Docker Variables

### PostgreSQL

```env
POSTGRES_USER=flashdecks
POSTGRES_PASSWORD=changeme
POSTGRES_DB=flashdecks_db
```

## Security Best Practices

1. **Never commit .env files** to version control
2. **Use .env.example** with placeholder values
3. **Generate strong secrets:**
   ```bash
   openssl rand -hex 32
   ```
4. **Rotate secrets** periodically in production
5. **Use secrets management** (AWS Secrets Manager, etc.)

## Environment-Specific Configs

### Development

```env
DATABASE_URL=postgresql://flashdecks:localdev@localhost:5432/flashdecks_db
LOG_LEVEL=DEBUG
CORS_ORIGINS=*
```

### Staging

```env
DATABASE_URL=postgresql://user:pass@staging-db:5432/flashdecks_staging
LOG_LEVEL=INFO
CORS_ORIGINS=https://staging.flashdecks.com
```

### Production

```env
DATABASE_URL=postgresql://user:pass@prod-db:5432/flashdecks_prod
LOG_LEVEL=WARNING
ACCESS_TOKEN_EXPIRE_MINUTES=15
CORS_ORIGINS=https://flashdecks.com,https://www.flashdecks.com
```

## Further Reading

- [Configuration Guide](../getting-started/configuration.md)
- [Production Deployment](./production.md)
