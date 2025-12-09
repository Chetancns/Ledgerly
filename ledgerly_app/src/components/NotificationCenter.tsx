"use client";

import React, { useState } from "react";
import { useNotifications } from "@/context/NotificationContext";
import { useTheme } from "@/context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications();
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "budget_limit":
        return "💰";
      case "debt_reminder":
        return "⚖️";
      case "recurring_payment":
        return "🔁";
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      default:
        return "ℹ️";
    }
  };

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications. ${unreadCount} unread`}
        aria-expanded={isOpen}
        className="relative p-2 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
        style={{
          backgroundColor: isOpen ? "var(--bg-card-hover)" : "transparent",
          color: "var(--text-primary)",
        }}
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
            style={{
              backgroundColor: "var(--color-error)",
              color: "var(--text-inverse)",
            }}
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <div
              className="fixed inset-0 z-40 md:hidden"
              onClick={() => setIsOpen(false)}
              style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            />

            {/* Notification Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="fixed md:absolute top-14 right-0 md:right-0 w-full md:w-96 max-h-[80vh] md:max-h-[600px] overflow-hidden rounded-none md:rounded-xl shadow-2xl z-50"
              style={{
                backgroundColor: theme === "dark" 
                  ? "rgba(49, 46, 129, 0.98)" 
                  : "rgba(255, 255, 255, 0.98)",
                backdropFilter: "blur(12px)",
                border: "1px solid var(--border-primary)",
              }}
              role="dialog"
              aria-label="Notification center"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10"
                style={{
                  borderColor: "var(--border-primary)",
                  backgroundColor: theme === "dark" 
                    ? "rgba(49, 46, 129, 0.95)" 
                    : "rgba(255, 255, 255, 0.95)",
                }}
              >
                <h2
                  className="text-lg font-bold"
                  style={{ color: "var(--text-primary)" }}
                  id="notification-center-title"
                >
                  Notifications {unreadCount > 0 && `(${unreadCount})`}
                </h2>
                <div className="flex gap-2">
                  {notifications.length > 0 && (
                    <>
                      <button
                        onClick={markAllAsRead}
                        className="text-xs px-2 py-1 rounded hover:opacity-80 transition"
                        style={{
                          color: "var(--accent-primary)",
                          backgroundColor: "var(--bg-card)",
                        }}
                        aria-label="Mark all as read"
                      >
                        Mark all read
                      </button>
                      <button
                        onClick={clearAll}
                        className="text-xs px-2 py-1 rounded hover:opacity-80 transition"
                        style={{
                          color: "var(--color-error)",
                          backgroundColor: "var(--bg-card)",
                        }}
                        aria-label="Clear all notifications"
                      >
                        Clear all
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="md:hidden text-xl p-1"
                    style={{ color: "var(--text-muted)" }}
                    aria-label="Close notifications"
                  >
                    ✖
                  </button>
                </div>
              </div>

              {/* Notification List */}
              <div className="overflow-y-auto max-h-[calc(80vh-60px)] md:max-h-[540px]">
                {notifications.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center py-12 px-4"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <span className="text-5xl mb-3">🔕</span>
                    <p className="text-center">No notifications yet</p>
                    <p className="text-xs text-center mt-2">
                      You'll receive updates about budgets, debts, and recurring payments here.
                    </p>
                  </div>
                ) : (
                  <div role="list" aria-labelledby="notification-center-title">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        role="listitem"
                        className={`px-4 py-3 border-b transition-all ${
                          !notification.read ? "opacity-100" : "opacity-60"
                        }`}
                        style={{
                          borderColor: "var(--border-secondary)",
                          backgroundColor: !notification.read
                            ? "var(--bg-card-hover)"
                            : "transparent",
                        }}
                      >
                        {notification.actionUrl ? (
                          <Link
                            href={notification.actionUrl}
                            onClick={() => handleNotificationClick(notification)}
                            className="block hover:opacity-80 transition"
                          >
                            <NotificationContent notification={notification} getIcon={getNotificationIcon} />
                          </Link>
                        ) : (
                          <div onClick={() => markAsRead(notification.id)}>
                            <NotificationContent notification={notification} getIcon={getNotificationIcon} />
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 mt-2">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs px-2 py-1 rounded transition"
                              style={{
                                color: "var(--accent-primary)",
                                backgroundColor: "var(--bg-card)",
                              }}
                              aria-label="Mark as read"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            onClick={() => removeNotification(notification.id)}
                            className="text-xs px-2 py-1 rounded transition"
                            style={{
                              color: "var(--color-error)",
                              backgroundColor: "var(--bg-card)",
                            }}
                            aria-label="Dismiss notification"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper component for notification content
function NotificationContent({ notification, getIcon }: any) {
  return (
    <div className="flex gap-3">
      <span className="text-2xl flex-shrink-0" aria-hidden="true">
        {getIcon(notification.type)}
      </span>
      <div className="flex-1 min-w-0">
        <h3
          className="font-semibold text-sm mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          {notification.title}
        </h3>
        <p
          className="text-xs mb-1 break-words"
          style={{ color: "var(--text-secondary)" }}
        >
          {notification.message}
        </p>
        <time
          className="text-xs"
          style={{ color: "var(--text-muted)" }}
          dateTime={notification.timestamp.toISOString()}
        >
          {formatTimestamp(notification.timestamp)}
        </time>
      </div>
    </div>
  );
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
