# Recurring Transaction Improvements - Visual Testing Guide

## Prerequisites
1. Ensure you have the database running and migrations applied
2. Create at least two accounts (e.g., "Checking" and "Savings")
3. Create some categories
4. Create some tags (optional)

## Test Scenario 1: Create a Recurring Transfer

### Steps:
1. Navigate to `/recurring` page
2. Click "+ Add Recurring" button
3. Fill out the form:
   - **Type**: Select "Transfer" 
   - **From Account**: Select "Checking"
   - **To Account**: Select "Savings" (this field should appear after selecting Transfer)
   - **Category**: Select a category
   - **Frequency**: Select "Monthly"
   - **Amount**: Enter "500"
   - **Next Occurrence**: Select a future date
   - **Description**: Enter "Monthly savings transfer"
   - **Tags**: Add 1-2 tags (optional)
4. Click "Add"

### Expected Results:
- Success toast appears: "Recurring transaction added!"
- Modal closes
- New recurring transfer appears in the list
- The card shows:
  - Description and amount
  - Type: "transfer" in blue color
  - Frequency: "monthly"
  - Status: "active" in green
  - From Account: "Checking"
  - To Account: "Savings"
  - Tags as colored chips (if added)

## Test Scenario 2: Trigger a Recurring Transaction Early

### Steps:
1. Find a recurring transaction in the list
2. Click the lightning bolt (⚡) icon button
3. Confirm in the modal by clicking "Trigger Now"

### Expected Results:
- Success toast appears: "Recurring transaction triggered successfully!"
- A new transaction is created (check in Transactions page)
- The "Next Occurrence" date is updated to the next period
- For transfers, both account balances are updated correctly
- Tags are carried over to the created transaction

## Test Scenario 3: Create Recurring Expense with Tags

### Steps:
1. Click "+ Add Recurring"
2. Fill out the form:
   - **Type**: Select "Expense" (default)
   - **Account**: Select an account
   - **Category**: Select a category
   - **Frequency**: Select "Weekly"
   - **Amount**: Enter "50"
   - **Next Occurrence**: Select a date
   - **Description**: Enter "Weekly groceries"
   - **Tags**: Add multiple tags (e.g., "Food", "Essential")
4. Click "Add"

### Expected Results:
- Recurring expense is created
- Tags appear as colored chips in the transaction card
- All tags are visible and correctly colored

## Test Scenario 4: Edit a Recurring Transaction

### Steps:
1. Find a recurring transaction
2. Click the edit (✏️) button
3. Change:
   - Type from "expense" to "transfer" (should show To Account field)
   - Add a To Account
   - Add or remove tags
4. Click "Update"

### Expected Results:
- Success toast appears: "Recurring transaction updated!"
- Changes are reflected in the card
- If changed to transfer, "To Account" is displayed
- Tag changes are reflected

## Test Scenario 5: Pause and Resume

### Steps:
1. Find an active recurring transaction
2. Click the pause (⏸️) icon
3. Confirm
4. Verify status changes to "paused" (yellow color)
5. Click the play (▶️) icon
6. Confirm
7. Verify status changes back to "active" (green color)

### Expected Results:
- Status toggles correctly
- Colors update appropriately
- Paused transactions won't be processed by the cron job

## UI Elements to Verify

### Modal Form:
- [ ] Type selector appears first
- [ ] "To Account" field only shows when Transfer/Savings is selected
- [ ] All fields are properly styled
- [ ] Tags input works correctly (search, select, remove)
- [ ] Validation messages appear for required fields

### Transaction Cards:
- [ ] All information displays correctly
- [ ] Tags appear as colored chips
- [ ] Type colors are appropriate (green/red/blue)
- [ ] Status colors are correct (green for active, yellow for paused)
- [ ] Action buttons are clearly visible
- [ ] Hover effects work

### Action Buttons:
- [ ] Edit (✏️) - blue/primary color
- [ ] Trigger (⚡) - yellow/warning color
- [ ] Pause/Resume (⏸️/▶️) - info color
- [ ] Delete (🗑️) - red/error color

## Backend API Testing

### Create Recurring Transfer:
```bash
curl -X POST http://localhost:3001/recurring \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "transfer",
    "accountId": "from-account-uuid",
    "toAccountId": "to-account-uuid",
    "categoryId": "category-uuid",
    "amount": "500",
    "frequency": "monthly",
    "nextOccurrence": "2026-02-01",
    "description": "Monthly savings",
    "tagIds": ["tag-uuid-1", "tag-uuid-2"]
  }'
```

### Trigger Recurring:
```bash
curl -X POST http://localhost:3001/recurring/:id/trigger \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get All Recurring (with tags):
```bash
curl -X GET http://localhost:3001/recurring \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Migration Testing

### Run migration:
```bash
cd ledgerly-api
npm run migration:run
```

### Verify database changes:
```sql
-- Check new column
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'dbo' 
  AND table_name = 'recurring_transactions' 
  AND column_name = 'toAccountId';

-- Check junction table
SELECT * FROM information_schema.tables 
WHERE table_schema = 'dbo' 
  AND table_name = 'recurring_transaction_tags';

-- Check foreign keys
SELECT constraint_name, table_name 
FROM information_schema.table_constraints 
WHERE table_schema = 'dbo' 
  AND table_name = 'recurring_transaction_tags' 
  AND constraint_type = 'FOREIGN KEY';
```

## Edge Cases to Test

1. **Transfer without destination**: Try to create transfer without selecting To Account - should show error
2. **Invalid tags**: Try to submit with non-existent tag IDs - should fail with proper error
3. **Trigger paused transaction**: Try to trigger a paused transaction - should fail
4. **Date handling**: Test with various date formats and timezones
5. **Empty tags**: Create recurring with no tags, then add tags via edit
6. **Remove all tags**: Edit a recurring transaction and remove all tags

## Performance Testing

1. Create multiple recurring transactions (20+)
2. Verify page loads quickly
3. Test searching/filtering if available
4. Verify tag loading is efficient

## Accessibility Testing

- [ ] All buttons have proper titles/labels
- [ ] Form inputs have proper labels
- [ ] Color contrast is sufficient
- [ ] Keyboard navigation works
- [ ] Screen reader friendly

## Browser Testing

Test on:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers
