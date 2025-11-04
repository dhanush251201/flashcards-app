# Deck Management

Comprehensive guide to creating, organizing, and managing flashcard decks in Flash-Decks.

## Creating Decks

**Endpoint:** `POST /api/v1/decks`

**Required Fields:**
- `title` (string, 1-255 chars)
- `is_public` (boolean)

**Optional Fields:**
- `description` (text)
- `tags` (array of strings)

**Example:**
```json
{
  "title": "Spanish Vocabulary - Beginner",
  "description": "Essential Spanish words and phrases for beginners",
  "is_public": true,
  "tags": ["spanish", "vocabulary", "beginner"]
}
```

## Public vs Private Decks

### Public Decks

- **Visible to everyone**
- **Searchable** in deck browser
- **Shareable** via URL
- Anyone can study (but not edit)
- Great for community contribution

### Private Decks

- **Only visible to owner**
- Not searchable
- Personal study material
- Secure and private
- Can be made public later

## Tags

Tags help organize and discover decks.

**Features:**
- Multiple tags per deck
- Auto-created on first use
- Shared across all decks
- Searchable and filterable

**Best Practices:**
- Use 2-5 tags per deck
- Be specific ("spanish-verbs" not just "spanish")
- Use consistent naming
- Include difficulty level

## Further Reading

- [Quick Start Guide](../getting-started/quick-start.md)
- [API: Deck Endpoints](../api/deck-endpoints.md)
