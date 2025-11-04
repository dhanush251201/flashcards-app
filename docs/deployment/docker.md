# Docker Deployment

Deploy Flash-Decks using Docker Compose.

## Quick Start

```bash
cd docker
docker compose up -d
```

## Services

### Database (PostgreSQL 15)

```yaml
db:
  image: postgres:15
  ports: ["5432:5432"]
  volumes: [postgres_data:/var/lib/postgresql/data]
  environment:
    POSTGRES_USER: flashdecks
    POSTGRES_PASSWORD: changeme
    POSTGRES_DB: flashdecks_db
```

### Backend (FastAPI)

```yaml
backend:
  build: ../backend
  ports: ["8000:8000"]
  depends_on:
    db: {condition: service_healthy}
  environment:
    DATABASE_URL: postgresql://flashdecks:changeme@db:5432/flashdecks_db
    JWT_SECRET_KEY: your-secret-key
```

### Frontend (React + Nginx)

```yaml
frontend:
  build: ../frontend
  ports: ["5173:80"]
  depends_on: [backend]
  environment:
    VITE_API_BASE_URL: http://localhost:8000/api/v1
```

## Configuration

Create `.env` file:

```env
POSTGRES_PASSWORD=your_secure_password
JWT_SECRET_KEY=your_jwt_secret
JWT_REFRESH_SECRET_KEY=your_refresh_secret
```

## Commands

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild after code changes
docker compose up --build

# Reset database
docker compose down -v
docker compose up -d
```

## Production Considerations

- Use secrets management
- Configure HTTPS/SSL
- Set up reverse proxy (Nginx/Traefik)
- Enable database backups
- Monitor container health
- Use container registry for images

## Further Reading

- [Production Guide](./production.md)
- [Environment Variables](./environment-variables.md)
