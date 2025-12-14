# Split-Expense Feature Guide

## Overview

The split-expense feature enables you to track shared expenses in both directions:
1. **You pay, friend reimburses** - Track money others owe you
2. **Friend pays, you reimburse** - Track money you owe others

This is achieved through the `paidBy` field which separates WHO paid from WHO owes whom.

## Key Concept

Traditional expense tracking only records "money out = expense". The split-expense feature adds a crucial dimension: **Who actually paid?**

- When **you** pay → Money leaves your account (accountId selected)
- When **friend** pays → No account deduction (accountId can be null)

In both cases, the transaction is correctly categorized (Food, Transport, etc.) and the reimbursement is tracked separately.

## Usage Scenarios

### Scenario 1: You Pay, Friend Reimburses

**Example:** You pay for dinner ($120), friend will pay you back later.

1. Create Transaction:
   - Amount: `$120`
   - Category: `Food & Dining`
   - Account: `My Checking` (money leaves your account)
   - ✅ Check "Mark as reimbursable"
   - Who Paid?: `You (money from your account)` 
   - Who will reimburse?: `John`
   - Settlement Group: `weekend-trip` (optional)

2. Result:
   - Transaction created with type `expense`
   - Category: Food & Dining (correct!)
   - $120 deducted from your checking account
   - Marked as reimbursable with `paidBy: 'you'`
   - Shows in Settlements page under "💰 They Owe You"

3. When John Pays You Back:
   - Go to `/settlements` page
   - Click "Record Settlement"
   - Select: Counterparty `John`, Group `weekend-trip`
   - See pending transaction: $120
   - Enter amount received: `$120`
   - Submit
   - Transaction marked as fully reimbursed

### Scenario 2: Friend Pays, You Reimburse

**Example:** Friend pays for movie tickets ($50), you'll pay them back later.

1. Create Transaction:
   - Amount: `$50`
   - Category: `Entertainment`
   - Account: *Leave blank* or select account with note
   - ✅ Check "Mark as reimbursable"
   - Who Paid?: Select `Sarah` from dropdown
   - Who do you owe?: `Sarah`
   - Settlement Group: `movie-night` (optional)

2. Result:
   - Transaction created with type `expense`
   - Category: Entertainment (correct!)
   - **NO account deduction** (because you didn't pay)
   - Marked as reimbursable with `paidBy: 'Sarah'`
   - Shows in Settlements page under "💸 You Owe Them"

3. When You Pay Sarah Back:
   - Go to `/settlements` page
   - See Sarah in "💸 You Owe Them" section: $50
   - Click "Record Settlement"
   - Select: Counterparty `Sarah`, Group `movie-night`
   - See pending transaction: $50
   - Enter amount paid: `$50`
   - Submit
   - Transaction marked as settled

### Scenario 3: Multiple Transactions, Mixed Payers

**Example:** Weekend trip with friend, both of you pay for different things.

Day 1 - You pay for gas:
- Amount: `$80`
- Category: `Transport`
- Account: `My Checking`
- Who Paid?: `You`
- Who will reimburse?: `Sarah`
- Group: `roadtrip`

Day 2 - Sarah pays for hotel:
- Amount: `$200`
- Category: `Accommodation`
- Account: *Leave blank*
- Who Paid?: `Sarah`
- Who do you owe?: `Sarah`
- Group: `roadtrip`

Day 3 - You pay for meals:
- Amount: `$120`
- Category: `Food & Dining`
- Account: `My Checking`
- Who Paid?: `You`
- Who will reimburse?: `Sarah`
- Group: `roadtrip`

**Settlements Page Shows:**
```
💰 They Owe You
  Sarah: $200 ($80 + $120)

💸 You Owe Them
  Sarah: $200 (hotel)

Net: Even! Or you owe Sarah $0, or settle $200 each way
```

## API Structure

### Transaction Object with Split-Expense

```typescript
{
  id: "uuid",
  amount: "120.00",
  description: "Dinner",
  categoryId: "food-category-id",
  accountId: "my-account-id", // null if friend paid
  type: "expense",
  isReimbursable: true,
  paidBy: "you", // or counterparty name
  counterpartyName: "John",
  settlementGroupId: "weekend-trip",
  reimbursedAmount: "0.00",
  notes: "Split 50/50"
}
```

### Creating Split-Expense Transaction

**You paid:**
```typescript
POST /transactions
{
  amount: "120",
  categoryId: "food-id",
  accountId: "my-account-id",
  isReimbursable: true,
  paidBy: "you",
  counterpartyName: "John",
  settlementGroupId: "trip"
}
```

**Friend paid:**
```typescript
POST /transactions
{
  amount: "120",
  categoryId: "food-id",
  accountId: null, // Important!
  isReimbursable: true,
  paidBy: "John",
  counterpartyName: "John",
  settlementGroupId: "trip"
}
```

## Settlements Page

The `/settlements` page shows:

### Pending Balances (Summary)

**💰 They Owe You** - Transactions where `paidBy = 'you'` and not fully reimbursed
- Lists each person and total amount owed
- Sorted by amount (highest first)

**💸 You Owe Them** - Transactions where `paidBy = counterpartyName` and not fully reimbursed
- Lists each person and total amount you owe
- Sorted by amount (highest first)

### Recording Settlements

1. Click "Record Settlement"
2. Select filters (counterparty and/or group)
3. See pending transactions grouped by settlement group
4. Enter amount paid/received
5. Settlement recorded:
   - Creates settlement record in settlements table
   - Updates `reimbursedAmount` on transactions proportionally
   - Transaction removed from pending once fully reimbursed

### Settlement History

- Shows all past settlements
- Filter by counterparty or group
- Delete settlements if recorded by mistake

## Best Practices

### 1. Always Set `paidBy` for Reimbursables

When marking a transaction as reimbursable, always specify who paid:
- Select "You" if money left your account
- Select counterparty name if they paid

### 2. Leave Account Blank When Friend Pays

If friend paid and you didn't spend your money, set `accountId` to `null`. This keeps your account balance accurate.

### 3. Use Settlement Groups for Related Expenses

Group related expenses together:
- `weekend-trip` for vacation expenses
- `dinner-dec-12` for specific events
- `shared-groceries` for recurring shared expenses

### 4. Categories Stay Correct

Always use the appropriate category (Food, Transport, etc.) regardless of who paid. This keeps your spending reports accurate.

### 5. Settlements Can Be Partial

You don't have to settle the full amount at once:
- Owe $100, pay $50 now → Record $50 settlement
- Transaction shows $50 remaining
- Pay $50 later → Record another settlement

## Migration Notes

### Database Change

```sql
ALTER TABLE dbo.transactions 
ADD COLUMN "paidBy" varchar(200) NULL;
```

### Backward Compatibility

Existing transactions:
- If `paidBy` is `NULL` → Treated as "you" paid (default behavior)
- If `isReimbursable = true` and `paidBy` is `NULL` → Auto-set to "you" in migration

## UI Flow

### Transaction Form

When "Mark as reimbursable" is checked:

```
┌─────────────────────────────────────┐
│ ☑ Mark as reimbursable              │
├─────────────────────────────────────┤
│ Who Paid? *                         │
│ ┌─────────────────────────────────┐ │
│ │ ▼ You (money from your account) │ │
│ │   John (they paid for you)      │ │
│ │   Sarah (they paid for you)     │ │
│ └─────────────────────────────────┘ │
│ 💳 Deducted from your account       │
├─────────────────────────────────────┤
│ Who will reimburse?                 │
│ ┌─────────────────────────────────┐ │
│ │ John                            │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ Settlement Group (optional)         │
│ ┌─────────────────────────────────┐ │
│ │ weekend-trip                    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Settlements Page

```
┌────────────────────────────────────────┐
│ Settlements              ➕ Record     │
├────────────────────────────────────────┤
│                                        │
│ 💰 They Owe You     💸 You Owe Them   │
│ ┌─────────────┐     ┌─────────────┐   │
│ │ John  $165  │     │ Sarah $200  │   │
│ │ Mike   $50  │     │ Alex   $75  │   │
│ └─────────────┘     └─────────────┘   │
│                                        │
├────────────────────────────────────────┤
│ Settlement History                     │
│ ┌────────────────────────────────────┐ │
│ │ 👤 John  📁 weekend-trip           │ │
│ │ $165 • Dec 14, 2025                │ │
│ │ Note: Settled in cash              │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

## Troubleshooting

### Q: My account balance is wrong after friend paid

**A:** Check that `accountId` is `null` or not set when creating the transaction. If friend paid, no account deduction should occur.

### Q: Transaction shows in wrong section of Settlements

**A:** Check the `paidBy` field:
- Shows in "They Owe You" → `paidBy = 'you'`
- Shows in "You Owe Them" → `paidBy = counterpartyName`

### Q: Can I change who paid after creating transaction?

**A:** Yes, edit the transaction and update the "Who Paid?" field. The settlements page will reflect the change.

### Q: Do I need to use settlement groups?

**A:** No, groups are optional. They're helpful for organizing related expenses (trips, events) but not required for basic reimbursement tracking.

## Summary

The split-expense feature with `paidBy` field enables:

✅ Proper category tracking (Food, Transport, etc.)
✅ Accurate account balances (only deduct when you pay)
✅ Bidirectional reimbursement tracking (both ways)
✅ Settlement grouping for related expenses
✅ Clear visualization of who owes whom
✅ Partial and full settlement recording

This solves the problem: "I buy items; friend pays; I reimburse days later" by tracking the purchase correctly while recording that your friend paid and you owe them money.
