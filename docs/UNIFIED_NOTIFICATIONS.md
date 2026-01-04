# Unified Notification System

## Overview

The Ledgerly notification system is now fully integrated, combining backend persistent notifications with frontend toast alerts to provide a seamless experience **without duplicates**.

---

## How It Works

### Backend Notifications (Database)

**Created By:**
- Auto-post cron job (when pending transactions are posted)
- Future: System events, critical alerts

**Stored In:**
- PostgreSQL database (`dbo.notifications` table)
- Persistent across sessions
- Full CRUD via REST API

**Endpoints:**
```
GET    /notifications              - List all notifications
GET    /notifications/unread-count - Get unread count
PATCH  /notifications/:id/read     - Mark as read
PATCH  /notifications/read-all     - Mark all as read
DELETE /notifications/:id          - Delete notification
```

### Frontend Integration

**NotificationContext** (`src/context/NotificationContext.tsx`)
- Fetches backend notifications on mount
- Polls every 60 seconds for new notifications
- Shows toast for new unread notifications (once per notification)
- Syncs read/delete actions with backend
- Tracks shown notifications to prevent duplicates

**How Duplicates Are Prevented:**
1. **Backend Notifications**: 
   - Track shown notification IDs in localStorage (`ledgerly-shown-notification-ids`)
   - Only show toast once per notification ID
   - Survives page refresh
   
2. **Budget/Debt/Recurring Alerts**:
   - Track notified events in localStorage (per budget, debt, recurring item)
   - Only show once per month for budget alerts
   - Only show once per due date for debt/recurring alerts
   - Prevents re-triggering on every poll

---

## User Experience Flow

### Auto-Posted Transaction

**Day 1**: User creates pending hotel booking
```
Amount: $250
Status: pending
Expected Post Date: Jan 25
Balance: $1,000 (unchanged)
```

**Day 25 at 3:00 AM**: Cron job runs
```
1. Finds transaction (expectedPostDate reached)
2. Updates status to 'posted'
3. Balance updated: $1,000 - $250 = $750
4. Creates backend notification in database
5. Logs: "Posted transaction abc-123"
```

**User opens app at 9:00 AM**:
```
1. Frontend fetches notifications from backend
2. Finds new unread notification
3. Shows toast: "💰 Pending Transaction Posted: Your pending..."
4. Adds notification ID to shown list (localStorage)
5. Notification appears in notification center
```

**User refreshes page**:
```
1. Frontend fetches notifications again
2. Notification ID already in shown list
3. No toast shown (prevents duplicate)
4. Notification still visible in notification center
```

**User clicks notification**:
```
1. Marks as read on backend via API
2. Updates UI optimistically
3. Notification stays in history (not deleted)
```

### Budget Warning

**Budget reaches 90%**:
```
1. useNotificationTriggers hook polls budgets
2. Detects budget at 92%
3. Checks localStorage: not notified about this budget this month
4. Shows toast: "⚠️ Budget Warning: You've used 92%..."
5. Adds to localStorage: "budget-xyz-90-2024-1"
6. Creates LOCAL notification (not persisted to backend)
```

**User refreshes page**:
```
1. Hook polls budgets again
2. Budget still at 92%
3. Checks localStorage: already notified
4. No toast shown (prevents duplicate)
```

**Next month**:
```
1. Budget key changes to "budget-xyz-90-2024-2"
2. Not in localStorage yet
3. Will show toast again if budget reaches 90%
```

---

## Implementation Details

### NotificationContext Integration

```typescript
// Fetches backend notifications
const refreshNotifications = useCallback(async () => {
  const backendNotifications = await getNotifications();
  const converted = backendNotifications.map(convertBackendNotification);
  setNotifications(converted);

  // Show toast for NEW UNREAD notifications not yet shown
  const newUnread = converted.filter(
    n => !n.read && !shownNotificationIds.has(n.id)
  );
  
  newUnread.forEach(notification => {
    // Show toast based on type
    toast.success(notification.title + ": " + notification.message);
    
    // Mark as shown
    shownNotificationIds.add(notification.id);
  });
}, [shownNotificationIds]);

// Polls every 60 seconds
useEffect(() => {
  refreshNotifications();
  const interval = setInterval(refreshNotifications, 60000);
  return () => clearInterval(interval);
}, [refreshNotifications]);
```

### Duplicate Prevention for Budget Alerts

```typescript
// Track what we've notified in this session
const notifiedBudgets = getNotifiedSet(NOTIFIED_BUDGETS_KEY);

const checkBudgetLimits = async () => {
  const budgets = await getBudgets(...);
  
  budgets.forEach(budget => {
    const percentage = (spent / limit) * 100;
    const budgetKey = `${budget.id}-${month}-${year}`;
    
    // Only notify if NOT already notified this month
    if (percentage >= 90 && !notifiedBudgets.has(`${budgetKey}-90`)) {
      addNotification({ ... });
      notifiedBudgets.add(`${budgetKey}-90`);
      saveNotifiedSet(NOTIFIED_BUDGETS_KEY, notifiedBudgets);
    }
  });
};
```

---

## Notification Types

### Backend (Persistent)

**`transaction_posted`** 
- Created by auto-post cron job
- Persists in database
- Shows toast once
- Icon: 💰

**Future Types:**
- `budget_alert` - System-generated budget warnings
- `recurring_created` - Recurring transaction executed
- `system_alert` - Important system messages

### Frontend (Local, Temporary)

**`budget_limit`** / **`warning`**
- Budget threshold alerts (90%, 100%)
- Not persisted to backend
- Shows toast once per month
- Icon: ⚠️

**`debt_reminder`**
- Debt payment due date alerts
- Not persisted to backend
- Shows toast once per due date
- Icon: ⚖️

**`recurring_payment`**
- Upcoming recurring payment alerts
- Not persisted to backend
- Shows toast once per occurrence
- Icon: 🔁

**`success`** / **`error`** / **`info`**
- User action feedback
- Not persisted
- Shows immediately
- Icons: ✅ / ❌ / ℹ️

---

## API Integration

### Fetching Notifications

```typescript
import { getNotifications } from '@/services/notifications';

// Get all notifications
const all = await getNotifications(false);

// Get only unread
const unread = await getNotifications(true);
```

### Marking as Read

```typescript
import { markNotificationAsRead } from '@/services/notifications';

// Mark single notification as read
await markNotificationAsRead(notificationId);

// Mark all as read
await markAllNotificationsAsRead();
```

### Deleting Notifications

```typescript
import { deleteNotification } from '@/services/notifications';

// Delete notification from backend
await deleteNotification(notificationId);
```

---

## localStorage Keys

**Backend Notification Tracking:**
- `ledgerly-shown-notification-ids` - Array of notification IDs we've shown toasts for

**Frontend Alert Tracking:**
- `ledgerly-notified-budgets` - Array of budget alert keys we've shown
- `ledgerly-notified-debts` - Array of debt reminder keys we've shown
- `ledgerly-notified-recurring` - Array of recurring payment keys we've shown

**Key Formats:**
```
Budget:    "budget-{id}-90-{month}-{year}"  or  "budget-{id}-100-{month}-{year}"
Debt:      "debt-{id}-{dueDate}-7"  or  "debt-{id}-{dueDate}-0"
Recurring: "recurring-{id}-{nextDate}-2"  or  "recurring-{id}-{nextDate}-0"
```

---

## Configuration

### Polling Interval

**Backend Notifications:** 60 seconds
```typescript
// In NotificationContext.tsx
const interval = setInterval(refreshNotifications, 60000); // 60 seconds
```

**Budget/Debt/Recurring Checks:** 5 minutes
```typescript
// In useNotificationTriggers.ts
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
```

### Customization

To change polling intervals, modify the constants:

```typescript
// NotificationContext.tsx
const BACKEND_POLL_INTERVAL = 60000; // 1 minute

// useNotificationTriggers.ts
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
```

---

## Benefits

### ✅ No Duplicates
- Backend notifications shown once per notification
- Budget/debt/recurring alerts shown once per event
- Page refresh doesn't re-show notifications
- Works even if user closes/reopens browser

### ✅ Persistent History
- Backend notifications stored in database
- Can view notification history
- Can delete old notifications
- Survives across devices (database-backed)

### ✅ Optimistic UI
- Mark as read happens immediately in UI
- Backend sync happens in background
- If sync fails, UI reverts to accurate state

### ✅ Real-time Updates
- Polls every 60 seconds for new notifications
- Auto-shows toast for new unread items
- Updates notification center automatically

### ✅ Smart Tracking
- Budget alerts: Once per month per threshold
- Debt alerts: Once per due date
- Recurring alerts: Once per occurrence
- Backend notifications: Once ever

---

## Troubleshooting

### "I'm seeing duplicate toasts"

**Check:**
1. Clear localStorage: `localStorage.removeItem('ledgerly-shown-notification-ids')`
2. Check browser console for errors
3. Verify backend notifications API is working: `GET /notifications`

### "Notifications not showing up"

**Check:**
1. Backend cron job running? Check logs at 3:00 AM
2. Pending transactions with `expectedPostDate <= today`?
3. Frontend polling? Check Network tab for `/notifications` requests every 60s
4. Browser console for errors

### "Toast shows every time I refresh"

**This should NOT happen.** If it does:
1. Check localStorage has `ledgerly-shown-notification-ids`
2. Check notification ID is being added to the set
3. Check `shownNotificationIds.has(n.id)` is working
4. File a bug report

### "Budget alert shows every 5 minutes"

**Check:**
1. localStorage has `ledgerly-notified-budgets`
2. Budget key format is correct: `budget-{id}-90-{month}-{year}`
3. `notifiedBudgets.has()` check is working
4. Clear localStorage to reset: `localStorage.removeItem('ledgerly-notified-budgets')`

---

## Migration from Old System

The old localStorage-only system has been replaced. On first load:

1. Old notifications in localStorage are **ignored**
2. Backend notifications are fetched and displayed
3. New tracking system takes over
4. No data loss (old toasts were temporary anyway)

**No migration needed** - the new system starts fresh!

---

## Summary

The unified notification system provides:

- **Backend notifications** for important system events (auto-posted transactions)
- **Frontend alerts** for real-time warnings (budgets, debts, recurring)
- **No duplicates** via intelligent tracking
- **Persistent history** via database storage
- **Real-time updates** via polling
- **Optimistic UI** for instant feedback

**Result:** A professional notification experience with zero duplicate annoyance! 🎉
