"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import toast from "react-hot-toast";

export type NotificationType = "budget_limit" | "debt_reminder" | "recurring_payment" | "info" | "success" | "warning" | "error";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = "ledgerly-notifications";

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return parsed.map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp),
          }));
        } catch (e) {
          console.error("Failed to parse notifications from localStorage", e);
        }
      }
    }
    return [];
  });

  const saveToStorage = useCallback((notifs: Notification[]) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs));
    }
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      read: false,
    };

    setNotifications((prev) => {
      const updated = [newNotification, ...prev];
      saveToStorage(updated);
      return updated;
    });

    // Show toast notification based on type
    const toastMessage = `${notification.title}: ${notification.message}`;
    switch (notification.type) {
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
  }, [saveToStorage]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    saveToStorage([]);
  }, [saveToStorage]);

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
