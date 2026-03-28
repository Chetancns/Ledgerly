"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import toast from "react-hot-toast";
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification,
  BackendNotification 
} from "@/services/notifications";
import { NOTIFICATION_CONFIG } from "@/config/notifications.config";

export type NotificationType = "transaction_posted" | "budget_limit" | "debt_reminder" | "recurring_payment" | "info" | "success" | "warning" | "error";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  unreadCount: number;
  refreshNotifications: (fetchAll?: boolean) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Track which backend notifications we've already shown as toasts
const SHOWN_NOTIFICATIONS_KEY = "ledgerly-shown-notification-ids";

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [shownNotificationIds, setShownNotificationIds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(SHOWN_NOTIFICATIONS_KEY);
      if (stored) {
        try {
          return new Set(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse shown notifications from localStorage", e);
        }
      }
    }
    return new Set();
  });

  // Save shown notification IDs to localStorage
  const saveShownIds = useCallback((ids: Set<string>) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(SHOWN_NOTIFICATIONS_KEY, JSON.stringify(Array.from(ids)));
    }
  }, []);

  // Convert backend notification to frontend format
  const convertBackendNotification = (backendNotif: BackendNotification): Notification => ({
    id: backendNotif.id,
    type: backendNotif.type as NotificationType,
    title: backendNotif.title,
    message: backendNotif.message,
    timestamp: new Date(backendNotif.createdAt),
    read: backendNotif.isRead,
    metadata: backendNotif.metadata,
    actionUrl: backendNotif.metadata?.actionUrl,
  });

  // Fetch notifications from backend
  const refreshNotifications = useCallback(async (fetchAll = false) => {
    try {
      // Fetch only unread notifications by default to reduce server load (configurable)
      // Pass fetchAll=true to get all notifications (e.g., when user opens notification center)
      const shouldFetchUnreadOnly = !fetchAll && NOTIFICATION_CONFIG.FETCH_UNREAD_ONLY;
      const backendNotifications = await getNotifications(shouldFetchUnreadOnly);
      const converted = backendNotifications.map(convertBackendNotification);
      
      if (fetchAll) {
        // Replace all notifications (limit to max in memory)
        const limited = converted.slice(0, NOTIFICATION_CONFIG.MAX_NOTIFICATIONS_IN_MEMORY);
        setNotifications(limited);
      } else {
        // Merge unread with existing read notifications
        setNotifications(prev => {
          const existingRead = prev.filter(n => n.read);
          const newUnreadIds = new Set(converted.map(n => n.id));
          const keptRead = existingRead.filter(n => !newUnreadIds.has(n.id));
          const merged = [...converted, ...keptRead];
          // Limit total notifications in memory
          return merged.slice(0, NOTIFICATION_CONFIG.MAX_NOTIFICATIONS_IN_MEMORY);
        });
      }

      // Show toast for new unread notifications that we haven't shown yet
      const newUnread = converted.filter(n => !n.read && !shownNotificationIds.has(n.id));
      
      newUnread.forEach(notification => {
        const toastMessage = `${notification.title}: ${notification.message}`;
        switch (notification.type) {
          case "transaction_posted":
            toast.success(toastMessage, { duration: 5000, icon: "💰" });
            break;
          case "budget_limit":
          case "warning":
            toast.error(toastMessage, { duration: 5000, icon: "⚠️" });
            break;
          case "debt_reminder":
          case "recurring_payment":
            toast(toastMessage, { duration: 5000, icon: "🔔" });
            break;
          case "success":
            toast.success(toastMessage, { duration: 4000 });
            break;
          case "error":
            toast.error(toastMessage, { duration: 5000 });
            break;
          default:
            toast(toastMessage, { duration: 4000, icon: "ℹ️" });
        }

        // Mark this notification as shown
        setShownNotificationIds(prev => {
          const updated = new Set(prev);
          updated.add(notification.id);
          saveShownIds(updated);
          return updated;
        });
      });
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, [shownNotificationIds, saveShownIds]);

  // Load notifications on mount and poll periodically.
  // Skip entirely on unauthenticated pages (login, signup) to avoid leaking
  // data from stale session cookies before the user has actively authenticated.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      const isAuthRoute = ["/login", "/signup", "/auth"].some((r) =>
        pathname.startsWith(r)
      );
      if (isAuthRoute) return;
    }

    refreshNotifications();

    // Use configurable polling interval to reduce server load
    // Set NOTIFICATION_CONFIG.POLLING_INTERVAL to 0 to disable auto-polling entirely
    const pollingInterval = NOTIFICATION_CONFIG.POLLING_INTERVAL;

    if (pollingInterval > 0) {
      const interval = setInterval(refreshNotifications, pollingInterval);
      return () => clearInterval(interval);
    }
  }, [refreshNotifications]);

  // Add notification (for immediate UI feedback, not persisted to backend automatically)
  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: `local-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false,
    };

    setNotifications((prev) => [newNotification, ...prev]);

    // Show toast notification based on type
    const toastMessage = `${notification.title}: ${notification.message}`;
    switch (notification.type) {
      case "transaction_posted":
        toast.success(toastMessage, { duration: 5000, icon: "💰" });
        break;
      case "budget_limit":
      case "warning":
        toast.error(toastMessage, { duration: 5000, icon: "⚠️" });
        break;
      case "debt_reminder":
      case "recurring_payment":
        toast(toastMessage, { duration: 5000, icon: "🔔" });
        break;
      case "success":
        toast.success(toastMessage, { duration: 4000 });
        break;
      case "error":
        toast.error(toastMessage, { duration: 5000 });
        break;
      default:
        toast(toastMessage, { duration: 4000, icon: "ℹ️" });
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistically update UI
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

    // If it's a backend notification, mark it on the backend
    if (!id.startsWith("local-")) {
      try {
        await markNotificationAsRead(id);
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
        // Revert on error
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
      }
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    // Optimistically update UI
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    // Mark all backend notifications as read
    try {
      await markAllNotificationsAsRead();
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      // Refresh to get accurate state
      await refreshNotifications(true);
    }
  }, [refreshNotifications]);

  const removeNotification = useCallback(async (id: string) => {
    // Optimistically update UI
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    // If it's a backend notification, delete it from backend
    if (!id.startsWith("local-")) {
      try {
        await deleteNotification(id);
      } catch (error) {
        console.error("Failed to delete notification:", error);
        // Refresh to get accurate state
        await refreshNotifications(true);
      }
    }
  }, [refreshNotifications]);

  const clearAll = useCallback(async () => {
    // Clear local notifications and reset the shown-IDs set so that a
    // subsequent login starts with a clean slate (no cross-session state).
    setNotifications([]);
    setShownNotificationIds(new Set());
    if (typeof window !== "undefined") {
      localStorage.removeItem(SHOWN_NOTIFICATIONS_KEY);
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
        unreadCount,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
