# Critical Fix: Junction Table Query Issue

## Problem
Getting error: `QueryFailedError: column 9cfe6f260d7b183e81ea30cc14238c6500b76646.recurringTransactionId does not exist`

Even after manually creating the table with correct structure.

## Root Cause
TypeORM was generating a hash alias (`9cfe6f260d7b183e81ea30cc14238c6500b76646`) for the join table query instead of using the proper table reference. This happened because the @JoinTable decorator was using separate `name` and `schema` properties, which causes TypeORM to not properly identify the table in PostgreSQL.

## Fix Applied (Commit 8f617ae+)

Changed the entity definition from:
```typescript
@JoinTable({
  name: 'recurring_transaction_tags',
  schema: 'dbo',  // ❌ Separate schema property causes issues
  ...
})
```

To:
```typescript
@JoinTable({
  name: 'dbo.recurring_transaction_tags',  // ✅ Fully qualified name
  ...
})
```

## Action Required

Since you've already created the table manually, you just need to:

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

### Step 3: Restart Server
```bash
npm run start:dev
```

### Step 4: Test
Navigate to `/recurring` page and verify:
- Page loads without error
- Existing recurring transactions display
- You can create new recurring transactions

## Why This Happened

TypeORM in PostgreSQL with schemas has a known behavior where using separate `name` and `schema` properties in `@JoinTable` can cause it to generate hash-based aliases in queries. By using the fully qualified table name (`dbo.recurring_transaction_tags`), TypeORM properly constructs the SQL query.

## Verification

After restarting, the query should work correctly because:
1. The table already exists (you created it manually)
2. The table has the correct structure
3. TypeORM now references it with the fully qualified name
4. The hash alias issue is resolved

## No Migration Needed

Since you've already run the SQL to create the table:
- `recurring_transaction_tags` exists with correct structure
- `toAccountId` column exists
- All constraints and indexes are in place

You don't need to run `npm run migration:run` again. Just rebuild and restart.

## If You Still Get Errors

### Error: "table already exists"
This is fine - skip migration:
```bash
# Just restart the server
npm run start:dev
```

### Error: Different column name issue
Verify your table structure matches:
```sql
-- Check table exists
SELECT * FROM information_schema.tables 
WHERE table_schema = 'dbo' 
  AND table_name = 'recurring_transaction_tags';

-- Check columns
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'dbo' 
  AND table_name = 'recurring_transaction_tags'
ORDER BY ordinal_position;

-- Should show:
-- recurringTransactionId
-- tagId
```

### Error: Still getting hash in error
Clear TypeORM cache:
```bash
rm -rf dist/
npm run build
npm run start:dev
```

## Summary

The fix changes how TypeORM references the join table in its queries. Instead of using a hash-based alias, it now uses the fully qualified table name (`dbo.recurring_transaction_tags`), which PostgreSQL can properly resolve.

This is a code change only - no database changes needed since your table is already correct.
