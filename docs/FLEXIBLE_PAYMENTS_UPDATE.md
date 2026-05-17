# Flexible Payment Amounts for P2P Debts - Update Summary

## Overview
Based on user feedback, the P2P debt module has been updated to support **flexible payment amounts** instead of fixed installments. This allows users to make partial payments of any amount at any time for borrowed and lent debts.

## Key Changes

### What's Different Now

**Before:**
- All debts (institutional, borrowed, lent) required fixed installment amounts and payment frequency
- Users had to set monthly/weekly/biweekly payments

**After:**
- **Institutional debts** (loans, credit cards): Still use fixed installments and frequency
- **P2P debts** (borrowed/lent): Support flexible payments of any amount at any time
  - No installment amount required
  - No payment frequency required
  - No fixed payment schedule

### Example Use Case

**Scenario:** You borrow $100 from a friend

**Old Way:**
- Had to set installment: $25/month
- Had to set frequency: monthly
- System expected $25 payments every month

**New Way:**
- Just set total amount: $100
- Pay whatever amount whenever: $20 today, $10 next week, $30 next month, $40 later
- Complete flexibility in payment amounts and timing

## Technical Implementation

### Database Schema Changes

**Migration File:** `migrations-sql/update-debts-flexible-payments.sql`

```sql
-- Make installment fields optional for P2P debts
ALTER TABLE dbo.debts ALTER COLUMN "installmentAmount" DROP NOT NULL;
ALTER TABLE dbo.debts ALTER COLUMN frequency DROP NOT NULL;
ALTER TABLE dbo.debts ALTER COLUMN "nextDueDate" DROP NOT NULL;

-- Track payment amounts in debt_updates
ALTER TABLE dbo.debt_updates ADD amount NUMERIC(12, 2) NOT NULL DEFAULT 0;
```

### Backend Changes

**debt.entity.ts:**
```typescript
@Column('numeric', { precision: 12, scale: 2, nullable: true })
installmentAmount: string; // Optional for P2P debts

@Column({ type: 'enum', enum: ['weekly', 'biweekly', 'monthly'], nullable: true })
frequency: 'weekly' | 'biweekly' | 'monthly'; // Optional for P2P debts

@Column('date', { nullable: true })
nextDueDate: string; // Optional for P2P debts
```

**debt-update.entity.ts:**
```typescript
@Column('numeric', { precision: 12, scale: 2 })
amount: string; // Amount paid in this specific update
```

**debt.service.ts:**
```typescript
// Payment method now accepts custom amount
async payInstallment(
  debtId: string, 
  amount?: number, // <-- New parameter
  createTransaction = true, 
  categoryId?: string
)
```

**debt.controller.ts:**
```typescript
@Post(':id/pay-installment')
async payInstallment(
  @Param('id') id: string,
  @Body() body: { 
    amount?: number, // <-- New parameter
    createTransaction?: boolean; 
    categoryId?: string 
  },
)
```

### Frontend Changes

**DebtForm.tsx:**
- Installment, frequency, and term fields only shown for institutional debts
- P2P debts show a helpful note about flexible payments
- Form validation skips installment fields for P2P debts

**DebtList.tsx:**
- Payment modal shows editable amount field for P2P debts
- Amount field is read-only for institutional debts (uses fixed installment)
- "Pay Early" button hidden for P2P debts (concept doesn't apply)
- Current balance shown in payment modal for P2P debts

**Models:**
```typescript
export interface Debt {
  installmentAmount?: number; // Optional
  frequency?: Frequency; // Optional
  nextDueDate?: string; // Optional
  // ...other fields
}

export interface DebtUpdate {
  amount: number; // New field to track payment amount
  // ...other fields
}
```

## User Experience

### Creating a P2P Debt

1. Select debt type: "Borrowed" or "Lent"
2. Enter person's name (autocomplete suggestions appear)
3. Enter total amount
4. **No need to set installments or frequency**
5. Optionally create initial transaction
6. Done!

### Making a Payment

1. Click "Pay Now" on any debt card
2. **For P2P debts:** Enter custom payment amount
3. **For institutional debts:** Amount is pre-filled (fixed installment)
4. Optionally create transaction and select category
5. Confirm payment

### What Shows in Debt List

**Institutional Debts:**
- Installment amount
- Next due date
- Payment frequency
- "Pay Early" button

**P2P Debts:**
- No installment amount (if not set)
- No next due date
- No frequency
- No "Pay Early" button (only "Pay Now")

## Migration Steps

### 1. Update Database

```bash
# Option A: Using TypeORM
cd ledgerly-api
npm run migration:run

# Option B: Direct SQL
psql -U your_user -d ledgerly -f migrations-sql/update-debts-flexible-payments.sql
```

### 2. Verify Migration

```sql
-- Check that columns are nullable
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'dbo' 
  AND table_name = 'debts' 
  AND column_name IN ('installmentAmount', 'frequency', 'nextDueDate');

-- Should return is_nullable = 'YES' for all three

-- Check debt_updates has amount column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'dbo' 
  AND table_name = 'debt_updates' 
  AND column_name = 'amount';

-- Should return one row with numeric type
```

### 3. Update Existing P2P Debts (Optional)

If you already have P2P debts with fixed installments that you want to convert:

```sql
-- Clear installment fields for P2P debts to enable flexible payments
UPDATE dbo.debts 
SET 
  "installmentAmount" = NULL,
  frequency = NULL,
  "nextDueDate" = NULL
WHERE "debtType" IN ('borrowed', 'lent');
```

## Backward Compatibility

✅ **Fully backward compatible!**

- Existing institutional debts continue working exactly as before
- P2P debts created before this update will still work:
  - If they have installmentAmount set, it will be used as default payment amount
  - Users can still override with custom amounts when making payments
- No data loss or breaking changes

## API Changes

### POST /debts/:id/pay-installment

**Before:**
```json
{
  "createTransaction": true,
  "categoryId": "uuid"
}
```

**After:**
```json
{
  "amount": 50.00,  // <-- New optional parameter
  "createTransaction": true,
  "categoryId": "uuid"
}
```

**Behavior:**
- If `amount` provided: Uses that amount for payment
- If `amount` not provided and debt is institutional: Uses debt's `installmentAmount`
- If `amount` not provided and debt is P2P: Uses debt's `currentBalance` (full payment)

### POST /debts (Create Debt)

**Before:**
- Required: `installmentAmount`, `frequency`, `nextDueDate`

**After:**
- Optional for P2P debts: `installmentAmount`, `frequency`, `nextDueDate`
- Still required for institutional debts

## Testing Checklist

- [x] Create borrowed debt without installment → Works
- [x] Create lent debt without installment → Works
- [x] Make custom amount payment on P2P debt → Works
- [x] Make payment on institutional debt (fixed amount) → Works
- [x] UI hides installment fields for P2P debts → Works
- [x] UI shows editable amount in payment modal for P2P → Works
- [x] Payment history tracks correct amounts → Works
- [x] Existing institutional debts still work → Works
- [x] Database migration runs successfully → Works

## Benefits

1. **More Flexible:** Track real-world P2P lending/borrowing patterns
2. **Simpler Setup:** No need to guess installment amounts for informal debts
3. **Accurate Tracking:** Record actual payment amounts and dates
4. **Clear Separation:** Institutional vs P2P debts have appropriate workflows
5. **Better UX:** Form only shows relevant fields for each debt type

## Summary

The P2P debt module now perfectly matches real-world usage:
- **Institutional debts** = Fixed schedules (e.g., monthly car payment)
- **P2P debts** = Flexible payments (e.g., pay back a friend whenever you can)

This makes the system much more intuitive and practical for managing personal debts!
