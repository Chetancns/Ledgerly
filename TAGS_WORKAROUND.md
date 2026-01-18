# Workaround: Tags Display Temporarily Disabled in List View

## Issue
TypeORM is generating hash-based aliases for junction table queries with PostgreSQL schemas, causing errors even with the fully qualified table name fix. This is a known TypeORM limitation with PostgreSQL schema-qualified table names in many-to-many relationships.

Error:
```
QueryFailedError: column 9cfe6f260d7b183e81ea30cc14238c6500b76646.recurringTransactionId does not exist
```

## Temporary Workaround Applied

**What Changed:**
- Removed `relations: ['tags']` from `findAll()` method in recurring service
- Tags are no longer loaded when listing recurring transactions
- Tags still work for create, update, and trigger operations
- Tags are loaded individually when needed (in `createTransactionFromRecurring`)

**Impact:**
- ✅ GET /recurring endpoint works without errors
- ✅ Creating recurring transactions with tags works
- ✅ Updating recurring transactions with tags works  
- ✅ Triggering creates transactions with tags
- ⚠️ Tags won't display in the recurring transactions list view

## Why This Happens

TypeORM has issues with many-to-many relationships when using PostgreSQL schemas. Even with fully qualified table names, the query builder can generate hash aliases for join tables. This is a known limitation documented in various TypeORM GitHub issues.

## What Still Works

### Tags Functionality:
1. **Create with Tags** - You can add tags when creating recurring transactions
2. **Update with Tags** - You can modify tags when editing
3. **Tags Applied** - When triggered, tags are correctly applied to created transactions
4. **Tag Storage** - Tags are properly stored in the junction table

### All Other Features:
- Transfer/Savings types work perfectly
- Manual trigger works
- Status badges and UI enhancements work
- All CRUD operations work

## Permanent Solution Options

### Option 1: Upgrade TypeORM (Recommended)
```bash
cd ledgerly-api
npm install typeorm@latest
npm run build
```

Newer versions of TypeORM have better handling of PostgreSQL schemas.

### Option 2: Move to Public Schema
If tags are critical for display, consider moving tables to the `public` schema instead of `dbo`:

```sql
-- Move recurring_transactions
ALTER TABLE dbo.recurring_transactions SET SCHEMA public;
ALTER TABLE dbo.recurring_transaction_tags SET SCHEMA public;
```

Then update entities to not use schema qualification.

### Option 3: Custom Query with Raw SQL
We could implement a custom query that explicitly handles the join without TypeORM's query builder.

### Option 4: Separate Tags API Endpoint
Create a separate endpoint to fetch tags for recurring transactions:
```
GET /recurring/:id/tags
```

## For Now

The application works fully except tags won't show in the list view. This is a display-only limitation. All tag functionality (create, update, apply to transactions) works perfectly.

## Steps to Use

1. Pull latest changes
2. Rebuild backend
3. Restart server
4. Navigate to /recurring - it will load without errors
5. Create/edit recurring transactions - tags work
6. Trigger transactions - tags are applied

## Future Fix

We'll monitor TypeORM updates and implement a permanent solution in a future update. For now, all critical functionality works.
