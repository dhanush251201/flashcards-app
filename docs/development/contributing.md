# Contributing Guide

Thank you for considering contributing to Flash-Decks!

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a feature branch
4. Make your changes
5. Run tests
6. Submit a pull request

## Development Workflow

```bash
# Create feature branch
git checkout -b feature/my-new-feature

# Make changes
# ... code ...

# Run tests
cd backend && pytest
cd frontend && npm test

# Commit with descriptive message
git commit -m "Add feature: description"

# Push to your fork
git push origin feature/my-new-feature

# Create pull request on GitHub
```

## Code Standards

### Backend (Python)

- Follow PEP 8
- Use type hints
- Write docstrings
- Add tests for new features
- Run: `flake8 app/`

### Frontend (TypeScript)

- Follow ESLint rules
- Use TypeScript strictly
- Write component tests
- Run: `npm run lint`

## Pull Request Guidelines

- Clear description of changes
- Link related issues
- All tests passing
- Code reviewed by maintainer
- Up-to-date with main branch

## Reporting Issues

Use GitHub Issues with:
- Clear title
- Reproduction steps
- Expected vs actual behavior
- Environment details

## Further Reading

- [Development Setup](./setup.md)
- [Testing Guide](./testing.md)
- [Architecture Documentation](../architecture/overview.md)
