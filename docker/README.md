# Docker Stack

## Services
- **db**: PostgreSQL 15 with persistent volume `postgres_data`.
- **backend**: FastAPI application served via Uvicorn. Runs Alembic migrations on startup. Hot-reloads code via bind mount.
- **frontend**: Static build served by Nginx on port 5173.

## Usage
```bash
docker compose -f docker/docker-compose.yml up --build
```

Visit http://localhost:5173 for the web app and http://localhost:8000/docs for API docs.

Environment defaults come from `backend/.env.example` and `frontend/.env.example`.

