# Quick Start Guide

Get up and running with Flash-Decks in under 10 minutes! This guide will walk you through creating your first deck, adding cards, and starting your first study session.

## Prerequisites

Make sure you've completed the [Installation Guide](./installation.md) and have Flash-Decks running:
- Frontend at `http://localhost:5173`
- Backend at `http://localhost:8000`

## Step 1: Create an Account

1. **Navigate to the application**
   - Open `http://localhost:5173` in your browser

2. **Click "Get Started" or "Sign Up"**
   - You'll be redirected to the signup page

3. **Fill in your details**
   ```
   Email: your.email@example.com
   Password: YourSecurePassword123!
   Full Name: Your Name
   ```

4. **Click "Sign Up"**
   - You'll be automatically logged in and redirected to the dashboard

## Step 2: Explore the Dashboard

You should now see the main dashboard with several sections:

### Navigation Sidebar (Left)
- **Dashboard** - Your home page with overview
- **All Decks** - Browse all available decks
- **Due for Review** - Cards that need studying
- **Pinned** - Your favorite decks

### Dashboard Views
- **Overview** - Quick stats and recommendations
- **All Decks** - Complete deck library
- **Due** - Priority review items
- **Pinned** - Favorited decks

### Top Bar
- User menu (profile, logout)
- Theme toggle (dark/light mode)

## Step 3: Create Your First Deck

1. **Click "Create Deck" button**
   - Located in the dashboard header or sidebar

2. **Fill in deck information**
   ```
   Title: Spanish Vocabulary
   Description: Essential Spanish words and phrases for beginners
   Tags: spanish, vocabulary, beginner
   Visibility: Private (or Public to share)
   ```

3. **Click "Create"**
   - Your new deck appears in the deck list

## Step 4: Add Cards to Your Deck

1. **Click on your newly created deck**
   - This opens the deck detail view

2. **Click "Add Card" button**

3. **Choose card type and add content**

### Example 1: Basic Card
```
Type: Basic
Prompt: What is "hello" in Spanish?
Answer: Hola
Explanation: A common greeting used at any time of day
```

### Example 2: Multiple Choice
```
Type: Multiple Choice
Prompt: What does "gracias" mean?
Answer: Thank you
Options:
  - Thank you
  - Please
  - Goodbye
  - Hello
Explanation: "Gracias" is used to express gratitude
```

### Example 3: Short Answer
```
Type: Short Answer
Prompt: Translate "good morning" to Spanish
Answer: buenos días
Additional Acceptable Answers: buenos dias, buen día
Explanation: Used to greet someone in the morning
```

### Example 4: Cloze Deletion
```
Type: Cloze Deletion
Prompt: The word for "water" in Spanish is {{c1::agua}}
Explanation: A feminine noun, but uses "el" when stressed: "el agua"
```

4. **Add 5-10 cards**
   - Mix different card types for variety
   - Click "Add Card" after each to add more

## Step 5: Start Your First Study Session

### Practice Mode (Recommended for beginners)

1. **From deck detail page, click "Practice"**

2. **Configure your session** (optional)
   ```
   Number of cards: 10
   Shuffle cards: Yes
   Endless mode: No
   ```

3. **Click "Start Practice"**

4. **Study the cards**
   - Read the prompt
   - Think of the answer
   - Click "Show Answer" or press spacebar
   - Check if you got it right
   - Click "Next" to continue

### Review Mode (Spaced Repetition)

1. **From deck detail page, click "Review"**
   - Only shows cards that are due for review

2. **Study and grade yourself**
   - See the question
   - Try to recall the answer
   - Click "Show Answer"
   - Rate your recall quality:
     - **0**: Complete blackout
     - **1**: Incorrect, but familiar
     - **2**: Incorrect, but almost got it
     - **3**: Correct with difficulty
     - **4**: Correct with some hesitation
     - **5**: Perfect recall

3. **The algorithm schedules next review**
   - Good answers → longer intervals
   - Poor answers → shorter intervals

### Exam Mode (Test yourself)

1. **From deck detail page, click "Exam"**

2. **Configure exam settings**
   ```
   Time limit: 10 minutes
   Number of questions: 10
   Card types: All
   ```

3. **Take the exam**
   - Answer all questions
   - No peeking at answers!
   - View statistics at the end

## Step 6: Track Your Progress

### Dashboard Statistics

Navigate back to the dashboard to see:

- **Total Decks**: Number of decks you've created/have access to
- **Cards Studied**: Total cards you've reviewed
- **Current Streak**: Consecutive days studying
- **Longest Streak**: Your personal best

### Activity Heatmap

- Visual representation of your study activity
- Darker colors = more study time
- Hover to see daily details

### Deck Progress Cards

Each deck shows:
- Completion percentage
- Last studied date
- Number of cards
- Quick action buttons

## Step 7: Advanced Features

### Pin Your Favorite Decks

1. **Click the pin icon** on any deck card
2. **Access pinned decks** from sidebar or "Pinned" tab
3. **Quickly start reviews** from your most-used decks

### Edit Decks and Cards

1. **Open deck detail page**
2. **Click edit icon** on deck or individual cards
3. **Make changes** and save
4. **Only owners and admins** can edit

### Browse Public Decks

1. **Navigate to "All Decks"**
2. **Toggle "Public Decks"** filter
3. **Browse community-created** content
4. **Start studying** any public deck

### Use Tags for Organization

1. **Add tags when creating decks**
   - Examples: "work", "school", "spanish", "programming"
2. **Filter by tags** in the deck browser
3. **Find related decks** easily

### Study Due Cards

1. **Check "Due for Review" section**
   - Shows decks with cards ready for review
2. **Click "Review Now"** on any deck
3. **Complete your daily reviews**
   - Recommended: Review due cards every day

### Maintain Your Streak

1. **Study at least once per day**
   - Complete any study session
2. **Watch your streak grow**
   - Displayed in dashboard stats
3. **Aim for your longest streak**
   - Challenge yourself!

## Tips for Effective Learning

### Best Practices

1. **Study consistently**: Daily 15-30 minute sessions are better than cramming
2. **Review regularly**: Always clear your due cards
3. **Be honest with grading**: Accurate ratings improve the algorithm
4. **Use multiple card types**: Variety helps retention
5. **Add context**: Use the explanation field for deeper understanding
6. **Start small**: 10-20 cards per deck initially
7. **Create your own cards**: Active creation enhances learning

### Spaced Repetition Tips

- **Grade 0-2**: You'll see the card again very soon (1 day)
- **Grade 3**: Card reappears in about a week
- **Grade 4-5**: Much longer intervals (weeks to months)
- **Don't fear failure**: Wrong answers help you learn

### Keyboard Shortcuts (Coming Soon)

- `Space`: Show answer / Next card
- `1-5`: Grade card (in review mode)
- `N`: Next card
- `E`: Edit current card
- `Esc`: Exit session

## Common Workflows

### Daily Study Routine

```
1. Open Flash-Decks
2. Check "Due for Review" count
3. Review all due cards (~15-30 minutes)
4. Optionally practice new cards
5. Check streak and stats
6. Close app with satisfaction!
```

### Creating a New Subject

```
1. Create new deck with descriptive title
2. Add 10-20 basic cards to start
3. Do initial practice session
4. Continue adding cards over time
5. Review daily as cards become due
6. Monitor progress percentage
```

### Preparing for an Exam

```
1. Create comprehensive deck
2. Add all relevant material
3. Do multiple practice sessions
4. Use exam mode to simulate test conditions
5. Review missed questions
6. Continue until confident
7. Do final review before actual exam
```

## Sample Decks to Try

### Programming Concepts
```
- "What is a closure?" → Definition and example
- "Explain Big O notation" → Time complexity concepts
- Multiple choice: "Which sorting algorithm is O(n log n)?"
```

### Language Learning
```
- Basic: "How do you say 'thank you'?" → "Merci" (French)
- Cloze: "I {{c1::am}} learning French" → "Je suis en train d'apprendre le français"
- Multiple choice: Choose correct conjugation
```

### History
```
- "When did World War II end?" → "1945"
- "Who was the first President of the USA?" → "George Washington"
- Cloze: "The Declaration of Independence was signed in {{c1::1776}}"
```

### Science
```
- "What is the chemical formula for water?" → "H₂O"
- Multiple choice: "Which planet is closest to the sun?"
- Short answer: "Name three types of rocks"
```

## Troubleshooting

### I don't see any due cards

- **Cause**: No cards have been reviewed yet, or all reviews are up to date
- **Solution**: Start a practice session to initialize the spaced repetition system

### My streak reset

- **Cause**: You didn't study for more than one full day
- **Solution**: Study at least once every 24 hours to maintain streak

### Cards appear too frequently

- **Cause**: Consistently rating cards low (0-2)
- **Solution**: Study more carefully, use explanations, rate honestly

### Cards appear too rarely

- **Cause**: Rating cards too high too soon
- **Solution**: Be more critical with grading, use 3-4 more often than 5

## Next Steps

Now that you're up and running:

1. **Learn about all features**: [Features Documentation](../features/)
2. **Understand the algorithm**: [Spaced Repetition](../features/spaced-repetition.md)
3. **Explore card types**: [Card Types Guide](../features/card-types.md)
4. **Configure settings**: [Configuration](./configuration.md)

## Resources

- [Video Tutorials](#) (Coming soon)
- [Community Decks](#) (Coming soon)
- [Study Tips Blog](#) (Coming soon)

---

**Happy learning!** Remember, consistency is key. Even 15 minutes a day will show remarkable results over time thanks to spaced repetition.
