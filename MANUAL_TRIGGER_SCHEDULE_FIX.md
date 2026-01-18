# Manual Trigger Schedule Preservation Fix

## Problem

When manually triggering a recurring transaction early, the next occurrence date was being calculated from today's date instead of the originally scheduled date. This broke the regular schedule.

### Example of the Bug

- Recurring transaction scheduled for **February 1st** (monthly)
- User manually triggers it on **January 18th**
- Bug behavior: Next occurrence set to **February 18th** (today + 1 month)
- Expected behavior: Next occurrence should be **March 1st** (scheduled date + 1 month)

## Root Cause

The `createTransactionFromRecurring` helper method was always using the `date` parameter (transaction date) to calculate the next occurrence. When manually triggered, this date was `today`, not the scheduled `nextOccurrence`.

```typescript
// OLD CODE (buggy)
let next = dayjs(date);  // date = today when manually triggered
if (r.frequency === 'monthly') next = next.add(1, 'month');
```

## Solution

Added an `isManualTrigger` parameter to distinguish between manual triggers and automatic processing:

- **Manual Trigger**: Use the scheduled `nextOccurrence` date as the base
- **Automatic Processing**: Use the transaction date (which is the `nextOccurrence` date)

```typescript
// NEW CODE (fixed)
const baseDate = isManualTrigger ? r.nextOccurrence : date;
let next = dayjs(baseDate);
if (r.frequency === 'monthly') next = next.add(1, 'month');
```

## Impact

### Before Fix
- ❌ Manual trigger disrupted the regular schedule
- ❌ Next occurrence calculated from trigger date
- ❌ User had to manually adjust the schedule after triggering

### After Fix
- ✅ Manual trigger preserves the regular schedule
- ✅ Next occurrence calculated from scheduled date
- ✅ Schedule remains consistent regardless of when triggered

## Example Scenarios

### Scenario 1: Monthly Recurring Transaction
- Scheduled for: 1st of every month
- Current next occurrence: February 1st
- User triggers on: January 18th
- Transaction created with date: January 18th
- **Next occurrence updated to: March 1st** ✅

### Scenario 2: Weekly Recurring Transaction
- Scheduled for: Every Monday
- Current next occurrence: January 27th (Monday)
- User triggers on: January 22nd (Wednesday)
- Transaction created with date: January 22nd
- **Next occurrence updated to: February 3rd (next Monday)** ✅

### Scenario 3: Automatic Processing (unchanged)
- Scheduled for: February 1st
- Cron job runs on: February 1st at 2:00 AM
- Transaction created with date: February 1st
- **Next occurrence updated to: March 1st** ✅

## Code Changes

### File: `ledgerly-api/src/recurring/recurring.service.ts`

**Modified method: `triggerRecurring`**
```typescript
await this.createTransactionFromRecurring(rec, today, true); // Pass true for manual trigger
```

**Modified method: `createTransactionFromRecurring`**
```typescript
private async createTransactionFromRecurring(
  r: RecurringTransaction, 
  date: string, 
  isManualTrigger = false  // New parameter
) {
  // ... transaction creation code ...

  // Calculate next occurrence preserving schedule for manual triggers
  const baseDate = isManualTrigger ? r.nextOccurrence : date;
  let next = dayjs(baseDate);
  if (r.frequency === 'daily') next = next.add(1, 'day');
  if (r.frequency === 'weekly') next = next.add(1, 'week');
  if (r.frequency === 'monthly') next = next.add(1, 'month');
  if (r.frequency === 'yearly') next = next.add(1, 'year');

  await this.recRepo.update(r.id, {
    nextOccurrence: next.format('YYYY-MM-DD'),
  });
}
```

## Testing

To verify the fix works:

1. Create a monthly recurring transaction scheduled for the 1st of next month
2. Manually trigger it before the scheduled date
3. Check that the next occurrence is set to the 1st of the month after next, not 30 days from today

## Related

- Commit: (to be added)
- Issue: Manual trigger was disrupting recurring schedule
- Feature: Manual trigger for recurring transactions
