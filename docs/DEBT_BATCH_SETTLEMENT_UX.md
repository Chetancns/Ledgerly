# Batch Settlement UX - Complete Guide

## Overview

The batch settlement feature allows users to settle multiple debts simultaneously with a single transaction. This document covers the complete UX flow and technical implementation.

## Key Features

### 1. Account Selection (Commit fcc6879)

**User Control:**
- Explicit account dropdown selector
- Required field - must select an account to proceed
- Auto-selects first account for convenience
- Can change selection before confirming

**Why This Matters:**
- Users have full control over which account balance gets updated
- Clear that a transaction will be created
- No surprises about which account is affected
- Matches the UX pattern used in RepaymentModal for consistency

### 2. Transaction Creation

**Always Creates Transaction:**
- Transaction is REQUIRED when settling debts
- Account selection is mandatory
- Cannot proceed without choosing an account
- Clear error message if attempted: "Please select an account to create a transaction and update the balance."

**Transaction Type Logic:**
- Based on first debt's role in the batch:
  - "I Lent" debts → **Income** transaction (receiving money back)
  - "I Borrowed" debts → **Expense** transaction (paying money)
- Single transaction created for all debts in batch
- Amount equals total of all selected debts

### 3. Visual Feedback

**Modal Layout:**
```
┌────────────────────────────────────────┐
│ Settle Multiple Debts            [×]  │
├────────────────────────────────────────┤
│                                        │
│ You are about to settle:               │
│ • Debt 1 - Person A: $50.00           │
│ • Debt 2 - Person A: $30.00           │
│ • Debt 3 - Person A: $40.00           │
│ ──────────────────────────────────     │
│ Total: $120.00                         │
│                                        │
│ ℹ️ This will:                          │
│ • Create an income transaction         │
│   for $120.00                          │
│ • Mark all 3 debts as settled          │
│ • Update your account balance          │
│                                        │
│ Select Account to Update Balance *     │
│ [▼ My Checking (checking)           ]  │
│ ℹ️ A transaction will be created to    │
│    update this account's balance       │
│                                        │
│ [Cancel]  [Confirm Settlement]         │
└────────────────────────────────────────┘
```

### 4. Validation Rules

**Before Confirming:**
- ✅ At least one debt must be selected
- ✅ An account must be selected from dropdown
- ✅ Account must exist in system

**Error Handling:**
- "No debts selected" - if somehow triggered with empty selection
- "Please select an account..." - if no account chosen
- "No accounts found..." - if user has no accounts created

**Button States:**
- Disabled when: `loading || !selectedAccountId`
- Enabled when: account is selected and not processing

## Complete User Flow

### Scenario: Settling Weekend Trip Debts

**Step 1: Navigate to Grouped Debts**
1. Open Debts page
2. Click "📁 Groups" tab
3. Select settlement group: "weekend-trip"
4. See all debts for that trip

**Step 2: Enable Batch Mode**
1. Click "Enable Batch Settlement" button
2. Button turns green: "✓ Batch Mode"
3. Checkboxes appear on each debt card

**Step 3: Select Debts to Settle**
1. Check boxes next to debts: Dinner ($50), Uber ($30), Movie ($40)
2. Selection summary shows: "Selected: 3 debts | Total: $120.00"
3. Selected cards get green border highlight

**Step 4: Settle Up**
1. Click "Settle Up (3)" button
2. Batch Settlement Modal opens

**Step 5: Review and Select Account**
1. Modal shows summary of selected debts
2. Total amount: $120.00
3. Shows what will happen:
   - Create income transaction (because these are "I Lent" debts)
   - Mark all 3 debts as settled
   - Update account balance
4. Account dropdown auto-selected to first account
5. User can change if needed

**Step 6: Confirm**
1. Click "Confirm Settlement"
2. Loading state: "Processing..."
3. API call creates transaction and settles debts
4. Success toast: "✅ 3 debts settled successfully!"
5. Modal closes
6. Debt list refreshes showing settled status

**Result:**
- ✅ Single income transaction created for $120
- ✅ My Checking account balance increased by $120
- ✅ All 3 debts marked as "settled"
- ✅ Debts no longer appear in "Open" filter
- ✅ Visible in "Settled" or "All" filters for history

## Technical Implementation

### Frontend (BatchSettlementModal.tsx)

**State Management:**
```typescript
const [accounts, setAccounts] = useState<Account[]>([]);
const [loading, setLoading] = useState(false);
const [selectedAccountId, setSelectedAccountId] = useState("");
```

**Auto-Selection Logic:**
```typescript
useEffect(() => {
  if (open) {
    loadAccounts();
  }
}, [open]);

useEffect(() => {
  // Auto-select first account when accounts load
  if (accounts.length > 0 && !selectedAccountId) {
    setSelectedAccountId(accounts[0].id);
  }
}, [accounts]);
```

**Validation:**
```typescript
const handleConfirm = async () => {
  if (debts.length === 0) {
    toast.error("No debts selected");
    return;
  }

  if (!selectedAccountId) {
    toast.error("Please select an account to create a transaction and update the balance.");
    return;
  }

  // ... proceed with settlement
};
```

### Backend (debt.service.ts)

**Batch Repayment Method:**
```typescript
async batchRepayment(userId: string, dto: BatchRepaymentDto) {
  // 1. Fetch and validate selected debts
  // 2. Calculate total remaining across all debts
  // 3. Distribute payment proportionally
  // 4. Create single transaction for first debt (covers all)
  // 5. Update all debt statuses
  // 6. Save repayment records with transaction ID
  // 7. Return summary of settlement
}
```

**Transaction Creation:**
- Only first debt in batch creates the transaction
- Transaction type determined by first debt's role
- Total amount (not distributed) used for transaction
- All debts share the same transaction ID

## Best Practices

### For Users

1. **Group Related Debts** - Use settlement groups to organize related expenses
2. **Review Before Confirming** - Double-check the account selection
3. **Check Transaction History** - Verify transaction appears in selected account
4. **Use Filters** - Switch to "Settled" filter to see payment history

### For Developers

1. **Always Require Account** - Don't allow settlement without account selection
2. **Auto-Select for Convenience** - Pre-select first account to reduce friction
3. **Clear Messaging** - Explain what will happen before user commits
4. **Validate Early** - Check requirements before API call
5. **Provide Feedback** - Loading states, success/error toasts

## Comparison with Single Repayment

| Feature | Single Repayment | Batch Settlement |
|---------|-----------------|------------------|
| Debts Handled | 1 | Multiple |
| Transactions Created | 1 per repayment | 1 for all debts |
| Account Selection | Optional | Required |
| Use Case | Individual debt payment | Grouped debt settlement |
| UI Location | Debt card action | Groups tab batch mode |

## Future Enhancements

Potential improvements for consideration:

1. **Partial Batch Settlement** - Allow settling for less than total amount
2. **Split Across Accounts** - Distribute settlement across multiple accounts
3. **Scheduled Batch Settlement** - Schedule future settlement date
4. **Settlement Notes** - Add custom notes to the transaction
5. **Transaction Preview** - Show exact transaction details before creating

## Troubleshooting

### Modal Not Opening
- Check that debts are selected (selection count > 0)
- Verify "Settle Up" button is enabled
- Check browser console for errors

### Cannot Confirm Settlement
- Ensure an account is selected from dropdown
- Verify selected account exists and is active
- Check that debts array has items

### Transaction Not Created
- Verify account ID is being passed to API
- Check backend logs for errors
- Ensure account has permissions

### Wrong Transaction Type
- Transaction type determined by FIRST debt's role
- Mix "I Lent" and "I Borrowed" carefully
- Consider settling separately if different types

## Related Documentation

- `/docs/DEBT_MANAGEMENT_UX_GUIDE.md` - Complete UX guide
- `/docs/SIMPLIFIED_DEBT_SYSTEM.md` - Debt system architecture
- `ledgerly-api/src/debts/debt.service.ts` - Backend implementation
- `ledgerly_app/src/components/BatchSettlementModal.tsx` - Frontend component
