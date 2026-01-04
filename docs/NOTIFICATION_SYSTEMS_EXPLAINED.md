# Notification Systems Comparison

## Two Separate Notification Systems

Ledgerly now has **two independent notification systems** serving different purposes:

---

## 1. Frontend Toast Notifications (Client-Side)

**Location**: `ledgerly_app/src/context/NotificationContext.tsx`

**Purpose**: Immediate, temporary UI notifications (toasts/alerts)

**Implementation**:
- Uses React Context API
- Stored in browser memory (not persistent)
- Disappears after a few seconds
- Used for immediate feedback

**Hook**: `useNotificationTriggers()` 
- Location: `ledgerly_app/src/hooks/useNotificationTriggers.ts`
- Checks every 5 minutes for:
  - Budget limits (90% and 100% warnings)
  - Debt payment reminders
  - Upcoming recurring payments
- Shows **temporary toast notifications**

**Usage Example**:
```typescript
const { addNotification } = useNotifications();

addNotification({
  type: "success",
  title: "Transaction Created!",
  message: "Your transaction has been saved.",
});
```

**Characteristics**:
- ❌ Not stored in database
- ❌ Not persistent across sessions
- ✅ Immediate visual feedback
- ✅ Auto-dismisses after timeout
- ✅ Good for real-time UI alerts

---

## 2. Backend Database Notifications (Server-Side)

**Location**: `ledgerly-api/src/notifications/`

**Purpose**: Persistent, historical notification records

**Implementation**:
- Stored in PostgreSQL database (`dbo.notifications` table)
- Persists across sessions
- Can be marked as read/unread
- Retrieved via REST API

**Created By**:
- Auto-post cron job (when pending transactions are posted)
- Future: Budget alerts, recurring transaction notifications, etc.

**API Endpoints**:
```
GET    /notifications              - List all notifications
GET    /notifications/unread-count - Get unread count
PATCH  /notifications/:id/read     - Mark as read
PATCH  /notifications/read-all     - Mark all as read
DELETE /notifications/:id          - Delete notification
```

**Usage Example** (Backend):
```typescript
await this.notificationsService.create(
  userId,
  'transaction_posted',
  'Pending Transaction Posted',
  `Your pending transaction of $250.00 has been posted.`,
  { transactionId: tx.id, amount: tx.amount }
);
```

**Characteristics**:
- ✅ Stored in database
- ✅ Persistent across sessions
- ✅ Historical record
- ✅ Can be retrieved later
- ✅ Good for important system events

---

## How They Work Together

### Current Implementation

**Auto-Post Cron Job** (3:00 AM daily):
1. Finds pending transactions with `expectedPostDate <= today`
2. Updates transaction status to 'posted'
3. Updates account balance
4. **Creates database notification** (Backend System)
5. Logs the operation

**User Opens App Next Day**:
1. Frontend fetches notifications: `GET /notifications`
2. Shows unread count in notification bell icon
3. User clicks bell to see notifications
4. User sees: "Pending Transaction Posted" with details
5. User can mark as read or delete

**Meanwhile, if Budget Limit Reached**:
1. `useNotificationTriggers` hook runs every 5 minutes
2. Detects budget at 90%
3. **Shows toast notification** (Frontend System)
4. Toast disappears after 5 seconds
5. No database record created

---

## Integration Recommendation

### Option A: Keep Separate (Current)

**Backend Notifications**: For important system events
- Auto-posted transactions
- System-generated alerts
- Historical records needed

**Frontend Toasts**: For UI feedback
- User action confirmations
- Budget warnings during session
- Temporary alerts

### Option B: Integrate Them

You could enhance the frontend to:

1. **Fetch backend notifications on mount**:
```typescript
// In Layout.tsx or App component
useEffect(() => {
  const fetchNotifications = async () => {
    const res = await api.get('/notifications?unreadOnly=true');
    res.data.forEach(notif => {
      addNotification({
        type: notif.type,
        title: notif.title,
        message: notif.message,
        persistent: true, // Don't auto-dismiss
      });
    });
  };
  fetchNotifications();
}, []);
```

2. **Show backend notifications as toasts**:
```typescript
// When transaction is auto-posted
// Backend creates notification in DB
// Frontend polls for new notifications
// Shows as toast + adds to notification center
```

3. **Combine both systems**:
```typescript
const createNotification = async (notif) => {
  // Save to database (backend)
  await api.post('/notifications', notif);
  
  // Show as toast (frontend)
  addNotification({
    type: notif.type,
    title: notif.title,
    message: notif.message,
  });
};
```

---

## Recommended Frontend Implementation

### 1. Create Notification Bell Component

```typescript
// components/NotificationBell.tsx
import { useEffect, useState } from 'react';
import api from '@/services/api';

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    const res = await api.get('/notifications/unread-count');
    setUnreadCount(res.data.count);
  };

  const fetchNotifications = async () => {
    const res = await api.get('/notifications');
    setNotifications(res.data);
  };

  const handleOpen = async () => {
    setIsOpen(true);
    await fetchNotifications();
  };

  const markAsRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    await fetchNotifications();
    await fetchUnreadCount();
  };

  return (
    <div className="relative">
      <button onClick={handleOpen} className="relative">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full px-2 py-0.5 text-xs">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white shadow-lg rounded-lg">
          <div className="p-4 border-b">
            <h3 className="font-bold">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.map(notif => (
              <div
                key={notif.id}
                className={`p-4 border-b ${!notif.isRead ? 'bg-blue-50' : ''}`}
                onClick={() => markAsRead(notif.id)}
              >
                <h4 className="font-semibold">{notif.title}</h4>
                <p className="text-sm text-gray-600">{notif.message}</p>
                <span className="text-xs text-gray-400">
                  {new Date(notif.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 2. Add to Layout

```typescript
// components/Layout.tsx
import { NotificationBell } from './NotificationBell';

export default function Layout({ children }) {
  return (
    <div>
      <header>
        <nav>
          {/* Other nav items */}
          <NotificationBell />
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
```

### 3. Optionally Show as Toasts

```typescript
// hooks/useBackendNotifications.ts
import { useEffect } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import api from '@/services/api';

export function useBackendNotifications() {
  const { addNotification } = useNotifications();

  useEffect(() => {
    const checkNewNotifications = async () => {
      const res = await api.get('/notifications?unreadOnly=true');
      
      // Show first unread notification as toast
      if (res.data.length > 0) {
        const latest = res.data[0];
        addNotification({
          type: latest.type,
          title: latest.title,
          message: latest.message,
        });
      }
    };

    // Check on mount and every 2 minutes
    checkNewNotifications();
    const interval = setInterval(checkNewNotifications, 120000);
    return () => clearInterval(interval);
  }, []);
}
```

---

## Summary

### Frontend Toast Notifications (`useNotificationTriggers`)
- **Purpose**: Immediate UI feedback and warnings
- **Storage**: Browser memory only
- **Lifetime**: Temporary (few seconds)
- **Use For**: Budget warnings, debt reminders, recurring payment alerts
- **Already Implemented**: ✅ Yes

### Backend Database Notifications
- **Purpose**: Persistent system notifications
- **Storage**: PostgreSQL database
- **Lifetime**: Permanent until deleted
- **Use For**: Auto-posted transactions, system events, historical records
- **Already Implemented**: ✅ Yes (backend only)
- **Frontend Integration**: ❌ Not yet (see recommendations above)

### They Are Independent
- Backend notifications do NOT use `useNotificationTriggers`
- `useNotificationTriggers` does NOT create database notifications
- They can coexist and serve different purposes
- You can integrate them if desired (see recommendations)

---

## Next Steps

1. **Keep as is**: Two separate systems for different purposes
2. **Add notification bell**: Show backend notifications in UI (recommended)
3. **Integrate systems**: Make them work together for unified experience
4. **Enhance auto-post**: Show toast when backend notification is created

Choose based on your UX requirements!
