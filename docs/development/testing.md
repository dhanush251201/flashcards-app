# Testing Guide

Comprehensive testing documentation for Flash-Decks.

## Backend Testing

### Running Tests

```bash
cd backend
pytest
```

### With Coverage

```bash
pytest --cov=app --cov-report=html
```

### Test Structure

```
tests/
├── conftest.py           # Fixtures
├── test_api_auth.py      # Auth endpoints
├── test_api_decks.py     # Deck endpoints
├── test_api_study.py     # Study endpoints
├── test_srs.py           # SM-2 algorithm
├── test_services_study.py
└── test_streak.py
```

### Writing Tests

```python
def test_create_deck(client, auth_headers):
    """Test deck creation."""
    response = client.post(
        "/api/v1/decks",
        json={"title": "Test Deck", "is_public": True},
        headers=auth_headers
    )
    assert response.status_code == 201
    assert response.json()["title"] == "Test Deck"
```

### Current Coverage

- **Total:** 93%
- **Tests:** 118 passing

## Frontend Testing

### Running Tests

```bash
cd frontend
npm test
```

### Test Structure

```
src/
├── components/
│   ├── cards/
│   │   └── Flashcard.test.tsx
│   └── decks/
│       └── DeckCard.test.tsx
├── store/
│   └── authStore.test.ts
└── lib/
    └── apiClient.test.ts
```

### Writing Tests

```typescript
test('renders flashcard prompt', () => {
  render(<Flashcard card={mockCard} isFlipped={false} onFlip={vi.fn()} />)
  expect(screen.getByText('What is 2+2?')).toBeInTheDocument()
})
```

### Current Coverage

- **Tests:** 38 passing

## CI/CD Testing

Tests run automatically on GitHub Actions:
- On every push to main/develop
- On every pull request
- Codecov integration for coverage tracking

## Further Reading

- [Contributing Guide](./contributing.md)
- [CI/CD Pipeline](./ci-cd.md)
