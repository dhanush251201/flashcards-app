# Development Setup

Complete guide for setting up Flash-Decks for local development.

## Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Docker & Docker Compose (optional)

## Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
alembic upgrade head

# Optional: Seed sample data
python scripts/seed_data.py

# Start server
uvicorn app.main:app --reload --port 8000
```

Backend available at: http://localhost:8000
API docs at: http://localhost:8000/docs

## Frontend Setup

```bash
cd frontend
npm install

# Create .env file
echo "VITE_API_BASE_URL=http://localhost:8000/api/v1" > .env

# Start dev server
npm run dev
```

Frontend available at: http://localhost:5173

## Docker Setup (Alternative)

```bash
cd docker
docker compose up --build
```

All services start automatically:
- Database: PostgreSQL on port 5432
- Backend: http://localhost:8000
- Frontend: http://localhost:5173

## Further Reading

- [Installation Guide](../getting-started/installation.md)
- [Configuration Guide](../getting-started/configuration.md)
- [Testing Guide](./testing.md)
