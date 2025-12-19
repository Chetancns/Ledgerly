# Simplified Debt-Based System for Expense Tracking

## Overview

The Ledgerly application now uses a **simplified debt-based approach** for tracking shared expenses and friend-to-friend lending/borrowing. This replaces the previous complex reimbursable transaction system with a cleaner, more intuitive model.

## Why the Change?

The previous system with "reimbursable transactions" was too complex:
- Multiple confusing fields (`paidBy`, `counterpartyName`, `settlementGroupId`, etc.)
- Separate settlements table and page
- Unclear when transactions would be created
- Hard to understand "income vs expense" for shared costs

The new system is **simpler and more intuitive**:
- Single mental model: "debts"
- Clear role-based tracking: I Lent, I Borrowed, Institutional
- Transactions created at predictable points (debt creation with account, or repayment with account)
- Grouping supported via `settlementGroupId`

## Core Concepts

### 1. Debt Roles

**Three types of debts:**

- **💰 I Lent** - You gave money to someone (they owe you)
- **💸 I Borrowed** - You received money from someone (you owe them)
- **🏦 Institutional** - Loans, credit cards, mortgages

### 2. Settlement Groups

Use `settlementGroupId` to group multiple related debts for batch tracking:
- "weekend-trip" - All expenses from a weekend trip
- "december-expenses" - Month's shared expenses
- "vacation-2024" - Vacation costs

### 3. Transaction Creation

**Transactions are created automatically at two points:**

1. **When creating debt WITH an account selected:**
   - I Lent debt → Creates expense transaction (money left your account)
   - I Borrowed debt → Creates income transaction (money came into your account)

2. **When adding repayment WITH an account selected:**
   - I Lent debt repayment → Creates income transaction (getting money back)
   - I Borrowed debt repayment → Creates expense transaction (paying money back)

## User Flows

### Scenario 1: Friend Pays for Your Purchase

**Example:** John pays $200 for a TV you bought.

**Steps:**
1. Go to **Debts** page
2. Click **"Add Debt"**
3. Select role: **"💸 I Borrowed"**
4. Fill in:
   - Name: "TV from Best Buy"
   - Person: "John"
   - Amount: $200
   - Settlement Group: "december-shopping" (optional)
   - Account: **Leave blank** (no transaction yet - John paid, not you)
5. Click **"Create Debt"**

**Result:**
- Debt created with status "open"
- No transaction created yet
- You owe John $200

**Later, when you pay John back:**
1. Find the debt in Debts page
2. Click **"Add Repayment"**
3. Fill in:
   - Amount: $200
   - Account: **Select your checking account**
   - Date: Today
4. Click **"Add Repayment"**

**Result:**
- $200 debited from your checking account
- Expense transaction created: "Repayment: TV from Best Buy"
- Debt marked as "settled"

### Scenario 2: You Pay, Friend Owes You

**Example:** You pay $120 for dinner, Sarah will pay you back.

**Steps:**
1. **First, create the normal transaction:**
   - Go to **Transactions** → **"Add Transaction"**
   - Amount: $120
   - Category: Food
   - Account: Your checking (money deducted)
   - Description: "Dinner with Sarah"
   - Submit

2. **Then, track the debt:**
   - Go to **Debts** → **"Add Debt"**
   - Select: **"💰 I Lent"**
   - Name: "Dinner with Sarah"
   - Person: "Sarah"
   - Amount: $120
   - Account: **Leave blank** (already deducted in step 1)
   - Submit

**Result:**
- Transaction recorded (dinner expense)
- Debt created (Sarah owes you $120)

**Later, when Sarah pays you back:**
1. Find debt → **"Add Repayment"**
2. Amount: $120
3. Account: **Select your account**
4. Submit

**Result:**
- $120 added to your account
- Income transaction created
- Debt marked as settled

### Scenario 3: Multiple Purchases, Single Settlement

**Example:** Weekend trip with multiple shared expenses.

**Steps:**
1. **Friday - Dinner:**
   - Transaction: $50 expense (Food, your account)
   - Debt: I Lent to Mike, $50, Group: "weekend-trip"

2. **Saturday - Uber:**
   - Transaction: $30 expense (Transport, your account)
   - Debt: I Lent to Mike, $30, Group: "weekend-trip"

3. **Sunday - Breakfast:**
   - Transaction: $40 expense (Food, your account)
   - Debt: I Lent to Mike, $40, Group: "weekend-trip"

**View grouped debts:**
- Go to Debts page
- Filter or search for "weekend-trip"
- See all 3 debts grouped together
- Total: $120 owed by Mike

**Settlement:**
- Add repayment to any one debt for $120
- Or add partial repayments to each
- All tracked under same settlement group

### Scenario 4: Friend Pays for Multiple Things

**Example:** Friend covers several expenses for you.

**Steps:**
1. **Day 1 - Hotel ($200):**
   - No transaction (friend paid)
   - Debt: I Borrowed from Sarah, $200, Group: "vacation", Account: blank

2. **Day 2 - Rental car ($150):**
   - No transaction (friend paid)
   - Debt: I Borrowed from Sarah, $150, Group: "vacation", Account: blank

3. **Day 3 - Dinner ($80):**
   - No transaction (friend paid)
   - Debt: I Borrowed from Sarah, $80, Group: "vacation", Account: blank

**Total owed:** $430 to Sarah

**Settlement:**
- Go to one debt → Add Repayment
- Amount: $430 (can settle all at once)
- Account: Your checking
- Creates single expense transaction for $430
- All debts can be marked as settled

## Best Practices

### 1. Always Use Settlement Groups

When you have multiple related expenses with the same person, use a consistent settlement group ID:
- Makes tracking easier
- Helps with batch settlements
- Better organization in debt list

### 2. Create Transactions for Your Own Expenses

If you paid and want proper expense tracking (for budgets, insights, etc.):
1. Create transaction first (records the expense properly)
2. Then create debt (tracks who owes you)

### 3. Use Descriptive Debt Names

Good: "TV from Best Buy", "Weekend trip dinner", "December groceries"
Bad: "John debt", "Money", "Expense"

### 4. Don't Create Transactions When Friends Pay

If a friend paid for something you'll reimburse:
- Create debt WITHOUT selecting an account
- Transaction will be created when you add repayment

## Dashboard & Insights Compatibility

All existing dashboard features continue to work:

- **Monthly spending charts** - Use transactions table (unchanged)
- **Category breakdowns** - Use transactions table (unchanged)
- **Budget tracking** - Use transactions table (unchanged)
- **Debt overview** - Use debts table (enhanced with settlementGroupId)
- **Net worth calculations** - Use accounts and debts (works as before)

## API Endpoints

### Debts

```typescript
// Create debt
POST /debts
Body: {
  name: string;
  principal: string;
  role: 'lent' | 'borrowed' | 'institutional';
  counterpartyName?: string;
  settlementGroupId?: string;  // NEW: For grouping
  accountId?: string;  // Optional: Creates transaction if provided
  dueDate?: string;
  notes?: string;
}

// Add repayment
POST /debts/:id/repayments
Body: {
  amount: string;
  accountId?: string;  // Optional: Creates transaction if provided
  date: string;
  notes?: string;
}

// List debts
GET /debts?role=lent&status=open

// Get repayments
GET /debts/:id/repayments
```

### Transactions

```typescript
// Create transaction (simplified - no reimbursable fields)
POST /transactions
Body: {
  accountId: string;
  categoryId: string;
  amount: string;
  type: 'expense' | 'income' | 'savings' | 'transfer';
  description?: string;
  transactionDate: string;
  notes?: string;
}

// List transactions
GET /transactions?from=2024-01-01&to=2024-12-31

// Update/Delete remain the same
PUT /transactions/:id
DELETE /transactions/:id
```

## Database Schema

### Debts Table

```sql
CREATE TABLE dbo.debts (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL,
  accountId UUID,
  name VARCHAR(255) NOT NULL,
  principal NUMERIC(12,2) NOT NULL,
  currentBalance NUMERIC(12,2) NOT NULL,
  
  -- Role-based fields
  role VARCHAR(20) NOT NULL,  -- 'lent', 'borrowed', 'institutional'
  counterpartyName VARCHAR(200),
  settlementGroupId VARCHAR(200),  -- NEW: For grouping related debts
  paidAmount NUMERIC(12,2) DEFAULT 0,
  adjustmentTotal NUMERIC(12,2) DEFAULT 0,
  dueDate DATE,
  status VARCHAR(20) DEFAULT 'open',  -- 'open', 'settled', 'overdue'
  notes TEXT,
  
  -- Institutional debt fields
  installmentAmount NUMERIC(12,2),
  frequency VARCHAR(20),
  startDate DATE,
  nextDueDate DATE,
  term INTEGER,
  
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_debts_settlement_group ON dbo.debts(settlementGroupId) 
WHERE settlementGroupId IS NOT NULL;

CREATE INDEX idx_debts_counterparty ON dbo.debts(counterpartyName) 
WHERE counterpartyName IS NOT NULL;
```

### Transactions Table

```sql
-- SIMPLIFIED - Removed reimbursable fields
CREATE TABLE dbo.transactions (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL,
  accountId UUID,
  categoryId UUID,
  amount NUMERIC(12,2) NOT NULL,
  type VARCHAR(20) NOT NULL,  -- 'expense', 'income', 'savings', 'transfer'
  description TEXT,
  transactionDate DATE NOT NULL,
  toAccountId UUID,  -- For transfers
  notes TEXT,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

## Migration from Old System

If you have existing data in the old reimbursable system, run the cleanup script:

```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
  -f ledgerly-api/migrations/cleanup-reimbursable-system.sql
```

This script will:
1. Drop the `settlements` table
2. Remove reimbursable columns from `transactions`
3. Add `settlementGroupId` to `debts`
4. Create necessary indexes

**Note:** Any existing settlement data will be lost. Export it first if needed.

## Troubleshooting

### Q: What if I already created a transaction when friend paid?

A: Just create the debt without an account. The transaction already exists, so you only need to track the debt itself. When they pay you back, add a repayment with an account to record the income.

### Q: Can I track expenses where NO money exchanged hands?

A: No, but that's by design. Debts track actual money owed. If no money was involved, it's not a financial transaction.

### Q: How do I see all expenses for a trip across multiple people?

A: Use the same `settlementGroupId` for all debts related to that trip. Then filter debts by that group ID.

### Q: What if I want to split an expense 50/50?

A:
1. Create the transaction (your 50% share, expense from your account)
2. Create "I Lent" debt for the other 50% (what they owe you)
3. When they pay, add repayment with account (creates income transaction)

### Q: Dashboard shows wrong numbers after migration?

A: Dashboard queries transactions and debts tables. Both are intact. If numbers seem off:
1. Check date filters on dashboard
2. Verify transaction amounts are correct
3. Ensure debts have proper `principal` values
4. Refresh the page to reload data

## Summary

The simplified debt system provides:

✅ **Clearer mental model** - Everything is a debt
✅ **Predictable transactions** - Created at debt creation or repayment (with account)
✅ **Better organization** - Settlement groups for related debts
✅ **Proper accounting** - Expenses stay expenses, no confusing income/expense flips
✅ **Dashboard compatible** - All charts and insights still work
✅ **Less complexity** - Fewer fields, simpler UI, easier to understand

Use this system for all friend-to-friend money tracking, shared expenses, and casual lending/borrowing!
