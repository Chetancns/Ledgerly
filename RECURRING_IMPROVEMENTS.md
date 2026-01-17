# Recurring Transaction Improvements

## Overview
This implementation adds three major improvements to the recurring transactions feature:

1. **Transfer and Savings Support** - Create recurring transfers between accounts
2. **Tags Support** - Add tags to recurring transactions
3. **Manual Trigger** - Trigger recurring transactions early (before scheduled date)

## Database Changes

### Migration: AddRecurringTransactionImprovements
- **New Column**: `toAccountId` (uuid, nullable) - Destination account for transfers/savings
- **New Table**: `recurring_transaction_tags` - Junction table for many-to-many relationship with tags

To run the migration:
```bash
cd ledgerly-api
npm run migration:run
```

## Backend API Changes

### Entity Updates
**File**: `ledgerly-api/src/recurring/recurring.entity.ts`
- Added `toAccountId` field for transfer/savings destination
- Added many-to-many relationship with `Tag` entity
- Type now supports: `'expense' | 'income' | 'transfer' | 'savings'`

### Service Updates
**File**: `ledgerly-api/src/recurring/recurring.service.ts`
- Enhanced `create()` to handle tags via `tagIds` array
- Enhanced `update()` to handle tags updates
- Updated `processDue()` to include tags when creating transactions
- Added `triggerRecurring()` method for manual trigger
- Added private helper `createTransactionFromRecurring()` to reduce code duplication

### Controller Updates
**File**: `ledgerly-api/src/recurring/recurring.controller.ts`
- Added `POST /recurring/:id/trigger` endpoint for manual triggering

## Frontend Changes

### Model Updates
**File**: `ledgerly_app/src/models/recurring.ts`
- Updated `TxType` to include `'transfer' | 'savings'`
- Added optional `toAccountId` field
- Added optional `tags` and `tagIds` fields

### Service Updates
**File**: `ledgerly_app/src/services/recurring.ts`
- Added `triggerRecurring(id: string)` function

### UI Updates
**File**: `ledgerly_app/src/pages/recurring.tsx`

#### Form Enhancements:
1. **Type Selector** - Now includes Expense, Income, Transfer, and Savings
2. **Conditional To Account** - Shows "To Account" dropdown when Transfer/Savings is selected
3. **Tags Input** - Added TagInput component for selecting tags
4. **Reordered Fields** - Type appears first for better UX

#### Display Enhancements:
1. **Tags Display** - Shows colored tag chips for each recurring transaction
2. **To Account Display** - Shows destination account for transfers/savings
3. **Type Color Coding** - Different colors for income (green), expense (red), transfer/savings (blue)
4. **Trigger Button** - New lightning bolt icon button to trigger transaction early

#### Validation:
- Ensures destination account is selected for transfer/savings types
- All existing validations remain in place

## How to Test

### 1. Start the Application
```bash
# Terminal 1 - Backend
cd ledgerly-api
npm run start:dev

# Terminal 2 - Frontend  
cd ledgerly_app
npm run dev
```

### 2. Test Creating a Recurring Transfer
1. Navigate to the Recurring page
2. Click "+ Add Recurring"
3. Select Type: "Transfer"
4. Select From Account (e.g., "Checking")
5. Select To Account (e.g., "Savings")
6. Select Category
7. Enter Amount, Frequency, Next Occurrence
8. Add description
9. Click "Add"

### 3. Test Adding Tags
1. Create or edit a recurring transaction
2. In the Tags field, start typing to search for tags
3. Click on tags to add them
4. Click "Add" or "Update"
5. Verify tags appear as colored chips in the transaction list

### 4. Test Manual Trigger
1. Find a recurring transaction in the list
2. Click the lightning bolt (⚡) icon
3. Confirm in the modal dialog
4. Verify:
   - A new transaction is created in the transactions page
   - The "Next Occurrence" date is updated to the next period
   - For transfers, both accounts are updated correctly
   - Tags are included in the created transaction

### 5. Test Automatic Processing (Cron Job)
The cron job runs at 2:00 AM daily. To test:
1. Create a recurring transaction with Next Occurrence = today's date
2. Wait for cron or manually trigger via the service method
3. Verify transaction is created and next occurrence is bumped

## API Examples

### Create Recurring Transfer with Tags
```http
POST /recurring
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "type": "transfer",
  "accountId": "from-account-uuid",
  "toAccountId": "to-account-uuid",
  "categoryId": "category-uuid",
  "amount": "500",
  "frequency": "monthly",
  "nextOccurrence": "2026-02-01",
  "description": "Monthly savings transfer",
  "tagIds": ["tag-uuid-1", "tag-uuid-2"]
}
```

### Trigger Recurring Transaction
```http
POST /recurring/:id/trigger
Authorization: Bearer <jwt_token>
```

### Get All Recurring Transactions (with tags)
```http
GET /recurring
Authorization: Bearer <jwt_token>
```

Response includes tags:
```json
[
  {
    "id": "...",
    "type": "transfer",
    "accountId": "...",
    "toAccountId": "...",
    "categoryId": "...",
    "amount": "500",
    "frequency": "monthly",
    "nextOccurrence": "2026-02-01",
    "description": "Monthly savings transfer",
    "tags": [
      {
        "id": "...",
        "name": "Savings Goal",
        "color": "#3B82F6"
      }
    ]
  }
]
```

## Edge Cases Handled

1. **Transfer Validation**: Cannot create transfer/savings without toAccountId
2. **Tag Validation**: Throws error if tagIds don't exist or don't belong to user
3. **Paused Transactions**: Trigger endpoint checks status is "active"
4. **Transaction Creation**: Uses the same service as normal transactions to ensure consistency
5. **Date Handling**: Properly handles date formats and timezone

## Backwards Compatibility

- Existing recurring transactions (expense/income) continue to work without changes
- The `toAccountId` and `tags` fields are optional
- Default values ensure smooth migration

## Security Considerations

- All endpoints require JWT authentication
- User isolation enforced at service level
- Tag ownership validated before association
- Account ownership should be validated (if not already)

## Future Enhancements

Possible improvements for the future:
- Bulk trigger for multiple recurring transactions
- Skip next occurrence without creating transaction
- Custom occurrence dates (e.g., 1st and 15th of month)
- End date for recurring transactions
- Transaction preview before triggering
- Notification preferences for recurring transactions
