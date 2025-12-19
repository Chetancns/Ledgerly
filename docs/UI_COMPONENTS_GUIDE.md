# UI Components Implementation Guide

## Overview

All requested UI components for reimbursable transactions and enhanced debt management have been implemented. This guide shows you how to use each component.

## 1. Transaction Form with Reimbursement

**File:** `ledgerly_app/src/components/TransactionForm.tsx`

### New Features:
- **Reimbursement Checkbox**: Mark transactions that will be paid back later
- **Counterparty Name**: Who will reimburse you (e.g., "John", "Sarah")
- **Settlement Group ID**: Group multiple transactions for batch settlement (e.g., "weekend-trip")
- **Notes**: Additional context about the reimbursement

### Usage:
1. Fill out regular transaction details (account, category, amount, etc.)
2. Check "Mark as Reimbursable" checkbox
3. Enter who will reimburse you
4. Optionally add a settlement group ID to batch multiple transactions
5. Add notes if needed

### Example Scenario:
- You buy dinner for friends ($120)
- Check "Mark as Reimbursable"
- Counterparty: "Sarah"
- Settlement Group: "dinner-dec-10"
- Later, use the Settlement Modal to settle all "dinner-dec-10" transactions at once

## 2. Enhanced Debt Form with Role Selector

**File:** `ledgerly_app/src/components/EnhancedDebtForm.tsx`

### Three Debt Types:

#### 💰 I Lent (Money owed to you)
**Fields:**
- Description (e.g., "Loan to John for textbooks")
- Person who borrowed*
- Amount*
- Due Date (optional)
- Account (optional - where you track this)
- Notes

**Use Case:** You lent $500 to a friend for car repairs

#### 💸 I Borrowed (Money you owe)
**Fields:**
- Description (e.g., "Borrowed from Mom for rent")
- Person I borrowed from*
- Amount*
- Due Date (optional)
- Account (optional)
- Notes

**Use Case:** You borrowed $1000 from family to cover expenses

#### 🏦 Institutional (Loans, Credit Cards)
**Fields:**
- Debt Name* (e.g., "Car Loan (Chase)")
- Account*
- Principal*
- Current Balance
- Term (months)
- Frequency (weekly/biweekly/monthly)
- Auto-calc installment toggle
- Installment Amount
- Start Date
- Next Due Date

**Use Case:** Car loan with scheduled monthly payments

### Form Behavior:
- Selecting a role shows/hides relevant fields
- Form validates based on selected role
- Personal debts (lent/borrowed) don't require account or frequency
- Institutional debts require account and payment schedule

## 3. Settlement Modal

**File:** `ledgerly_app/src/components/SettlementModal.tsx`

### Features:
- **Load Transactions**: Enter a settlement group ID to load all pending reimbursable transactions
- **View Details**: See each transaction's description, counterparty, date, and pending amount
- **Total Calculation**: Automatically calculates total pending reimbursement
- **Proportional Distribution**: Settlement amount is distributed across transactions proportionally
- **Date & Notes**: Record when and how settlement was made

### Usage:
1. Enter settlement group ID (e.g., "weekend-trip")
2. Click refresh to load transactions
3. Review all transactions in that group
4. Enter settlement amount (up to total pending)
5. Select settlement date
6. Add notes (e.g., "Paid via Venmo")
7. Click "Create Settlement"

### Example:
```
Settlement Group: "weekend-trip"
Transactions:
  - Dinner: $120 (pending: $120)
  - Coffee: $45 (pending: $45)
  - Uber: $38 (pending: $38)
Total Pending: $203

Settlement Amount: $203
Date: 2025-12-15
Notes: "Sarah paid via Venmo"
```

## 4. Repayment Modal

**File:** `ledgerly_app/src/components/RepaymentModal.tsx`

### Features:
- **Debt Summary**: Shows principal, remaining, and counterparty
- **Repayment Amount**: Enter how much was paid back
- **Adjustment Amount**: Optional extra amount (tips, interest, etc.)
- **Date**: When repayment was made
- **Notes**: Context about the repayment

### Usage:
1. From debt list, click "Add Repayment" on a lent/borrowed debt
2. Enter repayment amount (principal payment)
3. Optionally add adjustment amount (e.g., +$20 tip)
4. Select date
5. Add notes if needed
6. Click "Record Repayment"

### Calculation:
```
Remaining = Principal - Paid Amount + Adjustment Total

Example:
Principal: $500
Paid: $500
Adjustment: +$20 (friend gave extra as thanks)
Remaining: $500 - $500 + $20 = $20 (overpaid/settled)

Status: Automatically updates to "settled" when remaining <= 0
```

## 5. Enhanced Debt List with Filters

**File:** `ledgerly_app/src/components/EnhancedDebtList.tsx`

### Filter Tabs:
- **All**: Shows all debts
- **💰 Lent (N)**: Money owed to you
- **💸 Borrowed (N)**: Money you owe
- **🏦 Institutional (N)**: Loans and credit cards

### Debt Card Features:
- **Role Badge**: Color-coded badge (green=lent, red=borrowed, blue=institutional)
- **Debt Info**: Principal, remaining, status, due dates
- **Progress Bar**: Visual progress with color based on status
- **Status Colors**:
  - Green: Settled
  - Red: Overdue
  - Blue: Open/On-track

### Actions by Role:

**For Personal Debts (Lent/Borrowed):**
- View Repayments button
- Add Repayment button
- Delete button

**For Institutional Debts:**
- View Updates button
- Pay Early button
- Delete button

### Catch Up Button:
- Appears when institutional debts exist
- Processes all missed scheduled payments
- Updates debt balances automatically

## How to Access

### Reimbursable Transactions:
1. Go to Transactions page
2. Click "Add Transaction" or edit existing
3. Check "Mark as Reimbursable"
4. Fill in reimbursement details

### Settlement:
1. Create a custom modal trigger (e.g., button in Layout or Transactions page)
2. Use `<SettlementModal open={...} onClose={...} onSuccess={...} />`
3. Or integrate into transaction list for bulk settlement

### Debts:
1. Go to Debts page (`/debts`)
2. Select debt type using role buttons
3. Fill in form based on selected type
4. View/manage debts with role-specific filters

## Integration Points

### To add Settlement Modal to Transactions page:
```tsx
import SettlementModal from "@/components/SettlementModal";

// In component:
const [showSettlement, setShowSettlement] = useState(false);

// Add button:
<button onClick={() => setShowSettlement(true)}>
  💰 Settle Up
</button>

// Add modal:
<SettlementModal
  open={showSettlement}
  onClose={() => setShowSettlement(false)}
  onSuccess={() => {
    setShowSettlement(false);
    // Refresh transactions
  }}
/>
```

### To filter reimbursable transactions:
```tsx
import { listReimbursables } from "@/services/transactions";

// Get all reimbursable:
const pending = await listReimbursables();

// Filter by counterparty:
const sarahDebts = await listReimbursables({ counterpartyName: "Sarah" });

// Filter by group:
const tripExpenses = await listReimbursables({ settlementGroupId: "weekend-trip" });
```

## Testing Checklist

- [ ] Create a transaction and mark it reimbursable
- [ ] Group multiple transactions with same settlement group ID
- [ ] Use settlement modal to settle grouped transactions
- [ ] Create a "lent" debt and record repayments
- [ ] Create a "borrowed" debt and record repayments
- [ ] Create an institutional debt and use catch-up
- [ ] Filter debts by role (lent/borrowed/institutional)
- [ ] View repayment history for personal debts
- [ ] View update history for institutional debts
- [ ] Test status auto-update (open → settled)

## Tips

1. **Settlement Groups**: Use descriptive IDs like "trip-vegas-2024", "dinner-dec", "coffee-week"
2. **Counterparty Consistency**: Use same name format for same person (e.g., always "John" not "john" or "John S.")
3. **Notes**: Add context - helps remember what settlements/repayments were for
4. **Adjustment Amounts**: Use for tips, interest, or small extras (positive = adds to owed amount)
5. **Role Selection**: Choose carefully - lent vs borrowed switches who owes whom
6. **Account Association**: Optional for personal debts, but helps track which account was used

## Troubleshooting

**Settlement modal shows no transactions:**
- Verify settlement group ID is correct
- Check that transactions are marked as reimbursable
- Ensure transactions haven't been fully reimbursed already

**Debt doesn't show in filtered view:**
- Check the role is set correctly
- Use "All" filter to see all debts
- Verify debt was created successfully

**Repayment modal doesn't update remaining:**
- Check that debt role is "lent" or "borrowed"
- Institutional debts use "updates" not "repayments"
- Refresh the debt list after adding repayment

**Form validation errors:**
- Personal debts require counterparty name
- Institutional debts require account and frequency
- Amount must be > 0
