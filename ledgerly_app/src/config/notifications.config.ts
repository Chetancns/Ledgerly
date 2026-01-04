/**
 * Notification System Configuration
 * 
 * Adjust these settings to optimize for your hosting resources
 */

export const NOTIFICATION_CONFIG = {
  /**
   * Polling interval in milliseconds
   * - 300000 (5 minutes) - Recommended for limited hosting resources
   * - 60000 (1 minute) - More frequent updates, higher server load
   * - 0 - Disable auto-polling entirely (manual refresh only)
   * 
   * Default: 300000 (5 minutes)
   */
  POLLING_INTERVAL: 300000,

  /**
   * Fetch only unread notifications during auto-polling
   * This significantly reduces server load by not fetching all notifications every time
   * 
   * Default: true (recommended for limited resources)
   */
  FETCH_UNREAD_ONLY: true,

  /**
   * Maximum number of notifications to keep in memory
   * Older notifications will be removed from the UI (but not from backend)
   * 
   * Default: 100
   */
  MAX_NOTIFICATIONS_IN_MEMORY: 100,
};
