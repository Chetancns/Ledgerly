# Debt Status Tracking and Reminder Dates - Implementation Summary

## Overview
This update adds visual differentiation between active and completed debts, and introduces reminder date functionality for P2P debts to help users track when payments should be sent or received.

## Features Implemented

### 1. Debt Status Tracking

**Automatic Status Management:**
- Debts are automatically marked as `completed` when the balance reaches zero
- Status is automatically restored to `active` when a payment is deleted and balance > 0
- No manual intervention required - the system handles status transitions

**Visual Differentiation:**

**Active Debts:**
- Normal card background and full opacity
- Standard border color
- All payment action buttons visible
- Shows remaining balance prominently

**Completed Debts:**
- Faded appearance (70% opacity)
- Green success border
- Checkmark (✅) icon next to debt name
- "Completed 🎉" label displayed
- Payment buttons hidden
- Replaced with "View History" button to see payment records

### 2. Reminder Date System

**For P2P Debts (Borrowed/Lent):**
- Optional reminder date field during debt creation
- Context-aware labeling:
  - Borrowed debts: "Payment Reminder Date" (when to send payment)
  - Lent debts: "Collection Reminder Date" (when to collect payment)
- Flexible - set any date as needed

**Overdue Detection:**
- System automatically detects when reminder date has passed
- Visual indicators for overdue reminders:
  - Warning icon (⚠️) displayed
  - "(Overdue)" text appended
  - Orange/yellow warning border on debt card
  - Color-highlighted reminder date text
- Only shown for active debts (not completed)

**Smart Display:**
- Reminder dates only shown for P2P debts (borrowed/lent)
- Not shown for institutional debts (which use nextDueDate)
- Hidden when debt is completed

## Technical Implementation

### Backend Changes

**Database Schema (debt.entity.ts):**
```typescript
@Column({ type: 'varchar', default: 'active' })
status: 'active' | 'completed';

@Column('date', { nullable: true })
reminderDate: string; // For P2P debts
```

**Service Logic (debt.service.ts):**
```typescript
// Auto-mark as completed when balance reaches zero
if (parseFloat(debt.currentBalance) <= 0) {
  debt.status = 'completed';
  debt.currentBalance = '0.00';
}

// Restore active status when payment deleted
if (debt.status === 'completed' && parseFloat(debt.currentBalance) > 0) {
  debt.status = 'active';
}
```

**Debt Creation:**
- All new debts start with status = 'active'
- reminderDate is optional, stored if provided

### Frontend Changes

**DebtForm.tsx:**
- Added reminderDate input field (conditional - only for P2P debts)
- Context-aware labels based on debt type
- Helper text explains purpose of reminder
- Included in form submission payload

**DebtList.tsx:**
```typescript
const isCompleted = debt.status === 'completed' || progress >= 100;
const isOverdue = debt.reminderDate && new Date(debt.reminderDate) < new Date() && !isCompleted;

// Card styling
style={{ 
  background: isCompleted ? "var(--bg-card-hover)" : "var(--bg-card)", 
  border: `2px solid ${isCompleted ? 'var(--color-success)' : isOverdue ? 'var(--color-warning)' : 'var(--border-primary)'}`,
  opacity: isCompleted ? 0.7 : 1
}}
```

**UI Elements:**
- Conditional rendering of payment buttons based on status
- Completed debts show "View History" instead of payment actions
- Reminder dates displayed with overdue warnings

**Model Updates (debt.ts):**
```typescript
export interface Debt {
  // ... existing fields
  status: 'active' | 'completed';
  reminderDate?: string;
}
```

## Database Migration

**Migration File:** `1737324000000-AddDebtStatusAndReminder.ts`

```sql
-- Add status column
ALTER TABLE dbo.debts 
ADD COLUMN status VARCHAR(20) DEFAULT 'active' NOT NULL;

-- Add reminderDate column
ALTER TABLE dbo.debts 
ADD COLUMN "reminderDate" DATE;

-- Mark existing zero-balance debts as completed
UPDATE dbo.debts 
SET status = 'completed' 
WHERE "currentBalance"::NUMERIC <= 0;
```

**SQL File:** `add-debt-status-and-reminder.sql` (includes comments)

## Usage Examples

### Creating a Borrowed Debt with Reminder
```typescript
const debt = {
  debtType: "borrowed",
  personName: "John Smith",
  principal: 500,
  accountId: "account-id",
  startDate: "2026-01-20",
  reminderDate: "2026-02-15", // Remind me to pay on Feb 15
  createTransaction: true,
  categoryId: "expense-cat-id"
};
```

### Creating a Lent Debt with Reminder
```typescript
const debt = {
  debtType: "lent",
  personName: "Jane Doe",
  principal: 1000,
  accountId: "account-id",
  startDate: "2026-01-20",
  reminderDate: "2026-03-01", // Remind me to collect on March 1
};
```

### What Users See

**Active Debt Card:**
```
┌────────────────────────────────┐
│ Borrowed from John   [I Owe]  │
│ Principal: $500.00             │
│ Balance: $300.00               │
│ ⚠️ Reminder: 2/15/26 (Overdue)│
│ [Updates] [Pay Now] [🗑️]      │
└────────────────────────────────┘
```

**Completed Debt Card:**
```
┌────────────────────────────────┐ (Green border, faded)
│ Borrowed from John ✅  [I Owe] │
│ Completed 🎉                   │
│ Principal: $500.00             │
│ Balance: $0.00                 │
│ [View History] [🗑️]            │
└────────────────────────────────┘
```

## Benefits

1. **Clear Visual Feedback:**
   - Instantly see which debts are paid off
   - No need to check balances manually
   - Completed debts visually "fade into background"

2. **Better Payment Tracking:**
   - Set custom reminders for flexible P2P payments
   - Visual warnings for overdue reminders
   - Context-aware labels (send vs collect)

3. **Automatic Status Management:**
   - No manual status updates needed
   - System handles transitions automatically
   - Consistent behavior across all debt types

4. **Improved UX:**
   - Completed debts don't clutter action space
   - Clear separation between active and completed
   - Easy access to payment history

## Deployment Steps

1. **Run Database Migration:**
   ```bash
   # Using TypeORM
   npm run migration:run
   
   # Or manually run SQL
   psql -d your_db -f migrations-sql/add-debt-status-and-reminder.sql
   ```

2. **Deploy Backend:**
   - New debt.entity fields will be automatically used
   - Service logic handles status transitions
   - Backward compatible - existing debts work as before

3. **Deploy Frontend:**
   - New UI components render conditionally
   - Existing debts will show status based on balance
   - Reminder dates can be set on new debts

## Backward Compatibility

- ✅ All existing debts automatically get `status = 'active'` via migration
- ✅ Debts with zero balance automatically marked `completed`
- ✅ `reminderDate` is optional (null for existing debts)
- ✅ Institutional debts continue using `nextDueDate` (unchanged)
- ✅ No breaking changes to API or database schema

## Testing Checklist

- [ ] Create new debt and verify status = 'active'
- [ ] Make payments and verify status changes to 'completed' at balance = 0
- [ ] Delete payment on completed debt and verify status restores to 'active'
- [ ] Create P2P debt with reminder date
- [ ] Verify overdue reminder shows warning styling
- [ ] Verify completed debts show green border and checkmark
- [ ] Verify payment buttons hidden for completed debts
- [ ] Verify "View History" button works for completed debts

## Files Modified

**Backend:**
- `ledgerly-api/src/debts/debt.entity.ts` - Added status and reminderDate fields
- `ledgerly-api/src/debts/debt.service.ts` - Auto-status management logic
- `ledgerly-api/src/migrations/1737324000000-AddDebtStatusAndReminder.ts` - Migration

**Frontend:**
- `ledgerly_app/src/models/debt.ts` - Updated interface
- `ledgerly_app/src/components/DebtForm.tsx` - Reminder date input
- `ledgerly_app/src/components/DebtList.tsx` - Visual status and reminder display

**SQL:**
- `migrations-sql/add-debt-status-and-reminder.sql` - Standalone migration

## Future Enhancements (Optional)

- Add email/push notifications for reminder dates
- Add "days until reminder" countdown
- Add bulk "mark as completed" action
- Add filter for "overdue reminders only"
- Add reminder date editing after debt creation
- Add configurable reminder alerts (X days before due)

---

**Note:** This feature complements the existing P2P debt system with flexible payments. It does not change the core debt management logic, only adds visual and organizational improvements.
