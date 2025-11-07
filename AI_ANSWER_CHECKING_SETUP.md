# AI Answer Checking Setup Guide

The AI answer checking feature uses LLM (Language Learning Model) to semantically evaluate SHORT_ANSWER and CLOZE question types. This provides intelligent feedback instead of exact string matching.

## Prerequisites

You need **either** OpenAI API or Ollama running to use AI answer checking.

### Option 1: OpenAI (Recommended for Testing)

1. **Get an OpenAI API Key**:
   - Go to https://platform.openai.com/api-keys
   - Create a new API key
   - Copy the key (starts with `sk-...`)

2. **Configure in the App**:
   - Log into your flashcard application
   - Go to **Settings** (usually in the user menu)
   - Paste your OpenAI API key
   - Set LLM Provider Preference to "OpenAI"
   - Click Save

3. **Test It**:
   - Create or open a deck with SHORT_ANSWER or CLOZE questions
   - Start a **Practice** or **Exam** mode session (NOT Review mode)
   - Answer a question with different wording than the expected answer
   - You should see:
     - Purple "⚡ AI Generated" badge
     - Intelligent feedback about your answer

### Option 2: Ollama (Free, Local)

1. **Install Ollama**:
   ```bash
   # macOS
   brew install ollama

   # Or download from https://ollama.com
   ```

2. **Pull the Model**:
   ```bash
   ollama pull deepseek-r1:14b
   ```

3. **Run Ollama**:
   ```bash
   ollama serve
   ```
   Keep this running in a terminal window.

4. **Configure in the App**:
   - Go to Settings
   - Set LLM Provider Preference to "Ollama"
   - Click Save

5. **Test It**: Same as OpenAI testing above

## Important Notes

### Modes That Use AI Checking:
- ✅ **Practice Mode** - Uses AI checking for SHORT_ANSWER and CLOZE
- ✅ **Exam Mode** - Uses AI checking for SHORT_ANSWER and CLOZE
- ❌ **Review Mode** - Does NOT use auto-grading or AI checking

### Question Types:
- ✅ **SHORT_ANSWER** - Uses AI checking
- ✅ **CLOZE** (fill-in-the-blank) - Uses AI checking
- ❌ **MULTIPLE_CHOICE** - Uses exact matching (AI not needed)
- ❌ **BASIC** - No auto-grading

### Fallback Behavior:
If AI checking is unavailable (no API key, Ollama not running, or API error):
- The system **automatically falls back** to exact string matching
- You'll see the gray "✓ Exact Match" badge
- Everything still works, just without semantic understanding

## Troubleshooting

### I'm only seeing "Exact Match" badges

**Check the following**:

1. **Verify your session mode**:
   - AI checking only works in **Practice** or **Exam** mode
   - NOT in Review mode

2. **Check your question type**:
   - Must be SHORT_ANSWER or CLOZE
   - MULTIPLE_CHOICE doesn't use AI

3. **Verify LLM configuration**:
   - For OpenAI: Check that your API key is saved in Settings
   - For Ollama: Make sure `ollama serve` is running

4. **Check backend logs**:
   ```bash
   docker logs flashdecks-backend --tail 100 | grep -i "llm\|checking"
   ```

   You should see lines like:
   ```
   record_answer: session mode=practice, card type=short_answer
   Attempting LLM check for short_answer
   Calling LLM service to check answer. User has OpenAI key: True
   Checking answer using OpenAI
   ```

### API Key Not Working

1. Make sure the API key is valid and has credits
2. Check OpenAI's status page: https://status.openai.com
3. Try removing and re-adding the API key in Settings

### Ollama Not Working

1. Verify Ollama is running: `curl http://localhost:11434/api/tags`
2. Make sure the model is pulled: `ollama list`
3. Check Docker can access host: The backend uses `http://host.docker.internal:11434`

## Example Workflow

Here's a complete test scenario:

1. **Setup OpenAI** (or Ollama)
2. **Create a test deck** with a SHORT_ANSWER question:
   - Question: "What is the capital of France?"
   - Answer: "Paris"

3. **Start Practice mode** on this deck

4. **Submit various answers**:
   - "Paris" → ✅ Correct (exact match)
   - "paris" → ✅ Correct (case insensitive)
   - "The capital of France is Paris" → ✅ Correct with AI! (semantic match)
   - "London" → ❌ Incorrect with explanation from AI

5. **Observe the badges**:
   - If AI is working: Purple "⚡ AI Generated" badge
   - If falling back: Gray "✓ Exact Match" badge

## Cost Considerations

### OpenAI:
- Uses `gpt-4o-mini` model
- Very cheap: ~$0.15 per 1M input tokens
- Each answer check uses ~100-200 tokens
- **Estimated cost**: $0.00002 per answer check
- 1000 answer checks ≈ $0.02

### Ollama:
- Completely free
- Runs locally on your machine
- Uses more CPU/RAM
- Slower than OpenAI but no API costs

## Developer Notes

### Debugging Logs

The backend now has comprehensive logging. After restarting the backend, check logs:

```bash
# Check all LLM activity
docker logs flashdecks-backend -f | grep -i "llm\|checking\|answer"

# Check for a specific session
docker logs flashdecks-backend | grep "session mode"
```

### Testing Without Real API

For development, you can mock the LLM service or test with Ollama locally to avoid API costs.
