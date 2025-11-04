# CI/CD Pipeline

Automated testing and deployment with GitHub Actions.

## Workflow Overview

Location: `.github/workflows/ci.yml`

### Jobs

1. **backend-tests**
   - Python 3.11
   - PostgreSQL 15 service
   - Run pytest with coverage
   - Upload to Codecov

2. **frontend-tests**
   - Node.js 20
   - Run ESLint
   - Run TypeScript check
   - Run Vitest
   - Upload to Codecov

3. **build**
   - Verify frontend production build
   - Check for build errors

4. **docker-build**
   - Build Docker images
   - Cache layers
   - Verify successful builds

## Triggers

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

## Status Badges

Add to README:
```markdown
![Tests](https://github.com/username/flashcardApplication/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/username/flashcardApplication/branch/main/graph/badge.svg)](https://codecov.io/gh/username/flashcardApplication)
```

## Local Testing Before Push

```bash
# Backend
cd backend
flake8 app/
pytest

# Frontend
cd frontend
npm run lint
npm run type-check
npm test

# Docker build
docker compose -f docker/docker-compose.yml build
```

## Further Reading

- [Contributing Guide](./contributing.md)
- [Testing Guide](./testing.md)
