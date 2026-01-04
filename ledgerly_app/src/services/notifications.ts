import api from "./api";

export interface BackendNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: any;
  createdAt: string;
}

// Get all notifications (with optional filter for unread only)
export const getNotifications = async (unreadOnly = false): Promise<BackendNotification[]> => {
  const url = unreadOnly ? "/notifications?unreadOnly=true" : "/notifications";
  const response = await api.get(url);
  return response.data;
};

// Get count of unread notifications
export const getUnreadCount = async (): Promise<number> => {
  const response = await api.get("/notifications/unread-count");
  return response.data.count;
};

// Mark a notification as read
export const markNotificationAsRead = async (id: string): Promise<BackendNotification> => {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data;
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (): Promise<{ updated: boolean }> => {
  const response = await api.patch("/notifications/read-all");
  return response.data;
};

// Delete a notification
export const deleteNotification = async (id: string): Promise<{ deleted: boolean }> => {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
};
