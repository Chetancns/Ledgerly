# Auto-Post Pending Transactions & Notifications

## Overview

The system now automatically posts pending transactions when their expected post date is reached and notifies users about the posting. This eliminates the need for users to manually mark transactions as posted.

---

## Auto-Post Cron Job

### How It Works

**Schedule**: Runs daily at 3:00 AM (configurable)
**Query**: Finds all pending transactions where `expectedPostDate <= today`
**Action**: 
1. Updates transaction status from 'pending' to 'posted'
2. Updates account balance automatically
3. Creates a notification for the user
4. Logs the operation with detailed results

### Configuration

Set the timezone via environment variable:
```bash
CRON_TIMEZONE=America/New_York
# or
CRON_TIMEZONE=Asia/Kolkata
# Default: UTC
```

### Example Flow

```
Day 1: Create pending hotel booking
- Amount: $250
- Status: pending
- Expected Post Date: 2024-01-25
- Balance: Unchanged ($1,000)

Day 2-24: Transaction remains pending
- Balance: Still $1,000
- User sees pending transaction in list

Day 25 at 3:00 AM: Cron job runs
- System finds transaction (expectedPostDate <= today)
- Updates status to 'posted'
- Balance updated: $1,000 - $250 = $750
- Notification created and sent to user
- Logs: "Posted transaction abc-123 for user xyz-789"

Day 25 onward:
- User sees notification: "Pending Transaction Posted"
- Transaction shows as ✅ Posted
- Balance reflects the posting
```

### Logging

The cron job provides detailed logging:
```
[TransactionsService] Starting auto-post of pending transactions...
[TransactionsService] Found 3 pending transaction(s) to post.
[TransactionsService] Posted transaction abc-123 for user user-1
[TransactionsService] Posted transaction def-456 for user user-2
[TransactionsService] Failed to post transaction ghi-789: Account not found
[TransactionsService] Auto-post completed: 2 posted, 1 errors.
```

### Error Handling

- **Individual Failures**: If one transaction fails, others continue processing
- **Detailed Errors**: Each error is logged with transaction ID and reason
- **User Impact**: Failed transactions remain pending, user can manually post
- **Monitoring**: Check application logs for cron job results

---

## Notifications System

### Features

**Types of Notifications:**
- `transaction_posted` - When pending transaction is auto-posted
- `budget_alert` - Budget threshold alerts (future)
- `recurring_created` - Recurring transaction executed (future)
- `general` - General system notifications

**Notification Structure:**
```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "type": "transaction_posted",
  "title": "Pending Transaction Posted",
  "message": "Your pending transaction of $250.00 (Hotel & Lodging - Checking Account) has been automatically posted.",
  "isRead": false,
  "metadata": {
    "transactionId": "tx-uuid",
    "amount": "250.00",
    "accountId": "acc-uuid",
    "categoryId": "cat-uuid",
    "expectedPostDate": "2024-01-25",
    "actualPostDate": "2024-01-25"
  },
  "createdAt": "2024-01-25T03:00:15.234Z"
}
```

### API Endpoints

#### Get All Notifications
```http
GET /notifications
Authorization: Bearer <token>

# Optional: Get only unread
GET /notifications?unreadOnly=true
```

**Response:**
```json
[
  {
    "id": "uuid",
    "type": "transaction_posted",
    "title": "Pending Transaction Posted",
    "message": "...",
    "isRead": false,
    "metadata": {...},
    "createdAt": "2024-01-25T03:00:15.234Z"
  }
]
```

#### Get Unread Count
```http
GET /notifications/unread-count
Authorization: Bearer <token>
```

**Response:**
```json
{
  "count": 5
}
```

#### Mark as Read
```http
PATCH /notifications/:id/read
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "isRead": true,
  ...
}
```

#### Mark All as Read
```http
PATCH /notifications/read-all
Authorization: Bearer <token>
```

**Response:**
```json
{
  "updated": true
}
```

#### Delete Notification
```http
DELETE /notifications/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "deleted": true
}
```

---

## Database Schema

### Notifications Table

```sql
CREATE TABLE dbo.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID NOT NULL REFERENCES dbo.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  isRead BOOLEAN DEFAULT false,
  metadata JSONB NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IDX_notifications_userId ON dbo.notifications(userId);
CREATE INDEX IDX_notifications_isRead ON dbo.notifications(isRead);
CREATE INDEX IDX_notifications_userId_isRead ON dbo.notifications(userId, isRead);
```

**Indexes Explained:**
- `userId`: Fast lookup of user's notifications
- `isRead`: Quick filtering of unread notifications
- `userId + isRead`: Optimized for common query pattern

---

## Frontend Integration (To Be Implemented)

### Notification Bell Component

**Suggested Implementation:**
```typescript
// In Layout.tsx or Header component
import { useNotifications } from '@/hooks/useNotifications';

function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  
  return (
    <div className="relative">
      <button onClick={() => setShowNotifications(!showNotifications)}>
        🔔
        {unreadCount > 0 && (
          <span className="badge">{unreadCount}</span>
        )}
      </button>
      
      {showNotifications && (
        <NotificationDropdown 
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
        />
      )}
    </div>
  );
}
```

### Custom Hook

```typescript
// hooks/useNotifications.ts
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    
    // Poll every 60 seconds for new notifications
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    const res = await api.get('/notifications');
    setNotifications(res.data);
  };

  const fetchUnreadCount = async () => {
    const res = await api.get('/notifications/unread-count');
    setUnreadCount(res.data.count);
  };

  const markAsRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    await fetchNotifications();
    await fetchUnreadCount();
  };

  const markAllAsRead = async () => {
    await api.patch('/notifications/read-all');
    await fetchNotifications();
    setUnreadCount(0);
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
```

### Notification Display

**Suggested UI:**
```jsx
<div className="notification">
  <div className="flex items-start gap-3">
    <div className="icon">
      {type === 'transaction_posted' && '💰'}
      {type === 'budget_alert' && '⚠️'}
    </div>
    <div className="flex-1">
      <h4 className="font-semibold">{title}</h4>
      <p className="text-sm text-gray-600">{message}</p>
      <span className="text-xs text-gray-400">
        {formatDistanceToNow(createdAt)} ago
      </span>
    </div>
    {!isRead && <span className="badge">New</span>}
  </div>
</div>
```

---

## Benefits

### For Users
✅ **No Manual Work**: Transactions post automatically
✅ **Stay Informed**: Notifications keep users updated
✅ **Accurate Balance**: Balance reflects reality as charges clear
✅ **Peace of Mind**: System handles posting on schedule
✅ **Audit Trail**: Notifications serve as history

### For System
✅ **Automation**: Reduces manual user actions
✅ **Consistency**: Posting happens on schedule
✅ **Scalability**: Handles any number of pending transactions
✅ **Reliability**: Error handling prevents failures from affecting others
✅ **Monitoring**: Detailed logging for troubleshooting

---

## Configuration Options

### Environment Variables

```bash
# Cron job timezone (default: UTC)
CRON_TIMEZONE=America/Los_Angeles

# Optional: Disable auto-post if needed
# (If you want to only use manual posting)
# DISABLE_AUTO_POST=true
```

### Future Enhancements

- **Configurable Schedule**: Allow admins to set custom cron schedule
- **Notification Preferences**: Let users choose notification types
- **Push Notifications**: Mobile push for real-time alerts
- **Email Notifications**: Send email digest of posted transactions
- **Batch Processing**: Optimize for large numbers of transactions
- **Retry Logic**: Automatically retry failed postings

---

## Testing

### Manual Testing

**Test Auto-Post:**
1. Create pending transaction with expectedPostDate = today
2. Wait for cron job (3:00 AM) or trigger manually
3. Verify transaction status changed to 'posted'
4. Verify balance updated
5. Verify notification created

**Test Notifications:**
1. Check notifications endpoint: `GET /notifications`
2. Verify notification appears with correct details
3. Mark as read: `PATCH /notifications/:id/read`
4. Verify isRead changed to true
5. Delete notification: `DELETE /notifications/:id`

### Trigger Cron Manually (for testing)

```typescript
// In your test or admin controller
@Get('trigger-auto-post')
async triggerAutoPost() {
  return this.transactionsService.autoPostPendingTransactions();
}
```

---

## Migration

### Running the Migration

```bash
cd ledgerly-api
npm run migration:run
```

This creates the `dbo.notifications` table with all necessary indexes and constraints.

### Rollback (if needed)

```bash
npm run migration:revert
```

---

## Monitoring

### Check Cron Job Logs

```bash
# View application logs
tail -f logs/app.log | grep "auto-post"

# Expected output:
[TransactionsService] Starting auto-post of pending transactions...
[TransactionsService] Found 5 pending transaction(s) to post.
[TransactionsService] Auto-post completed: 5 posted, 0 errors.
```

### Database Queries

**Check pending transactions due:**
```sql
SELECT * FROM dbo.transactions 
WHERE status = 'pending' 
  AND "expectedPostDate" <= CURRENT_DATE;
```

**Check recent notifications:**
```sql
SELECT * FROM dbo.notifications 
WHERE "createdAt" > NOW() - INTERVAL '24 hours'
ORDER BY "createdAt" DESC;
```

**Check unread notifications per user:**
```sql
SELECT "userId", COUNT(*) 
FROM dbo.notifications 
WHERE "isRead" = false
GROUP BY "userId";
```

---

## Summary

The auto-post feature with notifications provides a complete automation solution:

1. **Cron Job** runs daily at 3:00 AM
2. **Finds** pending transactions where expectedPostDate has passed
3. **Posts** transactions (updates status and balance)
4. **Notifies** users with detailed information
5. **Logs** results for monitoring

Users can now set pending transactions and forget about them - the system handles the rest! 🎉
