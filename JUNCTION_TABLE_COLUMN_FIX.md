# Fix: Junction Table Column Names and Schema Alias Issue

## Problems

### Problem 1: Update Error
```
"dbo" alias was not found. Maybe you forgot to join it?
```

**Cause:** Using `name: 'dbo.recurring_transaction_tags'` caused TypeORM to interpret "dbo" as an alias instead of a schema.

**Fix:** Separated schema and table name:
```typescript
// Before
name: 'dbo.recurring_transaction_tags'

// After
name: 'recurring_transaction_tags',
schema: 'dbo'
```

### Problem 2: Create Error
```
column "recurringTransactionId" of relation "recurring_transaction_tags" does not exist
```

**Cause:** PostgreSQL stored junction table columns as lowercase when created with:
```sql
CREATE TABLE dbo.recurring_transaction_tags (
  recurringTransactionId UUID NOT NULL,  -- Becomes recurringtransactionid
  tagId UUID NOT NULL                     -- Becomes tagid
);
```

**Fix:** Explicitly map to lowercase column names:
```typescript
joinColumn: { name: 'recurringtransactionid', referencedColumnName: 'id' },
inverseJoinColumn: { name: 'tagid', referencedColumnName: 'id' },
```

## Complete Solution

```typescript
@ManyToMany(() => Tag, { cascade: true })
@JoinTable({
  name: 'recurring_transaction_tags',
  schema: 'dbo',
  joinColumn: { name: 'recurringtransactionid', referencedColumnName: 'id' },
  inverseJoinColumn: { name: 'tagid', referencedColumnName: 'id' },
})
tags: Tag[];
```

## Why This Happens

PostgreSQL behavior with unquoted identifiers:
1. **All unquoted identifiers are converted to lowercase**
2. Column names like `recurringTransactionId` become `recurringtransactionid`
3. TypeORM must use the exact lowercase names to query correctly

## Action Required

```bash
git pull
cd ledgerly-api
npm install
npm run build
npm run start:dev
```

No database changes needed - columns already exist in lowercase.

## Status

✅ Fixed - Both create and update operations now work
✅ Junction table columns correctly mapped
✅ Schema properly separated from table name
✅ No database migration needed

## Related Fixes

- `toAccountId` → `toaccountid` (main entity column)
- `recurringTransactionId` → `recurringtransactionid` (junction table)
- `tagId` → `tagid` (junction table)

All column mappings now match PostgreSQL's lowercase storage.
