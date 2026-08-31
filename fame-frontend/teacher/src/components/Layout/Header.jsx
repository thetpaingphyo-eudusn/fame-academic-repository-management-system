import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Code2, HelpCircle, Loader2, LogOut, Menu, MessageCircle, Settings, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { formatNotificationTime, useNotifications } from "../../context/NotificationContext";
import IconGlass from "../IconGlass";

const Header = ({ onMenuClick, sidebarCollapsed }) => {
  const { user, logout } = useAuth();
  const { totalUnread } = useChat() || {};
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = (notif) => {
    if (!notif.read) markAsRead(notif._id);
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-20 border-b border-blue-100">
      <div className="px-4 sm:px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="lg:hidden p-1 rounded-xl hover:bg-blue-50 text-blue-600 transition-colors">
            <IconGlass interactive><Menu size={18} /></IconGlass>
          </button>
          {sidebarCollapsed ? (
            <div className="hidden lg:block">
              <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">F</span>
              </div>
            </div>
          ) : (
            <div className="hidden lg:block">
              <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Teacher Dashboard
              </h1>
              <p className="text-xs text-gray-400">Manage your classes and projects</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Link to="/messages" className="relative p-1 rounded-xl hover:bg-blue-50 transition-colors" title="Messages">
            <IconGlass interactive className="text-blue-600"><MessageCircle size={17} /></IconGlass>
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </Link>

          <Link to="/assistant" className="p-1 rounded-xl hover:bg-blue-50 transition-colors" title="FAME">
            <IconGlass interactive><img src="/fame-logo.png" alt="FAME" className="w-[17px] h-[17px] object-contain" /></IconGlass>
          </Link>
          <Link to="/coding-assistant" className="p-1 rounded-xl hover:bg-blue-50 transition-colors" title="Coding Assistant">
            <IconGlass interactive className="text-indigo-600"><Code2 size={17} /></IconGlass>
          </Link>

          <div className="relative" ref={notificationRef}>
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-1 rounded-xl hover:bg-blue-50 transition-colors">
              <IconGlass interactive className="text-gray-500"><Bell size={17} /></IconGlass>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Notifications</h3>
                  {unreadCount > 0 && (
                    <button type="button" onClick={markAllAsRead} className="text-[10px] text-blue-600 font-medium">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
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
                        className={`w-full text-left p-3 border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${
                          !notif.read ? "bg-blue-50/50" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800">{notif.title}</p>
                          {!notif.read && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
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

          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 pl-2 border-l border-gray-200 hover:bg-blue-50 rounded-xl transition-colors p-1"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white text-sm font-medium">{user?.name?.charAt(0) || "T"}</span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-700">{user?.name?.split(" ")[0] || "Teacher"}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.role || "Teacher"}</p>
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                  <p className="text-sm font-medium text-gray-800">{user?.name}</p>
                  <p className="text-xs text-gray-400">{user?.email}</p>
                </div>
                <div className="py-2">
                  <a href="/profile" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 transition-colors">
                    <User size={16} /> Profile
                  </a>
                  <Link to="/settings" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 transition-colors">
                    <Settings size={16} /> Settings
                  </Link>
                  <a href="/help" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 transition-colors">
                    <HelpCircle size={16} /> Help
                  </a>
                </div>
                <div className="border-t border-gray-100 py-2">
                  <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors">
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
