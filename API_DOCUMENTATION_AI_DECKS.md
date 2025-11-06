# AI Deck Generation API Documentation

## Overview

The AI Deck Generation API allows users to automatically generate flashcard decks from documents using Large Language Models (LLMs). The API supports both OpenAI and Ollama as LLM providers and generates four different types of flashcards.

## Base URL

```
http://localhost:8000/api/v1/ai-decks
```

## Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Check Ollama Status

Check if Ollama is installed and running on the system.

**Endpoint:** `GET /ai-decks/ollama/status`

**Authentication:** Not required

**Response:**

```json
{
  "available": true,
  "message": "Ollama is available and running"
}
```

**Status Codes:**
- `200 OK` - Success

**Example Request:**

```bash
curl http://localhost:8000/api/v1/ai-decks/ollama/status
```

---

### 2. Generate Flashcards from File

Upload a document and generate flashcards using AI.

**Endpoint:** `POST /ai-decks/generate-from-file`

**Authentication:** Required

**Content-Type:** `multipart/form-data`

**Parameters:**

| Parameter  | Type    | Required | Description                           |
|------------|---------|----------|---------------------------------------|
| file       | File    | Yes      | PDF, PPT, PPTX, TXT, or DOCX file     |
| num_cards  | Integer | Yes      | Number of flashcards (5-20)           |

**Supported File Types:**
- PDF (.pdf)
- PowerPoint (.ppt, .pptx)
- Text (.txt)
- Word Document (.docx)

**File Size Limit:** 10MB

**Response:**

```json
{
  "cards": [
    {
      "type": "basic",
      "prompt": "What is Python?",
      "answer": "A high-level programming language",
      "explanation": "Python is known for its simplicity and readability"
    },
    {
      "type": "multiple_choice",
      "prompt": "Which of these is a Python web framework?",
      "answer": "Django",
      "options": ["Django", "React", "Angular", "Vue"],
      "explanation": "Django is a high-level Python web framework"
    },
    {
      "type": "short_answer",
      "prompt": "Explain the concept of list comprehension in Python",
      "answer": "A concise way to create lists based on existing lists",
      "explanation": null
    },
    {
      "type": "cloze",
      "prompt": "Python uses {{c1::indentation}} to define code blocks instead of {{c2::braces}}.",
      "answer": "indentation, braces",
      "cloze_data": {
        "blanks": [
          {"answer": "indentation"},
          {"answer": "braces"}
        ]
      },
      "explanation": null
    }
  ],
  "count": 4
}
```

**Status Codes:**
- `200 OK` - Cards generated successfully
- `400 Bad Request` - Invalid file type or parameters
- `401 Unauthorized` - Missing or invalid authentication token
- `503 Service Unavailable` - Ollama not available (if using Ollama)
- `504 Gateway Timeout` - LLM request timed out
- `500 Internal Server Error` - Generation failed

**Error Response:**

```json
{
  "detail": "File content is too short. Please upload a file with more substantial content."
}
```

**Example Request:**

```bash
curl -X POST http://localhost:8000/api/v1/ai-decks/generate-from-file \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf" \
  -F "num_cards=10"
```

**Example with Python:**

```python
import requests

url = "http://localhost:8000/api/v1/ai-decks/generate-from-file"
headers = {"Authorization": f"Bearer {token}"}
files = {"file": open("document.pdf", "rb")}
data = {"num_cards": 10}

response = requests.post(url, headers=headers, files=files, data=data)
cards = response.json()["cards"]
```

---

### 3. Create Deck from Generated Cards

Create a new flashcard deck from AI-generated cards after review/editing.

**Endpoint:** `POST /ai-decks/create-deck`

**Authentication:** Required

**Content-Type:** `application/json`

**Request Body:**

```json
{
  "title": "AI Generated: Python Basics",
  "description": "Flashcards generated from Python tutorial",
  "tag_names": ["python", "programming", "ai-generated"],
  "cards": [
    {
      "type": "basic",
      "prompt": "What is a variable?",
      "answer": "A container for storing data",
      "explanation": null
    },
    {
      "type": "multiple_choice",
      "prompt": "Which is a Python data type?",
      "answer": "list",
      "options": ["list", "array", "vector", "collection"],
      "explanation": "Lists are a built-in Python data type"
    }
  ]
}
```

**Request Body Schema:**

| Field       | Type     | Required | Description                           |
|-------------|----------|----------|---------------------------------------|
| title       | String   | Yes      | Deck title (1-200 characters)         |
| description | String   | No       | Deck description                      |
| tag_names   | String[] | No       | Array of tag names                    |
| cards       | Card[]   | Yes      | Array of card objects (min 1)         |

**Card Object Schema:**

| Field       | Type     | Required | Description                           |
|-------------|----------|----------|---------------------------------------|
| type        | String   | Yes      | Card type: "basic", "multiple_choice", "short_answer", "cloze" |
| prompt      | String   | Yes      | Question/prompt text                  |
| answer      | String   | Yes      | Answer text                           |
| explanation | String   | No       | Optional explanation                  |
| options     | String[] | Conditional | Required for multiple_choice (min 2) |
| cloze_data  | Object   | Conditional | Required for cloze type              |

**Response:**

```json
{
  "id": 123,
  "title": "AI Generated: Python Basics",
  "description": "Flashcards generated from Python tutorial",
  "is_public": false,
  "owner_user_id": 1,
  "created_at": "2025-11-06T19:00:00Z",
  "updated_at": "2025-11-06T19:00:00Z",
  "tags": [
    {"id": 1, "name": "python"},
    {"id": 2, "name": "programming"},
    {"id": 3, "name": "ai-generated"}
  ],
  "cards": [
    {
      "id": 456,
      "deck_id": 123,
      "type": "basic",
      "prompt": "What is a variable?",
      "answer": "A container for storing data",
      "explanation": null,
      "options": null,
      "cloze_data": null,
      "created_at": "2025-11-06T19:00:00Z",
      "updated_at": "2025-11-06T19:00:00Z"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Deck created successfully
- `400 Bad Request` - Invalid card data or validation failed
- `401 Unauthorized` - Missing or invalid authentication token
- `500 Internal Server Error` - Deck creation failed

**Validation Rules:**

1. **All Card Types:**
   - Prompt and answer are required and cannot be empty
   - Type must be one of: "basic", "multiple_choice", "short_answer", "cloze"

2. **Multiple Choice Cards:**
   - Must have at least 2 options
   - Answer must be one of the options
   - Options must be unique

3. **Cloze Cards:**
   - Prompt must contain at least one `{{c1::text}}` format blank
   - Must have cloze_data with blanks array
   - Each blank must have an answer

**Error Response:**

```json
{
  "detail": "Card 3: Multiple choice cards must have at least 2 options"
}
```

**Example Request:**

```bash
curl -X POST http://localhost:8000/api/v1/ai-decks/create-deck \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My AI Deck",
    "description": "Generated from lecture notes",
    "tag_names": ["ai-generated", "lecture"],
    "cards": [
      {
        "type": "basic",
        "prompt": "What is AI?",
        "answer": "Artificial Intelligence"
      }
    ]
  }'
```

---

## Card Types

### 1. Basic Card

Simple question and answer pair.

```json
{
  "type": "basic",
  "prompt": "What is the capital of France?",
  "answer": "Paris",
  "explanation": "Paris is the capital and largest city of France"
}
```

### 2. Multiple Choice Card

Question with 4 options and one correct answer.

```json
{
  "type": "multiple_choice",
  "prompt": "What is the largest planet in our solar system?",
  "answer": "Jupiter",
  "options": ["Earth", "Jupiter", "Saturn", "Mars"],
  "explanation": "Jupiter is the largest planet"
}
```

**Requirements:**
- At least 2 options (typically 4)
- Answer must be exactly one of the options
- Options should be unique

### 3. Short Answer Card

Open-ended question requiring a constructed response.

```json
{
  "type": "short_answer",
  "prompt": "Explain the process of photosynthesis",
  "answer": "Plants convert light energy into chemical energy through chlorophyll",
  "explanation": "This process occurs in the chloroplasts of plant cells"
}
```

### 4. Cloze Card

Fill-in-the-blank style question using Anki-style syntax.

```json
{
  "type": "cloze",
  "prompt": "The {{c1::mitochondria}} is the powerhouse of the {{c2::cell}}.",
  "answer": "mitochondria, cell",
  "cloze_data": {
    "blanks": [
      {"answer": "mitochondria"},
      {"answer": "cell"}
    ]
  },
  "explanation": "Mitochondria produce ATP, the energy currency of cells"
}
```

**Cloze Syntax:**
- `{{c1::text}}` - First blank
- `{{c2::text}}` - Second blank
- `{{c3::text}}` - Third blank, etc.

**Requirements:**
- Prompt must contain at least one `{{c1::...}}` blank
- cloze_data.blanks must match the blanks in prompt
- Blanks are numbered sequentially starting from c1

---

## LLM Configuration

Users can configure their preferred LLM provider in the Settings page.

### OpenAI Configuration

1. Go to Settings
2. Enter OpenAI API Key
3. Set LLM Provider Preference to "openai"

**Benefits:**
- Faster generation (~30 seconds)
- Better JSON structure adherence
- More consistent results
- Higher quality questions

**Cost:** ~$0.01-0.05 per deck using gpt-4o-mini

### Ollama Configuration

1. Install Ollama on your local machine
2. Pull a model: `ollama pull deepseek-r1:14b`
3. Ensure Ollama is running
4. Set LLM Provider Preference to "ollama" (or leave empty)

**Benefits:**
- Free to use
- Privacy (runs locally)
- No API key required

**Requirements:**
- Ollama must be running on localhost:11434
- Takes longer (~2-5 minutes per deck)
- Content automatically truncated to 10,000 characters

---

## Limits and Constraints

| Constraint                  | Value          |
|-----------------------------|----------------|
| Min cards per generation    | 5              |
| Max cards per generation    | 20             |
| Max file size               | 10 MB          |
| Max content length (Ollama) | 10,000 chars   |
| Timeout (Ollama)            | 5 minutes      |
| Timeout (OpenAI)            | 2 minutes      |

---

## Error Handling

### Common Errors

**400 Bad Request**
```json
{
  "detail": "Number of cards must be between 5 and 20"
}
```

**401 Unauthorized**
```json
{
  "detail": "Could not validate credentials"
}
```

**503 Service Unavailable**
```json
{
  "detail": "Ollama is not available. Please install Ollama or provide an OpenAI API key in settings."
}
```

**504 Gateway Timeout**
```json
{
  "detail": "Ollama request timed out. Please try again with shorter content."
}
```

---

## Workflow Example

### Complete Workflow with Python

```python
import requests

BASE_URL = "http://localhost:8000/api/v1"
TOKEN = "your_jwt_token"
headers = {"Authorization": f"Bearer {TOKEN}"}

# Step 1: Upload document and generate cards
with open("lecture.pdf", "rb") as f:
    files = {"file": f}
    data = {"num_cards": 10}
    response = requests.post(
        f"{BASE_URL}/ai-decks/generate-from-file",
        headers=headers,
        files=files,
        data=data
    )

generated_cards = response.json()["cards"]
print(f"Generated {len(generated_cards)} cards")

# Step 2: Review and edit cards (optional)
for i, card in enumerate(generated_cards):
    print(f"Card {i+1}: {card['type']}")
    print(f"  Q: {card['prompt']}")
    print(f"  A: {card['answer']}")
    # Edit cards as needed
    # generated_cards[i]['prompt'] = "Edited question"

# Step 3: Create deck
deck_data = {
    "title": "AI Generated: My Lecture",
    "description": "Flashcards from lecture PDF",
    "tag_names": ["ai-generated", "lecture"],
    "cards": generated_cards
}

response = requests.post(
    f"{BASE_URL}/ai-decks/create-deck",
    headers=headers,
    json=deck_data
)

deck = response.json()
print(f"Deck created with ID: {deck['id']}")
```

---

## Best Practices

1. **Document Size**
   - Keep documents under 50 pages for optimal results
   - Very long documents are automatically truncated to 10,000 characters

2. **Number of Cards**
   - Start with 5-10 cards for testing
   - Increase to 15-20 for comprehensive decks

3. **Card Review**
   - Always review AI-generated cards before creating deck
   - Edit questions for clarity and accuracy
   - Remove or improve low-quality cards

4. **Content Quality**
   - Use well-formatted documents (clear headings, paragraphs)
   - Ensure content has substantial information (>50 characters)
   - Avoid documents with mostly images or tables

5. **Provider Selection**
   - Use OpenAI for: Speed, quality, consistency
   - Use Ollama for: Privacy, cost savings, offline use

6. **Error Handling**
   - Implement retry logic for timeout errors
   - Check Ollama status before generation
   - Handle validation errors gracefully in UI

---

## Rate Limiting

No explicit rate limiting is currently enforced, but generation can be time-intensive:

- OpenAI: ~30 seconds per deck
- Ollama: ~2-5 minutes per deck

Users should avoid making concurrent requests for generation.

---

## Future Enhancements

Planned features:
- Custom question type distribution
- Image support for cards
- Batch processing multiple files
- True/False question type
- Matching question type
- Custom LLM model selection
- Fine-tuned prompts per subject area

---

## Support

For issues or questions:
- Check the logs: `docker logs flashdecks-backend`
- Review [FIXES_APPLIED.md](FIXES_APPLIED.md) for known issues
- Review [AI_FLASHCARD_TYPES.md](AI_FLASHCARD_TYPES.md) for feature details
