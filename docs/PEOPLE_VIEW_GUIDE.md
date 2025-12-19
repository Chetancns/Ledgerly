# People View (Splitwise-Style) - User Guide

## Overview

The People View provides a Splitwise-inspired interface for managing debts, focusing on per-person balances rather than individual debts. It's perfect for quickly seeing who owes what and settling up with ease.

## Accessing People View

1. Navigate to the Debts page
2. Click the **"👥 People View"** toggle button in the header
3. Switch back to **"📋 Standard View"** anytime for detailed debt management

## Features

### 1. Person-Centric Balance Display

Each person is shown in a card with:
- **Profile Avatar**: Color-coded circular avatar with initials
- **Person Name**: Full name of the counterparty
- **Debt Count**: Number of active debts with this person
- **Net Balance**: Consolidated balance showing:
  - 🟢 **"owes you $X"** (green) - When they owe you money
  - 🟠 **"you owe $X"** (orange) - When you owe them money
  - ⚪ **"settled up"** (grey) - When net balance is zero

### 2. Net Balance Calculation

The People View automatically calculates net balances:

**Example:**
- You lent John $200 (2 debts)
- You borrowed $50 from John (1 debt)
- **Net: John owes you $150**

This eliminates mental math and provides instant clarity on actual amounts owed.

### 3. Expandable Details

Click any person card to expand and see:
- **You owe:** Total you borrowed from them
- **They owe:** Total you lent to them
- **Details:** List of individual debts with amounts
- **Settle Up button:** One-click settlement of all debts

### 4. One-Click Settlement

The **"Settle Up"** button:
- Settles ALL debts with that person at once
- Uses batch settlement API (same as Standard View)
- Auto-selects your first account
- Creates a single transaction for the total amount
- Transaction type based on net balance direction:
  - Positive net → Income transaction (receiving money)
  - Negative net → Expense transaction (paying money)

### 5. Groups Tab

Switch to the **Groups** tab to see:
- All settlement groups with debts
- Net balance per group
- Total number of debts in each group
- Quick overview of group financial status

### 6. Overall Summary

At the bottom, see your complete financial picture:
- **Total you owe:** Sum of all negative net balances
- **Total owed to you:** Sum of all positive net balances

## User Flows

### Quick Settlement Flow

1. Open People View
2. Find the person you want to settle with
3. Click their card to expand
4. Click **"Settle Up"** button
5. ✅ Done! All debts settled in one transaction

### Viewing Debt Details

1. Open People View
2. Click any person card to expand
3. See breakdown:
   - What you owe them
   - What they owe you
   - Individual debt details
4. Click card again to collapse

### Checking Group Balances

1. Open People View
2. Click **"Groups"** tab
3. See all settlement groups with net balances
4. Switch back to **"People"** tab for person view

## Visual Design

### Avatar Colors

Avatars are automatically color-coded based on the person's name:
- Blue, Green, Purple, Pink, Yellow, Indigo, Red
- Colors are consistent for the same person
- Helps quickly identify people visually

### Initials

Avatars show up to 2 initials:
- "John Doe" → "JD"
- "Sarah Miller" → "SM"
- "Alice" → "AL"

### Balance Colors

- 🟢 **Green text:** Positive balance (they owe you)
- 🟠 **Orange text:** Negative balance (you owe them)
- ⚪ **Grey text:** Zero balance (settled)

## When to Use Each View

### Use Standard View When:
- You need to see all individual debts
- You want detailed filtering and search
- You need to manage debts one by one
- You want full control over status, dates, notes
- You're tracking institutional debts (loans, credit cards)

### Use People View When:
- You want a quick overview of balances
- You're settling up with friends
- You want to see who you owe at a glance
- You prefer a simple, clean interface
- You're familiar with Splitwise

## Tips & Best Practices

### 1. Regular Check-Ins
- Open People View weekly to see outstanding balances
- Settle up when balances get large
- Use Groups tab to review trip/event expenses

### 2. Clean Settlement
- Settle all debts with a person at once using "Settle Up"
- This creates one transaction instead of multiple
- Keeps transaction history clean

### 3. Group Organization
- Use settlement groups to organize related debts
- Example: "vegas-trip", "dinner-party", "shared-rent"
- View group balances in Groups tab

### 4. Quick Reconciliation
- Use People View to quickly verify amounts before settling
- Expand person card to review individual debts
- Ensure all debts are accounted for

## Keyboard Shortcuts

- **Tab**: Navigate between person cards
- **Enter**: Expand/collapse selected card
- **Arrow Keys**: Move between cards
- **Esc**: Collapse expanded card

## Mobile Experience

People View is fully responsive:
- Touch-friendly card expansion
- Large tap targets for "Settle Up"
- Swipe gestures supported
- Optimized layout for small screens

## Integration with Standard View

Both views share the same data:
- Changes in one view immediately reflect in the other
- Use Standard View to create debts
- Use People View to settle them
- All features work seamlessly together

## Behind the Scenes

### Data Processing

The People View:
1. Loads all unsettled debts
2. Groups debts by counterpartyName
3. Calculates net balance per person
4. Sorts by absolute balance (largest first)
5. Generates consistent avatar colors

### Performance

- Uses memoization for efficient calculations
- Only shows unsettled debts by default
- Lazy loading for large datasets
- Optimized re-renders

## Troubleshooting

### "All settled up!" Message

**Cause:** No active debts with net balances
**Solution:** This is good! You're all caught up. Create new debts in Standard View if needed.

### Person Not Showing

**Cause:** All debts with that person are settled
**Solution:** People with zero net balance are hidden. Switch to Standard View → "Settled" filter to see history.

### Wrong Net Balance

**Cause:** Debts may not be properly marked with counterpartyName
**Solution:** Go to Standard View, find debts without names, edit to add counterpartyName.

### "Settle Up" Not Working

**Cause:** No accounts exist
**Solution:** Create an account first in Accounts page, then try again.

## Future Enhancements

Planned features for People View:
- [ ] Net balance charts over time
- [ ] Payment reminders
- [ ] Split expense calculator
- [ ] Direct payment integration
- [ ] Activity feed per person
- [ ] Export settlement history

## Feedback

We're continuously improving People View! Your feedback helps us make it better.

---

**Quick Reference:**
- 👥 People View = Person-centric, Splitwise-style
- 📋 Standard View = Debt-centric, detailed management
- Toggle anytime in header
- Both views use same data
- Use what works best for you!
