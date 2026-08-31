import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { getSocketUrl, socketOptions } from "../utils/socketConfig";
import { Bell, X } from "lucide-react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

export const useNotifications = () => useContext(NotificationContext);

const TOKEN_KEY = "teacherToken";

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const socketRef = useRef(null);
  const alertTimerRef = useRef(null);

  const showAlert = (notification) => {
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    setAlert(notification);
    alertTimerRef.current = setTimeout(() => setAlert(null), 6000);
  };

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        api.get("/notifications", { params: { page: 1, limit: 100 } }),
        api.get("/notifications/unread-count"),
      ]);
      setNotifications(listRes.data.data || []);
      setUnreadCount(countRes.data.data?.unreadCount ?? 0);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (error) {
      console.error("Failed to mark notification read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all read:", error);
    }
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }

    fetchNotifications();

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return undefined;

    const socket = io(getSocketUrl(), socketOptions(token));
    socketRef.current = socket;

    socket.on("notification:new", ({ notification, unreadCount: count }) => {
      if (notification) {
        setNotifications((prev) => [notification, ...prev.filter((n) => n._id !== notification._id)]);
        showAlert(notification);
      }
      if (typeof count === "number") setUnreadCount(count);
    });

    socket.on("notification:count", ({ unreadCount: count }) => {
      if (typeof count === "number") setUnreadCount(count);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh: fetchNotifications }}
    >
      {children}
      {alert && (
        <div className="fixed top-20 right-4 z-[100] w-[min(360px,calc(100vw-2rem))]">
          <div className="bg-white border border-blue-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-white">
              <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                <Bell size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{alert.title}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-3">{alert.message}</p>
              </div>
              <button type="button" onClick={() => setAlert(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const formatNotificationTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};
