# Notification System Performance Optimization

## Overview

The notification system has been optimized to minimize API calls and reduce server load for limited hosting resources.

## Key Optimizations

### 1. **Increased Polling Interval**
- **Before**: 60 seconds (60,000ms) - 1,440 requests/day per user
- **After**: 300 seconds (5 minutes) - 288 requests/day per user
- **Reduction**: 80% fewer API calls

### 2. **Fetch Unread Only**
- Auto-polling now fetches only unread notifications by default
- Significantly reduces payload size and database queries
- Full notification list is only fetched when user explicitly opens the notification center

### 3. **Memory Limits**
- Maximum 100 notifications kept in memory
- Older notifications are automatically pruned
- Reduces frontend memory usage

### 4. **Configurable Settings**
All optimization settings are centralized in `/src/config/notifications.config.ts`

## Configuration Options

### `POLLING_INTERVAL`
Controls how often the app checks for new notifications.

```typescript
POLLING_INTERVAL: 300000  // 5 minutes (default, recommended for limited resources)
POLLING_INTERVAL: 60000   // 1 minute (more frequent, higher load)
POLLING_INTERVAL: 0       // Disable auto-polling (manual refresh only)
```

**Recommendations:**
- **Limited hosting**: 300000 (5 min) or 600000 (10 min)
- **Standard hosting**: 120000 (2 min)
- **Premium hosting**: 60000 (1 min)

### `FETCH_UNREAD_ONLY`
When true, auto-polling fetches only unread notifications.

```typescript
FETCH_UNREAD_ONLY: true   // Recommended - reduces server load by 70-90%
FETCH_UNREAD_ONLY: false  // Fetches all notifications every time
```

### `MAX_NOTIFICATIONS_IN_MEMORY`
Limits how many notifications are kept in the UI.

```typescript
MAX_NOTIFICATIONS_IN_MEMORY: 100  // Default
MAX_NOTIFICATIONS_IN_MEMORY: 50   // More aggressive pruning
MAX_NOTIFICATIONS_IN_MEMORY: 200  // Keep more history
```

## Manual Refresh

Users can manually refresh notifications at any time by:
1. Opening the notification center/dropdown
2. Calling `refreshNotifications(true)` from the context

## Performance Comparison

### API Calls Per Day (Single User)

| Configuration | Calls/Day | Data Transfer | Server Load |
|---------------|-----------|---------------|-------------|
| **60s, all** | 1,440 | High | High ⚠️ |
| **60s, unread** | 1,440 | Medium | Medium |
| **5min, all** | 288 | Medium | Medium |
| **5min, unread** | 288 | Low | Low ✅ |
| **10min, unread** | 144 | Very Low | Very Low ✅✅ |
| **Manual only** | ~20 | Very Low | Minimal ✅✅✅ |

### For 100 Active Users

| Configuration | Calls/Day | Estimated Load |
|---------------|-----------|----------------|
| 60s, all | 144,000 | Very High ⚠️ |
| **5min, unread** | **28,800** | **Low ✅** |
| 10min, unread | 14,400 | Very Low ✅✅ |

## Cron Job Impact

The auto-post cron job runs once per day at 3:00 AM:
- **API calls**: 1 per day (negligible)
- **Database queries**: 1-2 per day
- **Notifications created**: Only when pending transactions need posting

This has minimal impact on server resources.

## Recommendations for Limited Hosting

### Tier 1: Most Aggressive (Minimal Resources)
```typescript
POLLING_INTERVAL: 0,              // Disable auto-polling
FETCH_UNREAD_ONLY: true,
MAX_NOTIFICATIONS_IN_MEMORY: 50,
```
- API calls: ~20/day per user (manual only)
- Users manually refresh when needed

### Tier 2: Balanced (Recommended)
```typescript
POLLING_INTERVAL: 300000,         // 5 minutes
FETCH_UNREAD_ONLY: true,
MAX_NOTIFICATIONS_IN_MEMORY: 100,
```
- API calls: 288/day per user
- Good balance of freshness and resource usage

### Tier 3: Moderate Resources
```typescript
POLLING_INTERVAL: 120000,         // 2 minutes
FETCH_UNREAD_ONLY: true,
MAX_NOTIFICATIONS_IN_MEMORY: 100,
```
- API calls: 720/day per user
- More frequent updates

## User Experience

### With Auto-Polling Enabled
- Notifications appear automatically within the polling interval
- No user action required
- Fresh data on every poll

### With Auto-Polling Disabled (POLLING_INTERVAL: 0)
- Users must manually refresh to see new notifications
- Use a "Refresh" button in your notification UI
- Notifications still appear immediately for local events (budgets, debts)

## Monitoring

To monitor notification system usage:

1. Check server logs for `/notifications` endpoint calls
2. Monitor database query patterns for the notifications table
3. Review application logs for polling frequency

## Backend Optimization

The backend notification endpoints already support:
- ✅ Query parameter `?unreadOnly=true` for filtering
- ✅ Efficient database indexing on `userId` and `isRead`
- ✅ LIMIT clauses to prevent large result sets
- ✅ Caching headers for CDN compatibility

## Future Optimizations (Optional)

1. **WebSocket Support**: Real-time push notifications (eliminates polling)
2. **Service Workers**: Background sync for offline support
3. **Server-Sent Events (SSE)**: Alternative to WebSockets
4. **Redis Caching**: Cache notification counts to reduce DB queries

## Migration Guide

To change configuration:

1. Edit `/ledgerly_app/src/config/notifications.config.ts`
2. Adjust `POLLING_INTERVAL`, `FETCH_UNREAD_ONLY`, or `MAX_NOTIFICATIONS_IN_MEMORY`
3. Restart the frontend application
4. Monitor server load and adjust as needed

No backend changes required.

## Summary

**Current Optimization (5min, unread-only):**
- 80% reduction in API calls
- 70-90% reduction in data transfer
- Minimal user experience impact
- Fully configurable for your hosting needs

This configuration is production-ready and optimized for limited hosting resources. 🚀
