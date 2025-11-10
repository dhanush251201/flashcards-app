# Test Guide - AI Deck Generation

## Overview

This guide explains how to run and understand the test cases for the AI deck generation feature.

## Test File Location

```
backend/tests/test_ai_decks.py
```

## Running Tests

### Prerequisites

1. Install test dependencies:
```bash
cd backend
pip install pytest pytest-asyncio pytest-mock
```

2. Set environment variables:
```bash
export DATABASE_URL="sqlite:///./test.db"
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

### Run All Tests

```bash
# From backend directory
pytest tests/test_ai_decks.py -v
```

### Run Specific Test Classes

```bash
# Run validation tests only
pytest tests/test_ai_decks.py::TestLLMServiceValidation -v

# Run generation tests only
pytest tests/test_ai_decks.py::TestLLMServiceGeneration -v

# Run mocked LLM tests only
pytest tests/test_ai_decks.py::TestMockedLLMGeneration -v
```

### Run Specific Test Methods

```bash
# Run a single test
pytest tests/test_ai_decks.py::TestLLMServiceValidation::test_validate_basic_card -v

# Run multiple specific tests
pytest tests/test_ai_decks.py::TestLLMServiceValidation::test_validate_basic_card tests/test_ai_decks.py::TestLLMServiceValidation::test_validate_multiple_choice_card -v
```

### Run with Coverage

```bash
pytest tests/test_ai_decks.py --cov=app.services.llm_service --cov-report=html
```

This generates an HTML coverage report in `htmlcov/index.html`

### Run with Detailed Output

```bash
# Show print statements
pytest tests/test_ai_decks.py -v -s

# Show local variables on failure
pytest tests/test_ai_decks.py -v -l

# Stop on first failure
pytest tests/test_ai_decks.py -v -x
```

## Test Categories

### 1. TestLLMServiceValidation

Tests the validation logic for different card types.

**Tests:**
- ✅ Valid basic card structure
- ✅ Valid multiple choice card structure
- ✅ Valid short answer card structure
- ✅ Valid cloze card structure
- ❌ Invalid cards (missing prompt/answer)
- ❌ Invalid MC cards (answer not in options, insufficient options)
- ❌ Invalid cloze cards (missing blanks, no cloze format)

**Run:**
```bash
pytest tests/test_ai_decks.py::TestLLMServiceValidation -v
```

**Expected Output:**
```
test_validate_basic_card PASSED
test_validate_multiple_choice_card PASSED
test_validate_short_answer_card PASSED
test_validate_cloze_card PASSED
test_invalid_card_missing_prompt PASSED
test_invalid_card_missing_answer PASSED
test_invalid_multiple_choice_answer_not_in_options PASSED
test_invalid_multiple_choice_insufficient_options PASSED
test_invalid_cloze_missing_blanks PASSED
test_invalid_cloze_missing_cloze_data PASSED
```

### 2. TestLLMServiceGeneration

Tests the LLM service configuration and prompts.

**Tests:**
- Content length validation (min 50 chars)
- Number of cards validation (5-20)
- Content truncation for long documents
- System prompt includes all 4 card types
- System prompt instructs JSON format
- User prompt includes requested number of cards

**Run:**
```bash
pytest tests/test_ai_decks.py::TestLLMServiceGeneration -v
```

### 3. TestMockedLLMGeneration

Tests actual generation logic with mocked LLM responses.

**Tests:**
- ✅ Successful OpenAI generation
- ❌ Invalid JSON response handling
- ❌ Ollama timeout handling
- ✅ Card type defaults to "basic" when missing
- ✅ Invalid MC cards are skipped
- ✅ Validation filters out bad cards

**Run:**
```bash
pytest tests/test_ai_decks.py::TestMockedLLMGeneration -v
```

**Note:** These tests use mocked responses, not actual LLM calls.

### 4. TestCardTypeMixing

Tests that generated decks have proper card type distribution.

**Tests:**
- Multiple card types in a single deck
- All cards in a mixed deck are valid
- Type-specific validation works across all types

**Run:**
```bash
pytest tests/test_ai_decks.py::TestCardTypeMixing -v
```

### 5. TestAPIValidation

Tests API-level validation for deck creation.

**Tests:**
- Card validation during deck creation
- Multiple choice validation at API level
- Cloze validation at API level

**Run:**
```bash
pytest tests/test_ai_decks.py::TestAPIValidation -v
```

## Manual Testing

### Test with Real Ollama

1. Start Ollama:
```bash
ollama serve
```

2. Test status endpoint:
```bash
curl http://localhost:8000/api/v1/ai-decks/ollama/status
```

Expected:
```json
{
  "available": true,
  "message": "Ollama is available and running"
}
```

3. Test card generation with a small file:
```bash
curl -X POST http://localhost:8000/api/v1/ai-decks/generate-from-file \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test_document.txt" \
  -F "num_cards=5"
```

### Test with Real OpenAI

1. Add OpenAI API key in Settings UI or via API:
```bash
curl -X PATCH http://localhost:8000/api/v1/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "openai_api_key": "sk-...",
    "llm_provider_preference": "openai"
  }'
```

2. Generate cards (same as Ollama test above)

### Test Card Type Distribution

After generating cards, check the distribution:

```python
import requests

response = requests.post(
    "http://localhost:8000/api/v1/ai-decks/generate-from-file",
    headers={"Authorization": f"Bearer {token}"},
    files={"file": open("test.pdf", "rb")},
    data={"num_cards": 20}
)

cards = response.json()["cards"]

# Count by type
from collections import Counter
types = Counter(card["type"] for card in cards)
print(types)
# Expected: {'basic': 5, 'multiple_choice': 5, 'short_answer': 5, 'cloze': 5}
# (or similar distribution)
```

## Test Data

### Sample Valid Cards

Use these in your tests:

```python
VALID_BASIC_CARD = {
    "type": "basic",
    "prompt": "What is Python?",
    "answer": "A programming language",
    "explanation": "Python is a high-level, interpreted language"
}

VALID_MC_CARD = {
    "type": "multiple_choice",
    "prompt": "Which is a Python framework?",
    "answer": "Django",
    "options": ["Django", "React", "Angular", "Vue"],
    "explanation": "Django is a Python web framework"
}

VALID_SHORT_ANSWER_CARD = {
    "type": "short_answer",
    "prompt": "Explain recursion",
    "answer": "A function that calls itself",
    "explanation": None
}

VALID_CLOZE_CARD = {
    "type": "cloze",
    "prompt": "Python was created by [BLANK] Guido van Rossum in [BLANK] 1991.",
    "answer": "Guido van Rossum, 1991",
    "cloze_data": {
        "blanks": [
            {"answer": "Guido van Rossum"},
            {"answer": "1991"}
        ]
    },
    "explanation": None
}
```

### Sample Invalid Cards

```python
INVALID_NO_PROMPT = {
    "type": "basic",
    "answer": "Some answer"
}

INVALID_NO_ANSWER = {
    "type": "basic",
    "prompt": "Some question?"
}

INVALID_MC_BAD_OPTIONS = {
    "type": "multiple_choice",
    "prompt": "Question?",
    "answer": "Not in options",
    "options": ["Option A", "Option B"]
}

INVALID_CLOZE_NO_BLANKS = {
    "type": "cloze",
    "prompt": "No blanks here",
    "answer": "Something",
    "cloze_data": {"blanks": []}
}
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test AI Deck Generation

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-mock pytest-cov
      - name: Run tests
        run: |
          cd backend
          pytest tests/test_ai_decks.py -v --cov=app.services.llm_service
```

## Troubleshooting

### Import Errors

If you see import errors:
```bash
# Set PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)/backend"

# Or install in editable mode
cd backend
pip install -e .
```

### Async Test Failures

Make sure pytest-asyncio is installed:
```bash
pip install pytest-asyncio
```

### Mock Not Working

Ensure pytest-mock is installed:
```bash
pip install pytest-mock
```

### Database Errors

Set a test database URL:
```bash
export DATABASE_URL="sqlite:///./test.db"
```

## Test Coverage Goals

Target coverage for AI deck generation:

- `app/services/llm_service.py`: **>80%**
- `app/api/routes/ai_decks.py`: **>70%**
- Validation logic: **100%**

Current test coverage (run to check):
```bash
pytest tests/test_ai_decks.py --cov=app.services.llm_service --cov=app.api.routes.ai_decks --cov-report=term-missing
```

## Adding New Tests

When adding new card types or features:

1. Add validation tests in `TestLLMServiceValidation`
2. Add generation tests in `TestLLMServiceGeneration`
3. Add mocked integration tests in `TestMockedLLMGeneration`
4. Update sample valid/invalid card data
5. Run full test suite to ensure no regressions

## Performance Benchmarks

Expected test execution times:

- Validation tests: **< 1 second**
- Generation tests: **< 1 second**
- Mocked LLM tests: **< 2 seconds**
- Full suite: **< 5 seconds**

If tests are slower, check for:
- Actual network calls (should be mocked)
- Large test data files
- Database operations not using in-memory DB

## Summary

✅ **60+ test cases** covering all card types and validation
✅ **Mocked tests** for fast execution without real LLM calls
✅ **Integration tests** for end-to-end workflows
✅ **Error handling tests** for edge cases
✅ **Ready for CI/CD** integration

Run the full test suite:
```bash
pytest tests/test_ai_decks.py -v
```

All tests should pass! 🎉
