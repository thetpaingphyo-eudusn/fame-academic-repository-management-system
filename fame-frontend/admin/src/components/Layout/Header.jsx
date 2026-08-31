import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Code2, Loader2, Menu, MessageCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { formatNotificationTime, useNotifications } from "../../context/NotificationContext";
import IconGlass from "../IconGlass";

const Header = ({ onMenuClick, sidebarOpen }) => {
  const { user } = useAuth();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const { totalUnread } = useChat() || {};
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = (notif) => {
    if (!notif.read) markAsRead(notif._id);
  };

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
      <div className="px-4 sm:px-6 py-3 flex justify-between items-center">
        <button onClick={onMenuClick} className="lg:hidden p-1 rounded-xl hover:bg-gray-100">
          <IconGlass interactive className="text-gray-600"><Menu size={18} /></IconGlass>
        </button>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          <Link
            to="/messages"
            className="relative p-1 rounded-xl hover:bg-gray-100 text-gray-500"
            title="Messages"
          >
            <IconGlass interactive><MessageCircle size={17} /></IconGlass>
            {totalUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </Link>

          <Link
            to="/rag"
            className="p-1 rounded-xl hover:bg-gray-100"
            title="FAME"
          >
            <IconGlass interactive><img src="/fame-logo.png" alt="FAME" className="w-[17px] h-[17px] object-contain" /></IconGlass>
          </Link>
          <Link
            to="/coding-assistant"
            className="p-1 rounded-xl hover:bg-gray-100 text-indigo-600"
            title="Coding Assistant"
          >
            <IconGlass interactive><Code2 size={17} /></IconGlass>
          </Link>

          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-1 rounded-xl hover:bg-gray-100"
            >
              <IconGlass interactive className="text-gray-500"><Bell size={17} /></IconGlass>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
                <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin text-blue-400" size={20} />
                    </div>
                  ) : notifications.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-8">No notifications yet</p>
                  ) : (
                    notifications.map((notif) => (
                      <button
                        key={notif._id}
                        type="button"
                        onClick={() => handleOpen(notif)}
                        className={`w-full text-left p-3 border-b border-gray-50 hover:bg-gray-50 ${
                          !notif.read ? "bg-blue-50/60" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800">{notif.title}</p>
                          {!notif.read && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatNotificationTime(notif.createdAt)}</p>
                      </button>
                    ))
                  )}
                </div>
                <div className="p-2 text-center border-t border-gray-100">
                  <Link to="/notifications" className="text-xs text-blue-500 hover:text-blue-600" onClick={() => setShowNotifications(false)}>
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-gray-200">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">{user?.name?.charAt(0) || "A"}</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-700">{user?.name?.split(" ")[0] || "Admin"}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role || "Administrator"}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
