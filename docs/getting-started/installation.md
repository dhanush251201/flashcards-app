# Installation Guide

This guide will walk you through setting up Flash-Decks on your local machine for development.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

- **Docker** (20.10+) and **Docker Compose** (2.0+)
  - [Install Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Compose)
  - Verify installation: `docker --version && docker compose version`

- **Python** (3.11+)
  - [Download Python](https://www.python.org/downloads/)
  - Verify installation: `python --version` or `python3 --version`

- **Node.js** (20.x) and **npm** (10.x)
  - [Download Node.js](https://nodejs.org/) (includes npm)
  - Verify installation: `node --version && npm --version`

- **PostgreSQL Client Tools** (optional, for database inspection)
  - macOS: `brew install postgresql@15`
  - Ubuntu/Debian: `sudo apt install postgresql-client-15`
  - Windows: Download from [PostgreSQL website](https://www.postgresql.org/download/)

### Optional Tools

- **Git** - For version control
- **VS Code** - Recommended IDE with extensions:
  - Python
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - Docker

## Installation Methods

Choose the installation method that best suits your needs:

### Method 1: Docker Compose (Recommended for Quick Start)

This method runs the entire stack (database, backend, frontend) in containers.

**Advantages:**
- Fastest setup
- No local Python/Node setup required
- Production-like environment
- Isolated from your system

**Steps:**

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/flashcardApplication.git
   cd flashcardApplication
   ```

2. **Navigate to docker directory**
   ```bash
   cd docker
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` with your settings** (optional for local dev)
   ```env
   # Database
   POSTGRES_USER=flashdecks
   POSTGRES_PASSWORD=your_secure_password_here
   POSTGRES_DB=flashdecks_db

   # Backend
   DATABASE_URL=postgresql://flashdecks:your_secure_password_here@db:5432/flashdecks_db
   JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
   JWT_REFRESH_SECRET_KEY=your-super-secret-refresh-key-change-this-in-production
   CORS_ORIGINS=http://localhost:5173,http://localhost:3000

   # Frontend
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   ```

5. **Start the application**
   ```bash
   docker compose up --build
   ```

6. **Wait for services to start**
   - Database: Ready when you see "database system is ready to accept connections"
   - Backend: Ready at `http://localhost:8000` (see "Application startup complete")
   - Frontend: Ready at `http://localhost:5173`

7. **Verify installation**
   - Open `http://localhost:5173` in your browser
   - You should see the Flash-Decks landing page
   - API docs available at `http://localhost:8000/docs`

8. **Seed sample data** (optional)
   ```bash
   docker compose exec backend python scripts/seed_data.py
   ```

### Method 2: Local Development Setup

This method runs services natively on your machine for active development.

**Advantages:**
- Faster hot-reload
- Direct access to source code
- Better debugging experience
- Use your preferred IDE tools

#### Step 1: Database Setup

**Option A: Docker PostgreSQL (Recommended)**
```bash
docker run -d \
  --name flashdecks-postgres \
  -e POSTGRES_USER=flashdecks \
  -e POSTGRES_PASSWORD=localdev \
  -e POSTGRES_DB=flashdecks_db \
  -p 5432:5432 \
  -v flashdecks-data:/var/lib/postgresql/data \
  postgres:15
```

**Option B: Local PostgreSQL Installation**
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15
createdb flashdecks_db

# Ubuntu/Debian
sudo apt install postgresql-15
sudo systemctl start postgresql
sudo -u postgres createdb flashdecks_db

# Create user
psql -d flashdecks_db -c "CREATE USER flashdecks WITH PASSWORD 'localdev';"
psql -d flashdecks_db -c "GRANT ALL PRIVILEGES ON DATABASE flashdecks_db TO flashdecks;"
```

#### Step 2: Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create Python virtual environment**
   ```bash
   python3 -m venv venv

   # Activate virtual environment
   # macOS/Linux:
   source venv/bin/activate
   # Windows:
   venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create `.env` file**
   ```bash
   # In backend directory
   cat > .env << EOF
   DATABASE_URL=postgresql://flashdecks:localdev@localhost:5432/flashdecks_db
   JWT_SECRET_KEY=dev-secret-key-change-in-production
   JWT_REFRESH_SECRET_KEY=dev-refresh-secret-key-change-in-production
   CORS_ORIGINS=http://localhost:5173,http://localhost:3000
   LOG_LEVEL=DEBUG
   EOF
   ```

5. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

6. **Seed sample data** (optional)
   ```bash
   python scripts/seed_data.py
   ```

7. **Start the backend server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   Backend should be running at `http://localhost:8000`

#### Step 3: Frontend Setup

1. **Open new terminal and navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `.env` file**
   ```bash
   # In frontend directory
   echo "VITE_API_BASE_URL=http://localhost:8000/api/v1" > .env
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   Frontend should be running at `http://localhost:5173`

## Verification

### Check Services

1. **Frontend**: Navigate to `http://localhost:5173`
   - Should see the landing page
   - Try creating an account

2. **Backend API**: Navigate to `http://localhost:8000/docs`
   - Should see FastAPI Swagger UI
   - Try the `/api/v1/health` endpoint

3. **Database**:
   ```bash
   # If using Docker:
   docker exec -it flashdecks-postgres psql -U flashdecks -d flashdecks_db

   # If using local PostgreSQL:
   psql -U flashdecks -d flashdecks_db

   # List tables:
   \dt

   # Should see: users, decks, cards, srs_reviews, etc.
   ```

### Run Tests

**Backend Tests:**
```bash
cd backend
pytest
# Should see 100+ tests passing with ~93% coverage
```

**Frontend Tests:**
```bash
cd frontend
npm test
# Should see 38 tests passing
```

## Common Issues

### Port Already in Use

**Error:** `Port 5432 (or 8000, 5173) is already in use`

**Solution:**
```bash
# Find process using port
lsof -i :5432  # macOS/Linux
netstat -ano | findstr :5432  # Windows

# Kill process or change port in docker-compose.yml/.env
```

### Database Connection Failed

**Error:** `could not connect to server: Connection refused`

**Solution:**
1. Ensure PostgreSQL is running: `docker ps` or `brew services list`
2. Check DATABASE_URL matches your PostgreSQL credentials
3. Test connection: `psql postgresql://flashdecks:localdev@localhost:5432/flashdecks_db`

### Module Not Found (Python)

**Error:** `ModuleNotFoundError: No module named 'app'`

**Solution:**
1. Ensure virtual environment is activated
2. Reinstall dependencies: `pip install -r requirements.txt`
3. Run from backend directory

### Cannot Find Module (Node)

**Error:** `Cannot find module 'react'`

**Solution:**
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. Clear npm cache: `npm cache clean --force`

### Alembic Migration Issues

**Error:** `Target database is not up to date`

**Solution:**
```bash
# Check current migration status
alembic current

# Apply all migrations
alembic upgrade head

# If you need to start fresh (CAUTION: destroys data):
alembic downgrade base
alembic upgrade head
```

### Docker Build Failures

**Error:** Build hangs or fails

**Solution:**
```bash
# Clean Docker cache
docker builder prune

# Rebuild without cache
docker compose build --no-cache

# Check Docker resources (Desktop -> Settings -> Resources)
# Allocate at least 4GB RAM and 2 CPU cores
```

## Next Steps

Now that you have Flash-Decks installed:

1. **Try it out**: [Quick Start Guide](./quick-start.md)
2. **Configure it**: [Configuration Guide](./configuration.md)
3. **Start developing**: [Development Setup](../development/setup.md)

## Getting Help

- Check the [FAQ](../development/faq.md)
- Search [GitHub Issues](https://github.com/yourusername/flashcardApplication/issues)
- Join our community discussions

---

**Having trouble?** Make sure you've met all the prerequisites and followed the steps exactly as written. Most issues are caused by missing dependencies or incorrect environment variables.
