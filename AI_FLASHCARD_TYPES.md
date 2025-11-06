# AI Flashcard Generation - Multiple Question Types

## Overview
The AI flashcard generation feature now supports **4 different question types** to create diverse and engaging study materials:

1. **Basic** - Simple question and answer pairs
2. **Multiple Choice** - Questions with 4 options and one correct answer
3. **Short Answer** - Open-ended questions requiring constructed responses
4. **Cloze** - Fill-in-the-blank style questions

## Features

### Backend Implementation

#### LLM Service (`backend/app/services/llm_service.py`)
- Updated system prompt to instruct the AI to generate all 4 question types
- Enhanced validation logic to handle type-specific fields:
  - **Multiple Choice**: Validates options array (minimum 2 options), ensures answer is in options
  - **Cloze**: Validates cloze_data structure and {{c1::text}} format in prompt
- Supports both OpenAI and Ollama providers

#### API Routes (`backend/app/api/routes/ai_decks.py`)
- Enhanced card creation endpoint with comprehensive validation
- Type-specific field handling:
  - Multiple Choice: `options` array
  - Cloze: `cloze_data` with blanks array
- Detailed error messages for validation failures

### Frontend Implementation

#### Types (`frontend/src/types/api.ts`)
- Updated `GeneratedCard` type to include:
  ```typescript
  type: "basic" | "multiple_choice" | "short_answer" | "cloze"
  options?: string[] | null
  cloze_data?: ClozeData | null
  ```

#### UI (`frontend/src/pages/AIPoweredDecksPage.tsx`)
- Color-coded badges for each question type
- Card type statistics display
- Enhanced card editing interface:
  - **Multiple Choice**: Editable options with correct answer indicator
  - **Cloze**: Special formatting hints for {{c1::text}} syntax
- Visual distinction in review mode:
  - Multiple choice options highlighted with correct answer in green
  - Clear separation of question types with badges

## Data Structures

### Multiple Choice Card
```json
{
  "type": "multiple_choice",
  "prompt": "What is the primary function of mitochondria?",
  "answer": "Energy production",
  "options": ["Energy production", "Protein synthesis", "DNA storage", "Waste removal"],
  "explanation": "Mitochondria are the powerhouse of the cell"
}
```

### Cloze Card
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
  "explanation": null
}
```

### Short Answer Card
```json
{
  "type": "short_answer",
  "prompt": "Explain the process of photosynthesis",
  "answer": "Plants convert light energy into chemical energy through chlorophyll",
  "explanation": null
}
```

### Basic Card
```json
{
  "type": "basic",
  "prompt": "What is the capital of France?",
  "answer": "Paris",
  "explanation": null
}
```

## Validation Rules

### Frontend Validation
- All cards must have non-empty prompt and answer
- Multiple Choice:
  - Must have at least 2 options
  - Answer must be one of the options
  - Options must be unique
- Cloze:
  - Prompt must contain at least one {{c1::text}} format blank
  - Must have cloze_data with blanks array

### Backend Validation
- Mirrors frontend validation for security
- Returns specific error messages with card index
- Prevents malformed data from reaching the database

## Benefits

1. **Diverse Learning**: Different question types test different cognitive skills
2. **Better Retention**: Variety keeps study sessions engaging
3. **Comprehensive Coverage**: AI automatically generates a balanced mix
4. **User Control**: Users can edit any generated card before saving
5. **Production Ready**: Comprehensive validation ensures data integrity

## Usage

1. Navigate to "AI Powered Decks" page
2. Upload a document (PDF, PPT, DOCX, TXT)
3. Select number of flashcards to generate (5-20)
4. Review generated cards with mixed question types
5. Edit any card if needed
6. Create deck with all card types

## Technical Notes

- Card types use string enums for consistency across backend and frontend
- All validation is performed both client-side and server-side
- Color coding uses Tailwind CSS with dark mode support
- LLM prompts include explicit examples for each question type
- Cloze format follows Anki-style {{c1::text}} syntax

## Future Enhancements

- Allow users to specify preferred question type distribution
- Add image support for visual multiple choice questions
- Support for matching questions
- True/False question type
- Custom cloze formatting options
