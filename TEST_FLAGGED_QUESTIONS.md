# Flagged Questions Feature - Test Plan

## ✅ Fixed Issues
1. **Card count** - Now shows correct number of flagged cards (e.g., "Card 1 of 3" instead of "Card 1 of 10")
2. **Early exit** - Quiz no longer exits early, properly handles all flagged cards
3. **Flagged status display** - Cards are now properly shown as flagged in the quiz with yellow highlight
4. **Header title** - Shows "FLAGGED QUESTIONS" when in flagged-only mode
5. **Backend Row object errors** - Fixed SQLModel queries to use `.scalars()` instead of `.exec()` to return proper model objects
6. **Unflagging navigation** - Unflagging a card no longer causes automatic navigation to next card. Cards remain in session even when unflagged.

## Test Steps

### 1. Flag Some Questions
1. Go to any deck
2. Start a quiz (any mode)
3. Click the "Flag" button (should turn yellow and say "Flagged")
4. Flag at least 2-3 different questions
5. Finish or exit the quiz

### 2. View Flagged Questions Section
1. Go back to the deck detail page
2. You should see:
   - A yellow "Flagged Questions" button in the study modes
   - A "Flagged Questions" section below showing all flagged cards
3. Verify the count matches (e.g., "Review 3 flagged questions")

### 3. Start Flagged Questions Quiz
1. Click "Start review" on the Flagged Questions button
2. Verify:
   - Header says "FLAGGED QUESTIONS"
   - Card counter shows correct total (e.g., "Card 1 of 3")
   - Only your flagged questions appear
   - Flag button shows as "Flagged" (yellow) for each card

### 4. Test Unflagging
1. During the flagged quiz, click the flag button to unflag
2. Note which card you unflagged
3. Finish or exit the quiz
4. Go back to deck detail
5. Verify:
   - Flagged count decreased
   - The unflagged card is no longer in the section

### 5. Test Persistence
1. Flag a question in a normal quiz
2. Answer the question (correctly or incorrectly)
3. Go back to deck detail
4. Verify the question is still flagged (answering doesn't auto-unflag)

## Expected Behavior

✅ Flagging is **manual only** - cards stay flagged until explicitly unflagged
✅ Card count in quiz matches number of flagged cards
✅ Quiz doesn't exit early
✅ Flagged status is visible with yellow highlight
✅ "FLAGGED QUESTIONS" appears in header when in flagged mode
✅ Can flag/unflag from both quiz sessions and deck detail page
✅ Flagged section only shows when there are flagged cards

## Bug Fixes Applied

### Issue 1: Card Count
**Problem:** Showed "Card 1 of 10" instead of "Card 1 of 3"
**Fix:** Added useEffect to filter and shuffle only flagged cards when in flagged-only mode

### Issue 2: Early Exit
**Problem:** Quiz exited when there were more flagged questions
**Fix:** Properly populated shuffledCards with filtered flagged cards, so the cards array has correct length

### Issue 3: Flagged Status Not Shown
**Problem:** Cards didn't appear flagged in the quiz
**Fix:** The flag button now correctly reflects the flagged state because flaggedCardIds is properly loaded and synced

### Issue 4: Header Title
**Problem:** Didn't show it was a flagged quiz
**Fix:** Added check for `isFlaggedOnly` to display "FLAGGED QUESTIONS" in header

### Issue 5: Backend Row Object Errors
**Problem:** SQLModel queries returning Row tuples instead of model objects, causing AttributeError
**Fix:** Changed from `db.exec(select(Model))` to `db.scalars(select(Model))` throughout flagged_cards service
**Files**: `backend/app/services/flagged_cards.py`

### Issue 6: Unflagging Causes Navigation
**Problem:** Unflagging a card in flagged-only quiz caused automatic jump to next card
**Root Cause:** The `cards` useMemo depended on `flaggedCardIds`, so when unflagging updated that state, it re-filtered the array, removing the card and shifting indices
**Fix:**
- Added `initialFlaggedCardIds` state to store flagged cards at session start
- Changed cards filtering to use `initialFlaggedCardIds` (immutable during session)
- `flaggedCardIds` still updates for UI display, but doesn't affect the cards array
- Cards remain in the session even when unflagged, user must click "Next" to navigate
**Files**: `frontend/src/pages/StudySessionPage.tsx`
