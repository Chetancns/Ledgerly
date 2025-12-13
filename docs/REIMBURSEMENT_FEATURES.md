# Reimbursement and Enhanced Debt Management Features

## Overview

This document describes the new features added to Ledgerly for handling reimbursable transactions, settlement groups, and enhanced debt management with lending/borrowing tracking.

## Features Added

### 1. Reimbursable Transactions

Track transactions that will be reimbursed later (e.g., when you pay for a friend's coffee and they pay you back later).

**New Transaction Fields:**
- `counterpartyName`: Name of the person who will reimburse you
- `isReimbursable`: Boolean flag indicating this transaction needs reimbursement
- `settlementGroupId`: Groups multiple transactions for batch settlement (e.g., "Weekend Trip with Sarah")
- `reimbursedAmount`: Running total of how much has been reimbursed
- `notes`: Additional context about the transaction

**API Endpoints:**

```typescript
// Mark a transaction as reimbursable
PATCH /transactions/:id/reimbursable
Body: {
  counterpartyName: string,
  settlementGroupId?: string
}

// Create a settlement for a group
POST /transactions/settlements
Body: {
  settlementGroupId: string,
  amount: string,
  date: string,
  notes?: string
}

// List reimbursable transactions
GET /transactions?isReimbursable=true&counterpartyName=John&settlementGroupId=trip123
```

**Frontend Services:**

```typescript
import { markReimbursable, createSettlement, listReimbursables } from '@/services/transactions';

// Mark transaction as reimbursable
await markReimbursable(transactionId, {
  counterpartyName: 'Sarah',
  settlementGroupId: 'weekend-trip'
});

// Settle a group
await createSettlement({
  settlementGroupId: 'weekend-trip',
  amount: '150.00',
  date: '2025-12-15',
  notes: 'Sarah paid me back via Venmo'
});

// Get all pending reimbursements from Sarah
const pending = await listReimbursables({ counterpartyName: 'Sarah' });
```

### 2. Enhanced Debt Management

The debt system now supports three types of debts:

1. **Institutional Debts** (existing): Loans, credit cards, mortgages
2. **Lent Debts** (new): Money you lent to others
3. **Borrowed Debts** (new): Money you borrowed from others

**New Debt Fields:**
- `role`: 'lent' | 'borrowed' | 'institutional'
- `counterpartyName`: Person you lent to or borrowed from
- `paidAmount`: Running total of repayments
- `adjustmentTotal`: Sum of tips, interest adjustments, extras
- `dueDate`: When the debt should be settled
- `status`: 'open' | 'settled' | 'overdue'
- `notes`: Terms, context, agreements

**Remaining Amount Calculation:**
```
remaining = principal - paidAmount + adjustmentTotal
```

When `remaining <= 0`, status automatically updates to 'settled'.

**API Endpoints:**

```typescript
// Create a debt with role
POST /debts
Body: {
  name: string,
  role: 'lent' | 'borrowed' | 'institutional',
  principal: string,
  counterpartyName?: string,
  dueDate?: string,
  notes?: string,
  // For institutional debts:
  accountId?: string,
  installmentAmount?: string,
  frequency?: 'weekly' | 'biweekly' | 'monthly',
  startDate?: string,
  term?: number
}

// Add a repayment
POST /debts/:id/repayments
Body: {
  amount: string,
  adjustmentAmount?: string,  // e.g., $5 tip
  date: string,
  notes?: string
}

// Get repayments
GET /debts/:id/repayments

// Filter debts
GET /debts?role=lent&status=open&counterpartyName=John

// Update debt
PUT /debts/:id
Body: {
  status?: 'open' | 'settled' | 'overdue',
  dueDate?: string,
  notes?: string
}
```

**Frontend Services:**

```typescript
import { createDebt, addRepayment, getLentDebts, getBorrowedDebts } from '@/services/debts';

// Track money you lent
await createDebt({
  name: 'Loan to John',
  role: 'lent',
  principal: 500,
  counterpartyName: 'John',
  dueDate: '2025-12-31',
  notes: 'For car repair, agreed to pay back by year end'
});

// Record a repayment
await addRepayment(debtId, {
  amount: '200',
  adjustmentAmount: '10',  // John gave $10 extra as thanks
  date: '2025-12-15',
  notes: 'Partial payment via cash'
});

// Get all money owed to you
const owedToMe = await getLentDebts();

// Get all money you owe
const iOwe = await getBorrowedDebts();
```

### 3. Repayments Table

A new table tracks individual repayment installments for lent/borrowed debts.

**Schema:**
```sql
CREATE TABLE dbo.repayments (
  id UUID PRIMARY KEY,
  debtId UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  adjustmentAmount NUMERIC(12,2) DEFAULT 0,
  date DATE NOT NULL,
  notes TEXT,
  createdAt TIMESTAMP NOT NULL
);
```

## Use Cases

### Scenario 1: Shared Purchase Reimbursed Later
```typescript
// 1. You buy dinner for friends
const tx = await createTransaction({
  amount: '120.00',
  type: 'expense',
  description: 'Dinner at restaurant',
  accountId: 'my-card',
  categoryId: 'dining',
  transactionDate: '2025-12-10',
  counterpartyName: 'Sarah',
  isReimbursable: true,
  settlementGroupId: 'dinner-dec-10'
});

// 2. Sarah pays you back days later
await createSettlement({
  settlementGroupId: 'dinner-dec-10',
  amount: '60.00',  // Her half
  date: '2025-12-15',
  notes: 'Paid via Venmo'
});
```

### Scenario 2: Multiple Visits Before Settlement
```typescript
// Multiple transactions with same settlement group
await createTransaction({
  amount: '45.00',
  description: 'Coffee shop - Visit 1',
  counterpartyName: 'Mike',
  isReimbursable: true,
  settlementGroupId: 'mike-coffee-dec'
});

await createTransaction({
  amount: '38.00',
  description: 'Coffee shop - Visit 2',
  counterpartyName: 'Mike',
  isReimbursable: true,
  settlementGroupId: 'mike-coffee-dec'
});

// Settle all at once
await createSettlement({
  settlementGroupId: 'mike-coffee-dec',
  amount: '83.00',  // Total
  date: '2025-12-20'
});
```

### Scenario 3: Borrowed Money with Extra
```typescript
// Friend borrows money
const debt = await createDebt({
  name: 'Loan to Sarah',
  role: 'lent',
  principal: 300,
  counterpartyName: 'Sarah',
  dueDate: '2025-12-31',
  notes: 'For textbooks'
});

// She returns with a small extra
await addRepayment(debt.id, {
  amount: '300',
  adjustmentAmount: '20',  // Extra $20 as thanks
  date: '2025-12-25',
  notes: 'Full payment + gift'
});

// Debt is now settled, remaining = 300 - 300 + 20 = 20 (overpaid)
```

### Scenario 4: Bank Transaction Matching
```typescript
// You spot an expense in your bank
const expense = await createTransaction({
  amount: '85.00',
  type: 'expense',
  description: 'Uber for group',
  accountId: 'checking',
  counterpartyName: 'Friends',
  isReimbursable: true,
  settlementGroupId: 'concert-trip'
});

// Later you see a deposit
const deposit = await createTransaction({
  amount: '85.00',
  type: 'income',
  description: 'Venmo from friends',
  accountId: 'checking'
});

// Or use settlement to link them
await createSettlement({
  settlementGroupId: 'concert-trip',
  amount: '85.00',
  date: '2025-12-18',
  notes: 'Reimbursement received via Venmo'
});
```

## Database Migration

The SQL migration script is located at: `ledgerly-api/migrations/add-reimbursement-and-enhanced-debt.sql`

To apply the migration:

```bash
cd ledgerly-api

# Run the SQL script directly on your database
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/add-reimbursement-and-enhanced-debt.sql

# Or if you prefer TypeORM migrations (after generating):
npm run migration:run
```

**Important Notes:**
- The migration preserves existing data
- Existing debts are marked as `role='institutional'`
- Existing transactions get `isReimbursable=false` and `reimbursedAmount=0`
- The `accountId` field in debts becomes nullable (personal debts may not have an account)

## Testing Checklist

### Backend
- [ ] Create a reimbursable transaction
- [ ] Mark an existing transaction as reimbursable
- [ ] Create a settlement for a group
- [ ] List reimbursable transactions with filters
- [ ] Create a lent debt
- [ ] Create a borrowed debt
- [ ] Add repayment to a debt
- [ ] Get repayments list
- [ ] Verify status updates to 'settled' when paid off
- [ ] Test overdue status when past dueDate

### Frontend
- [ ] Display reimbursable flag on transactions
- [ ] Filter transactions by reimbursable status
- [ ] Show settlement group info
- [ ] Create debt with role selector
- [ ] Display lent vs borrowed sections separately
- [ ] Add repayment UI
- [ ] Show remaining calculation
- [ ] Display repayment history

## Future Enhancements

Potential improvements for the future:
1. Reminders for overdue debts
2. Split bill calculator in UI
3. QR code for quick settlement links
4. Photo attachments for receipts
5. Multi-currency support for international debts
6. Interest calculation for long-term loans
7. Recurring debt payments scheduling
8. Export debt/settlement reports

## Support

For questions or issues:
- Check the API documentation at `/docs/API_REFERENCE.md`
- Review the database schema at `/docs/DATABASE_SCHEMA.md`
- See architecture overview at `/docs/ARCHITECTURE.md`
