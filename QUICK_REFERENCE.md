# AI Deck Generation - Quick Reference

## 🚀 Quick Start

### Generate Cards
```bash
curl -X POST http://localhost:8000/api/v1/ai-decks/generate-from-file \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf" \
  -F "num_cards=10"
```

### Create Deck
```bash
curl -X POST http://localhost:8000/api/v1/ai-decks/create-deck \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Deck","cards":[...]}'
```

---

## 📋 Question Types

| Type | Description | Example |
|------|-------------|---------|
| **basic** | Simple Q&A | Q: What is Python? A: A programming language |
| **multiple_choice** | 4 options, 1 correct | Q: What is 2+2? A: 4, Options: [3,4,5,6] |
| **short_answer** | Open-ended | Q: Explain recursion A: Function calling itself |
| **cloze** | Fill-in-blank | Q: Python uses {{c1::indentation}} |

---

## ✅ Validation Rules

### All Types
- ✓ prompt and answer required
- ✓ Both must be non-empty

### Multiple Choice
- ✓ At least 2 options
- ✓ Answer in options
- ✓ Options unique

### Cloze
- ✓ Contains `{{c1::...}}`
- ✓ Has cloze_data.blanks
- ✓ Blanks match prompt

---

## 🎨 Color Codes

- 🔵 **Blue** - Basic
- 🟢 **Green** - Multiple Choice
- 🟣 **Purple** - Short Answer
- 🟠 **Orange** - Cloze

---

## ⚙️ Configuration

### OpenAI (Fast, Paid)
Settings → OpenAI API Key → Preference: "openai"
- Speed: ~30s
- Cost: ~$0.01-0.05/deck

### Ollama (Slow, Free)
Install Ollama → `ollama serve` → Preference: "ollama"
- Speed: ~2-5min
- Cost: $0

---

## 📊 Limits

| Limit | Value |
|-------|-------|
| Min cards | 5 |
| Max cards | 20 |
| Max file size | 10 MB |
| Max content | 10,000 chars |
| Timeout (Ollama) | 5 minutes |
| Timeout (OpenAI) | 2 minutes |

---

## 🧪 Testing

### Run All Tests
```bash
cd backend
pytest tests/test_ai_decks.py -v
```

### Run Specific Tests
```bash
pytest tests/test_ai_decks.py::TestLLMServiceValidation -v
```

### With Coverage
```bash
pytest tests/test_ai_decks.py --cov=app.services.llm_service
```

---

## 🐛 Troubleshooting

| Error | Solution |
|-------|----------|
| Timeout | Use shorter document or OpenAI |
| No valid cards | Check logs for validation errors |
| Ollama unavailable | Run `ollama serve` |
| Invalid JSON | Check LLM response in logs |

### Check Logs
```bash
docker logs flashdecks-backend --tail 50
```

### Check Ollama Status
```bash
curl http://localhost:8000/api/v1/ai-decks/ollama/status
```

---

## 📖 Documentation

| Doc | Purpose |
|-----|---------|
| [AI_FLASHCARD_TYPES.md](AI_FLASHCARD_TYPES.md) | Feature details |
| [API_DOCUMENTATION_AI_DECKS.md](API_DOCUMENTATION_AI_DECKS.md) | API reference |
| [TEST_GUIDE.md](TEST_GUIDE.md) | Testing guide |
| [FIXES_APPLIED.md](FIXES_APPLIED.md) | Recent fixes |
| [AI_DECK_GENERATION_SUMMARY.md](AI_DECK_GENERATION_SUMMARY.md) | Complete summary |

---

## 🔑 Key Files

| File | Purpose |
|------|---------|
| `backend/app/services/llm_service.py` | Core generation |
| `backend/app/api/routes/ai_decks.py` | API endpoints |
| `backend/tests/test_ai_decks.py` | Test cases |
| `frontend/src/pages/AIPoweredDecksPage.tsx` | UI |
| `frontend/src/types/api.ts` | TypeScript types |

---

## 💡 Tips

1. **Start small**: Test with 5 cards first
2. **Use good content**: Well-formatted documents work best
3. **Review cards**: Always check before creating deck
4. **OpenAI for quality**: Better results, faster
5. **Ollama for privacy**: Free and runs locally

---

## ⚡ Status

✅ **Production Ready**
- 4 question types
- 60+ tests passing
- Full documentation
- Bug-free

---

**Need help?** See [AI_DECK_GENERATION_SUMMARY.md](AI_DECK_GENERATION_SUMMARY.md)
