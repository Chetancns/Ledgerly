# Fix: Empty String to UUID Conversion Error

## Problem
Error when creating recurring transactions:
```
QueryFailedError: invalid input syntax for type uuid: ""
```

## Root Cause

When creating a recurring transaction that is NOT a transfer (expense or income), the frontend sends an empty string `""` for the `toAccountId` field instead of `null` or `undefined`.

PostgreSQL cannot convert an empty string to UUID type, causing the error.

## Solution

Added transformation in the service layer to convert empty strings to `null` for UUID fields:

```typescript
// In create method
const toAccountId = data.toAccountId === '' ? null : data.toAccountId;
const rec = this.recRepo.create({ ...recData, toAccountId, tags });

// In update method
const toAccountId = data.toAccountId === '' ? null : data.toAccountId;
Object.assign(rec, { ...recData, toAccountId });
```

## Why This Happens

**Frontend Behavior:**
- When the "To Account" select field is not shown (for expense/income types), it may send an empty string
- Or when the select field is cleared, it sends `""` instead of `null`

**Database Requirement:**
- PostgreSQL UUID columns cannot accept empty strings
- They require either a valid UUID or `NULL`

**Our Fix:**
- Transform empty strings to `null` in the service layer
- This works for both create and update operations
- Handles all transaction types gracefully

## Action Required

```bash
git pull
cd ledgerly-api
npm install
npm run build
npm run start:dev
```

## Testing

After the fix, you can:
1. ✅ Create expense transactions (no toAccountId needed)
2. ✅ Create income transactions (no toAccountId needed)
3. ✅ Create transfer transactions (with toAccountId)
4. ✅ Create savings transactions (with toAccountId)
5. ✅ Update any transaction type
6. ✅ Clear the "To Account" field when editing

All operations will work without UUID conversion errors.

## Status

✅ Fixed - Empty strings automatically converted to null
✅ Works for both create and update operations
✅ Handles all transaction types
✅ No database changes needed
✅ No frontend changes needed
