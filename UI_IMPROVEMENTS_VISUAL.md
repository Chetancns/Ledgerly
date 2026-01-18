# Enhanced Recurring Transaction UI - Visual Guide

## New Card Layout

### Status Badges (Top Right)
```
┌─────────────────────────────────────────────────┐
│                         [⏸ PAUSED] ← Yellow     │
│  Monthly Rent             OR                    │
│  $1,200  [EXPENSE]     [⚠ OVERDUE] ← Red        │
│                            OR                   │
│  📅 Monthly • 📆 Next: 2026-02-01              │
│                    [🔔 DUE IN 3 DAYS] ← Blue    │
│  From: Checking Account                        │
│  Category: Housing                             │
│                                                 │
│  [Tag1] [Tag2]                    [✏️] ← Edit  │
│                                    [⚡] ← Trigger│
│                                    [⏸] ← Pause  │
│                                    [🗑️] ← Delete│
└─────────────────────────────────────────────────┘
```

## Card Border Colors

### Paused Transaction
```
╔═══════════════════════════════════════╗  ← Yellow border (2px)
║  [⏸ PAUSED]                           ║
║  Monthly Savings                      ║
║  $500  [TRANSFER]                     ║
║  📅 Weekly • 📆 Next: 2026-01-25      ║
║  From: Checking → To: Savings         ║
╚═══════════════════════════════════════╝
```

### Overdue Transaction
```
╔═══════════════════════════════════════╗  ← Red border (2px)
║  [⚠ OVERDUE]                          ║
║  Gym Membership                       ║
║  $50  [EXPENSE]                       ║
║  📅 Monthly • 📆 Next: 2026-01-10     ║
║  From: Checking                       ║
╚═══════════════════════════════════════╝
```

### Due Soon (Within 7 Days)
```
╔═══════════════════════════════════════╗  ← Blue border (2px)
║  [🔔 DUE IN 3 DAYS]                   ║
║  Internet Bill                        ║
║  $75  [EXPENSE]                       ║
║  📅 Monthly • 📆 Next: 2026-01-21     ║
║  From: Checking                       ║
╚═══════════════════════════════════════╝
```

### Normal (Not Due Soon)
```
┌───────────────────────────────────────┐  ← Gray border (2px)
│  Salary Deposit                       │
│  $3,000  [INCOME]                     │
│  📅 Monthly • 📆 Next: 2026-02-15     │
│  To: Checking                         │
└───────────────────────────────────────┘
```

## Type Badges

**Income:**
```
$3,000  [INCOME]  ← Green background
```

**Expense:**
```
$1,200  [EXPENSE]  ← Red background
```

**Transfer/Savings:**
```
$500  [TRANSFER]  ← Blue background
$500  [SAVINGS]   ← Blue background
```

## Form UI (Transfer/Savings)

When "Transfer" or "Savings" is selected:

```
┌─────────────────────────────────────┐
│  Type: [Transfer ▼]                 │  ← Dropdown shows all 4 types
├─────────────────────────────────────┤
│  From Account: [Checking ▼]         │
├─────────────────────────────────────┤
│  To Account: [Savings ▼]            │  ← Only shows for Transfer/Savings
├─────────────────────────────────────┤
│  Category: [Transfer ▼]             │
├─────────────────────────────────────┤
│  Frequency: [Monthly ▼]             │
├─────────────────────────────────────┤
│  Amount: [500]                      │
├─────────────────────────────────────┤
│  Next Occurrence: [2026-02-01]      │
├─────────────────────────────────────┤
│  Description: Monthly savings       │
├─────────────────────────────────────┤
│  Tags: [Goal: House] [Automated]    │  ← Tag input with search
├─────────────────────────────────────┤
│  [Add]  [Cancel]                    │
└─────────────────────────────────────┘
```

## Action Buttons (Vertical Stack)

```
[✏️]  ← Edit (Blue background)
[⚡]  ← Trigger Now (Yellow background)
[⏸]  ← Pause (Blue background)
     OR
[▶️]  ← Resume (Blue background)
[🗑️]  ← Delete (Red background)
```

## Smart Features

### Days Calculation
- **Overdue**: Next date is in the past → Red "⚠ OVERDUE"
- **Due Soon**: Next date within 7 days → Blue "🔔 DUE IN X DAYS"
- **Upcoming**: Next date more than 7 days away → No special badge
- **Paused**: Status is paused → Yellow "⏸ PAUSED" (ignores date)

### Visual Hierarchy
1. **Status Badge** (top right) - Most important
2. **Amount** (large, bold, colored)
3. **Type Badge** (colored background)
4. **Date Info** (with emoji icons)
5. **Account Details** (clear labels)
6. **Tags** (colored chips)
7. **Actions** (vertical, colored backgrounds)

## Benefits

✅ **At a glance visibility** - Status badges show what needs attention
✅ **Color coding** - Quick identification by border color
✅ **Better UX** - Larger text, clearer layout, more spacing
✅ **Smart alerts** - Automatic calculation of due dates
✅ **Action clarity** - Vertical buttons with colored backgrounds
✅ **Transfer support** - Form shows "To Account" when needed
✅ **Tag support** - Easy tag selection and display
