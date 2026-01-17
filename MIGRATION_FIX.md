# Migration Fix Summary

## Issue
The database query was failing with the error:
```
QueryFailedError: column 9cfe6f260d7b183e81ea30cc14238c6500b76646.recurringTransactionId does not exist
```

## Root Cause
The migration was creating the `recurring_transaction_tags` junction table incorrectly:

**Incorrect approach:**
```typescript
columns: [
  {
    name: 'recurringTransactionId',
    type: 'uuid',
    isPrimary: true,  // ❌ Wrong - creates separate primary keys
  },
  {
    name: 'tagId',
    type: 'uuid',
    isPrimary: true,  // ❌ Wrong
  },
]
```

This caused TypeORM to generate incorrect table structures that didn't match the entity definition.

## Solution
Updated the migration to follow the same pattern used by the existing `transaction_tags` table:

**Correct approach:**
```typescript
// 1. Create table with non-nullable columns (NOT isPrimary)
columns: [
  {
    name: 'recurringTransactionId',
    type: 'uuid',
    isNullable: false,  // ✅ Correct
  },
  {
    name: 'tagId',
    type: 'uuid',
    isNullable: false,  // ✅ Correct
  },
]

// 2. Add composite primary key via SQL
await queryRunner.query(
  `ALTER TABLE "dbo"."recurring_transaction_tags" ADD CONSTRAINT "PK_recurring_transaction_tags" PRIMARY KEY ("recurringTransactionId", "tagId")`,
);

// 3. Add indexes for foreign keys
await queryRunner.createIndex(
  'dbo.recurring_transaction_tags',
  new TableIndex({
    name: 'IDX_RECURRING_TRANSACTION_TAGS_RECURRING_ID',
    columnNames: ['recurringTransactionId'],
  }),
);

await queryRunner.createIndex(
  'dbo.recurring_transaction_tags',
  new TableIndex({
    name: 'IDX_RECURRING_TRANSACTION_TAGS_TAG_ID',
    columnNames: ['tagId'],
  }),
);

// 4. Add foreign key constraints
// (unchanged)
```

## Changes Made
- Updated `1737079200000-AddRecurringTransactionImprovements.ts` migration
- Added import for `TableIndex` from typeorm
- Changed columns from `isPrimary: true` to `isNullable: false`
- Added composite primary key constraint
- Added indexes on both foreign key columns
- Updated `down()` method to use `dropTable(..., true)` for proper cleanup

## Testing
After this fix:
1. The migration compiles successfully
2. The backend builds without errors
3. The junction table structure matches TypeORM's expectations
4. The `GET /recurring` endpoint should work correctly

## Migration Instructions
Users who already ran the old migration should:

1. **Revert the old migration:**
```bash
cd ledgerly-api
npm run migration:revert
```

2. **Pull latest changes:**
```bash
git pull
```

3. **Rebuild:**
```bash
npm run build
```

4. **Run the corrected migration:**
```bash
npm run migration:run
```

Alternatively, manually drop the table and re-run:
```sql
DROP TABLE IF EXISTS "dbo"."recurring_transaction_tags";
```

Then run `npm run migration:run`.

## Prevention
Future junction tables should follow this pattern:
- Use `isNullable: false` instead of `isPrimary: true`
- Add composite primary key via SQL query
- Add indexes on foreign key columns
- Reference existing junction tables (like `transaction_tags`) as examples

## Commit
Fixed in commit: `3f10daa`
