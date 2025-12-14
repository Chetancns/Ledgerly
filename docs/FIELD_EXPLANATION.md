# Reimbursable Transaction Fields Explained

## Overview

When creating a reimbursable transaction, you'll see two important fields that might seem similar but serve different purposes:

1. **"Who Paid?"** (`paidBy`)
2. **"Who are you splitting with?"** (`counterpartyName`)

## Why Two Fields?

These fields track different aspects of a shared expense:

### `paidBy` - WHO PHYSICALLY PAID
This field tracks **who actually paid the money** at the time of purchase.

- **"you"** → Money came from YOUR account (will be deducted from your balance)
- **"Friend's Name"** → Money came from THEIR account (NO deduction from your balance)

### `counterpartyName` - WHO YOU'RE SETTLING WITH
This field tracks **who you're splitting the expense with** and need to settle with later.

## Common Scenarios

### Scenario 1: You Pay, They Owe You

**Example:** You pay $100 for dinner, John will pay you back his $50 share.

```
Who Paid?: you
Who are you splitting with?: John
Amount: $100
```

**Result:**
- $100 deducted from your account
- Transaction shows in settlements page under "They Owe You" → John owes $50 (or whatever portion)
- When John pays you back, you record a settlement

### Scenario 2: They Pay, You Owe Them

**Example:** Sarah pays $100 for movie tickets, you'll pay her back your $50 share.

```
Who Paid?: Sarah
Who are you splitting with?: Sarah
Amount: $100
```

**Result:**
- NO deduction from your account (Sarah paid)
- Expense tracked with correct category (Entertainment)
- Transaction shows in settlements page under "You Owe Them" → You owe Sarah $50
- When you pay Sarah back, you record a settlement

### Scenario 3: Complex Split

**Example:** You're on a road trip with Mike. You paid for gas ($80), Mike paid for hotel ($200). You both split everything 50/50.

**Transaction 1 - Gas:**
```
Who Paid?: you
Who are you splitting with?: Mike
Amount: $80
Settlement Group: road-trip
```

**Transaction 2 - Hotel:**
```
Who Paid?: Mike
Who are you splitting with?: Mike
Amount: $200
Settlement Group: road-trip
```

**Result:**
- Gas: $80 deducted from your account, Mike owes you $40
- Hotel: NO deduction, you owe Mike $100
- Settlements page shows:
  - They Owe You: Mike $40
  - You Owe Them: Mike $100
  - **Net: You owe Mike $60**

## Why Not Just One Field?

You might ask: "Why not just use one field?"

The answer is: **WHO PAID ≠ WHO YOU'RE SPLITTING WITH (in complex scenarios)**

### Example Where They Differ:

Imagine a group dinner with 3 people (You, Alice, Bob):
- Total bill: $150
- Alice paid the entire bill
- You and Bob each owe Alice $50

**Your transaction:**
```
Who Paid?: Alice (she paid the whole thing)
Who are you splitting with?: Alice (you're settling with her)
Amount: $50 (your share)
```

**Bob's transaction** (on his phone):
```
Who Paid?: Alice
Who are you splitting with?: Alice
Amount: $50 (his share)
```

In this case, `paidBy` and `counterpartyName` are the same (both "Alice"). But conceptually:
- `paidBy` = Alice = the payer
- `counterpartyName` = Alice = who you need to settle with

### Another Example Where They Could Differ:

Imagine you buy concert tickets for yourself and your friend using your credit card, but your friend Sarah gave you cash upfront.

**Option A - Track as normal expense:**
```
(No reimbursable flag)
Your ticket was paid by you, friend's ticket was already settled
```

**Option B - Track split but already settled:**
```
Who Paid?: you
Who are you splitting with?: Sarah
Mark as settled immediately in settlement page
```

## Quick Reference

| Scenario | Who Paid? | Who are you splitting with? | Account Impact | Settlement View |
|----------|-----------|----------------------------|----------------|-----------------|
| You pay, they owe | you | Their name | ✅ Deducted | They Owe You |
| They pay, you owe | Their name | Their name | ❌ No deduction | You Owe Them |
| Both pay different things | you / their name | Their name | Varies | Both sections |

## Tips

1. **Auto-sync:** When you change "Who are you splitting with?", the system automatically updates "Who Paid?" to match (unless you explicitly set it to "you")

2. **Type freely:** Both fields support autocomplete but also let you type new names

3. **Validation:** You must specify who you're splitting with when marking a transaction as reimbursable

4. **Settlement Groups:** Use these to group related transactions for easier batch settlement (e.g., "weekend-trip", "dinner-friday")

## Still Confused?

**Simple rule:** 
- If YOU paid with YOUR money → "Who Paid?" = you
- If FRIEND paid with THEIR money → "Who Paid?" = friend's name
- "Who are you splitting with?" = The person you'll settle with later (usually the same as who paid if they're the only other person)
