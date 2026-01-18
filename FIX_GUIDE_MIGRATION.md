# Fix Guide: toAccountId Column Missing Error

## Problem
When trying to create a recurring transaction, you're getting this error:
```
QueryFailedError: column "toAccountId" of relation "recurring_transactions" does not exist
```

## Root Cause
The database migration that adds the `toAccountId` column hasn't been run on your database yet.

## Solution

### Step 1: Pull Latest Changes
```bash
git pull origin copilot/add-transfer-and-tags-recurring
```

### Step 2: Rebuild Backend
```bash
cd ledgerly-api
npm install
npm run build
```

### Step 3: Run the Migration
```bash
# This will add the toAccountId column and create the tags junction table
npm run migration:run
```

You should see output similar to:
```
query: SELECT * FROM "dbo"."migrations" "migrations" ORDER BY "id" DESC
query: ALTER TABLE "dbo"."recurring_transactions" ADD "toAccountId" uuid
query: CREATE TABLE "dbo"."recurring_transaction_tags" (...)
Migration AddRecurringTransactionImprovements1737079200000 has been executed successfully.
```

### Step 4: Restart Backend Server
```bash
npm run start:dev
```

### Step 5: Test the Feature
1. Navigate to `/recurring` page
2. Click "+ Add Recurring"
3. Select "Transfer" or "Savings" from the Type dropdown
4. You should now see the "To Account" field appear
5. Fill in all fields and create the recurring transaction

## What the Migration Does

The migration adds:

1. **`toAccountId` column** to `recurring_transactions` table
   - Type: UUID
   - Nullable: Yes (only required for transfer/savings types)
   - Purpose: Store destination account for transfers

2. **`recurring_transaction_tags` junction table**
   - Links recurring transactions to tags
   - Composite primary key on (recurringTransactionId, tagId)
   - Indexes on both foreign keys for performance
   - Cascade delete when parent records are deleted

## Verification

After running the migration, verify it worked:

```sql
-- Check if toAccountId column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'dbo' 
  AND table_name = 'recurring_transactions' 
  AND column_name = 'toAccountId';

-- Check if junction table exists
SELECT * FROM information_schema.tables 
WHERE table_schema = 'dbo' 
  AND table_name = 'recurring_transaction_tags';
```

## Troubleshooting

### If migration fails with "column already exists"
This means you partially ran an old version of the migration. Fix it:

```bash
# Option 1: Drop the column manually
psql -U postgres -d ledgerly -c "ALTER TABLE dbo.recurring_transactions DROP COLUMN IF EXISTS \"toAccountId\";"
npm run migration:run

# Option 2: Revert and re-run
npm run migration:revert
npm run migration:run
```

### If you see "relation already exists" for the junction table
```bash
# Drop the junction table manually
psql -U postgres -d ledgerly -c "DROP TABLE IF EXISTS dbo.recurring_transaction_tags;"
npm run migration:run
```

## Features Now Available

After running the migration, you can:

✅ Create **recurring transfers** between accounts
✅ Create **recurring savings** transactions
✅ Add **tags** to recurring transactions
✅ **Manually trigger** recurring transactions early
✅ See enhanced UI with status badges (Paused, Overdue, Due Soon)

## UI Improvements Included

The recurring transaction cards now show:

- **Status Badges**: Clear indicators for Paused, Overdue, and Due Soon states
- **Border Colors**: Visual coding based on status
  - Yellow border for paused transactions
  - Red border for overdue transactions
  - Blue border for transactions due within 7 days
- **Better Layout**: Larger amount display, type badges, and emoji indicators
- **Action Buttons**: Vertical stack on the right side with colored backgrounds
- **Days Until Next**: Shows exact days remaining for upcoming transactions

## Need Help?

If you continue to have issues after following these steps, please share:
1. The full error message
2. Output from `npm run migration:run`
3. PostgreSQL version you're using
