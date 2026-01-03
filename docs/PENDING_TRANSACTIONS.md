# Pending Transactions Guide

## Overview

The Pending Transactions feature allows you to track transactions that are authorized but not yet posted to your account. This is essential for maintaining accurate balance tracking when dealing with:

- **Hotel reservations** - Often authorized immediately but posted 3-10 days later
- **Car rentals** - Pre-authorization that posts after return
- **Gas station holds** - Initial hold that adjusts when final amount posts
- **Restaurant tips** - Initial charge that updates when tip is added
- **Online orders** - Authorization that posts when item ships

## Key Concepts

### Transaction Status

Every transaction has one of three statuses:

1. **Posted** (default)
   - Transaction has cleared and is reflected in your account balance
   - Most common status for regular transactions

2. **Pending**
   - Transaction is authorized but NOT yet posted
   - **Does NOT affect your account balance**
   - Useful for tracking upcoming charges

3. **Cancelled**
   - Transaction was cancelled or reversed
   - Does NOT affect your account balance
   - Useful for record-keeping

### Expected Post Date

For pending transactions, you can optionally set an **Expected Post Date** - the date you anticipate the transaction will clear. This helps you:
- Plan for future cash flow
- Know when to check if a pending charge has posted
- Track delays in transaction posting

## How It Works

### Balance Calculation

**Important:** Only transactions with `status: posted` affect your account balance.

Example:
- Account balance: $1,000
- Add pending transaction: -$200 (hotel booking)
- **Account balance remains $1,000**
- Mark transaction as posted
- **Account balance becomes $800**

### Workflow

```
Create Transaction → Set Status to "Pending" → Add Expected Post Date
                                ↓
                    Wait for transaction to clear
                                ↓
                    Mark as "Posted" (updates balance)
```

## Using the Feature

### Creating a Pending Transaction

#### Via Web Interface

1. Go to **Transactions** page
2. Click **Add Transaction**
3. Fill in transaction details:
   - Account: Select your account
   - Category: Select appropriate category
   - Amount: Enter the authorized amount
   - Description: e.g., "Marriott Hotel - NYC"
   - Transaction Date: Date of authorization
   - **Status**: Select **"⏳ Pending (Not yet posted)"**
   - **Expected Post Date**: Enter when you expect it to clear (e.g., 10 days later)
4. Click **Add Transaction**

#### Via API

```bash
POST /transactions
Content-Type: application/json

{
  "accountId": "uuid",
  "categoryId": "uuid",
  "amount": "250.00",
  "type": "expense",
  "description": "Hotel reservation - Marriott NYC",
  "transactionDate": "2024-01-15",
  "status": "pending",
  "expectedPostDate": "2024-01-25"
}
```

### Viewing Pending Transactions

#### Filter by Status

1. Go to **Transactions** page
2. Use the **Status** filter dropdown
3. Select **"⏳ Pending"**
4. View all pending transactions

#### API Endpoint

```bash
GET /transactions/pending
```

Or filter manually:
```bash
GET /transactions?status=pending
```

### Marking as Posted

When a pending transaction clears your account:

#### Quick Action (Web Interface)

1. Find the pending transaction in your list
2. Click the **"✅ Post"** button (green button that appears only for pending transactions)
3. Transaction status updates to "posted" and your balance is adjusted

#### Via Edit Form

1. Click **Edit** (✏️) on the transaction
2. Change **Status** to **"✅ Posted (Cleared)"**
3. Click **Update Transaction**

#### Via API

```bash
PATCH /transactions/:id/status
Content-Type: application/json

{
  "status": "posted"
}
```

### Bulk Update (API Only)

Mark multiple pending transactions as posted at once:

```bash
PATCH /transactions/bulk/status
Content-Type: application/json

{
  "ids": ["uuid1", "uuid2", "uuid3"],
  "status": "posted"
}
```

## Visual Indicators

### Transaction List View

Pending transactions show:
- **Yellow badge**: "⏳ Pending"
- **Expected post date** (if set): "→ Jan 25, 2024"
- **Quick action button**: "✅ Post" to mark as posted

### Transaction Table View

- **Status column** shows color-coded badges:
  - 🟢 Green: "✅ Posted"
  - 🟡 Yellow: "⏳ Pending"
  - ⚫ Gray: "❌ Cancelled"

## Best Practices

### When to Use Pending Status

✅ **Good Use Cases:**
- Hotel bookings that take days to post
- Car rental pre-authorizations
- Large purchases that may take time to clear
- Any transaction where authorization and posting are separated

❌ **Avoid Using For:**
- Regular daily transactions (groceries, gas, etc.) - use "Posted"
- Instant debit card purchases - use "Posted"
- Cash transactions - use "Posted"

### Setting Expected Post Dates

- **Hotels**: Usually 3-10 days after checkout
- **Car Rentals**: 2-7 days after return
- **Online Orders**: When item ships (varies)
- **International Transactions**: Can take 5-14 days

### Reconciliation Workflow

1. **Weekly Review**: Check which pending transactions have posted
2. **Mark as Posted**: Update status when you see them on your bank statement
3. **Investigate Delays**: If expected post date passes and still pending, contact merchant
4. **Cancel if Needed**: If authorization expired or order cancelled, mark as "Cancelled"

## Account Balance vs Available Balance

### Current Implementation

The app currently shows **Posted Balance** - only includes posted transactions.

**Example:**
- Posted transactions: $1,000 income, $300 expenses = **$700 balance**
- Pending transactions: $200 hotel, $50 restaurant = **not included**
- **Displayed Balance: $700**

### Future Enhancement

A future update could show:
- **Available Balance**: Posted balance minus pending expenses
- **Posted Balance**: Current implementation
- **Pending Amount**: Total of pending transactions

## Common Scenarios

### Scenario 1: Hotel Booking

```
Day 1: Book hotel
→ Create transaction: status=pending, amount=$250, expectedPostDate=10 days

Day 2-9: Transaction shows as pending
→ Balance: Unaffected

Day 10: Charge posts to account
→ Click "✅ Post" button
→ Balance: Reduced by $250
```

### Scenario 2: Gas Station Hold

```
Step 1: Pump gas, $50 hold authorized
→ Create: status=pending, amount=$50

Step 2: Final amount is $35
→ Edit transaction, change amount to $35
→ Mark as posted
→ Balance: Reduced by $35
```

### Scenario 3: Cancelled Order

```
Step 1: Order item, $100 authorized
→ Create: status=pending, amount=$100

Step 2: Order cancelled
→ Edit transaction, change status to "cancelled"
→ Balance: Unaffected (remains unchanged)
```

## API Reference Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/transactions` | POST | Create new transaction (include status field) |
| `/transactions?status=pending` | GET | List pending transactions |
| `/transactions/pending` | GET | Get all pending transactions |
| `/transactions/:id/status` | PATCH | Update transaction status |
| `/transactions/bulk/status` | PATCH | Bulk update multiple transactions |
| `/transactions/:id` | PUT | Edit transaction (can change status) |

## Migration Guide

### For Existing Transactions

All existing transactions automatically have `status: posted` (default value set in migration). No action needed.

### Database Changes

The migration adds two new fields:
- `status` VARCHAR(20) DEFAULT 'posted'
- `expectedPostDate` DATE NULL

These are backward-compatible - existing code continues to work.

## Troubleshooting

### Balance Not Updating

**Issue:** Marked transaction as posted but balance didn't change

**Solutions:**
1. Refresh the page
2. Check transaction status is actually "posted" (not "pending")
3. Verify transaction has an account assigned
4. Check browser console for errors

### Can't Find Pending Transactions

**Issue:** Created pending transaction but can't see it

**Solutions:**
1. Remove status filter (set to "All Status")
2. Adjust date range filters
3. Check if transaction was created for correct account
4. Verify transaction wasn't accidentally marked as posted

### Expected Post Date Not Showing

**Issue:** Set expected post date but it's not visible

**Solutions:**
1. Expected post date only shows for pending transactions
2. Check transaction status is "pending"
3. Refresh the page if recently updated

## FAQs

**Q: Can I change a posted transaction back to pending?**
A: Yes, edit the transaction and change status. The balance will be adjusted accordingly.

**Q: What happens if I delete a pending transaction?**
A: It's removed from your records. Since it didn't affect balance, no balance adjustment occurs.

**Q: Can I have recurring pending transactions?**
A: Not currently. Recurring transactions are always created as posted. Mark them as pending after creation if needed.

**Q: Do pending transactions show in reports?**
A: Currently, reports may include all transactions regardless of status. Filter by status=posted for accurate financial reports.

**Q: Can I set a default status for new transactions?**
A: Not currently. The default is always "posted". You must manually select "pending" when needed.

---

## Support

For issues, feature requests, or questions about pending transactions:
- Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
- Review [API Reference](./API_REFERENCE.md)
- Check [Database Schema](./DATABASE_SCHEMA.md)
