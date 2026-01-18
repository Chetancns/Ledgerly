# Fix: Column Name Case Sensitivity Issue

## Problem
Error: `QueryFailedError: column RecurringTransaction.toAccountId does not exist`

Database query shows column exists as: `toaccountid` (all lowercase)
Entity was looking for: `toAccountId` (camelCase)

## Root Cause

PostgreSQL converts unquoted column names to lowercase. When the column was added:
```sql
ALTER TABLE dbo.recurring_transactions ADD COLUMN toAccountId UUID;
```

PostgreSQL stored it as `toaccountid` (lowercase).

TypeORM was looking for the camelCase version `toAccountId` which doesn't match.

## Solution

Explicitly map the TypeScript property to the lowercase database column:

```typescript
// Before
@Column({ type: 'uuid', nullable: true })
toAccountId: string | null;

// After
@Column({ name: 'toaccountid', type: 'uuid', nullable: true })
toAccountId: string | null;
```

## Action Required

```bash
git pull
cd ledgerly-api
npm install
npm run build
npm run start:dev
```

No database changes needed - the column already exists correctly as `toaccountid`.

## How to Prevent This

When creating columns with mixed case names in PostgreSQL, use quoted identifiers:

```sql
-- This creates toaccountid (lowercase)
ALTER TABLE t ADD COLUMN toAccountId UUID;

-- This creates toAccountId (preserves case)
ALTER TABLE t ADD COLUMN "toAccountId" UUID;
```

Or in TypeORM migrations, explicitly specify the name:
```typescript
await queryRunner.addColumn('table', new TableColumn({
  name: 'toaccountid',  // Use lowercase explicitly
  type: 'uuid',
}));
```

## Status

✅ Fixed - TypeORM now correctly maps to the lowercase column name
✅ No migration needed
✅ No database changes needed
✅ Works with existing data
