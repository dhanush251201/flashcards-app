# Streak System

Track your daily study consistency with the streak system.

## How It Works

**Streak** = Consecutive days with at least one completed study session

### Tracking

- **Current Streak:** Your ongoing consecutive days
- **Longest Streak:** Your personal record
- **Last Activity:** Date of last study session

### Updating

Streak updates when you **complete** (not just start) a study session:

1. Complete any study session (review, practice, or exam)
2. Backend checks `last_activity_date`
3. Streak logic:
   - **First activity ever:** `current_streak = 1`
   - **Already studied today:** No change
   - **Studied yesterday:** `current_streak += 1`
   - **Missed days:** Reset to 1
4. Update `longest_streak` if current exceeds it

### Grace Period

- Study anytime **today** or **yesterday** to maintain streak
- No strict time-of-day requirement
- Timezone: UTC (consider user timezone in future)

## Best Practices

✅ **Do:**
- Study daily, even 10 minutes
- Complete at least one session
- Track your longest streak
- Celebrate milestones

❌ **Don't:**
- Stress if you miss a day
- Focus only on streak
- Sacrifice quality for quantity

## Further Reading

- [Quick Start](../getting-started/quick-start.md)
- [Study Modes](./study-modes.md)
- [Backend Implementation](../architecture/backend-architecture.md)
