import React, { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Loader2, Mail, MailOpen } from "lucide-react";
import { formatNotificationTime, useNotifications } from "../context/NotificationContext";

const NotificationHistoryPanel = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh } = useNotifications();
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.read);
    return notifications;
  }, [notifications, filter]);

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50/80 to-white">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-blue-600" />
          <div>
            <p className="font-semibold text-gray-800">Notification history</p>
            <p className="text-xs text-gray-500">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {[
              { id: "all", label: "All" },
              { id: "unread", label: "Unread" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 ${filter === tab.id ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-blue-400" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 px-4">
          <Bell size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">
            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {filtered.map((notif) => (
            <li key={notif._id}>
              <button
                type="button"
                onClick={() => !notif.read && markAsRead(notif._id)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${!notif.read ? "bg-blue-50/40" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      notif.read ? "bg-gray-100 text-gray-400" : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {notif.read ? <MailOpen size={16} /> : <Mail size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-gray-800 text-sm">{notif.title}</p>
                      {!notif.read && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {notif.senderName ? `From ${notif.senderName} · ` : ""}
                      {formatNotificationTime(notif.createdAt)}
                    </p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NotificationHistoryPanel;
