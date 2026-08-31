import React, { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import IconGlass from "../IconGlass";

import { 
  LayoutDashboard, BookOpen, FolderKanban, Upload, MessageSquare,
  Star, User, Settings, LogOut, X, ChevronLeft, ChevronRight,
  Sparkles, GraduationCap, Award, AlertTriangle, Brain, Bell, MessageCircle
} from 'lucide-react';

const Sidebar = ({ isMobileOpen, setIsMobileOpen, isCollapsed, setIsCollapsed }) => {
  const { logout, user } = useAuth();
  const { totalUnread } = useChat() || {};
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem('studentSidebarCollapsed');
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('studentSidebarCollapsed', isCollapsed);
  }, [isCollapsed]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname, setIsMobileOpen]);

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'text-emerald-500', bgHover: 'hover:bg-emerald-50' },
    { path: '/my-courses', icon: BookOpen, label: 'My Courses', color: 'text-teal-500', bgHover: 'hover:bg-teal-50' },
    { path: '/my-projects', icon: FolderKanban, label: 'My Projects', color: 'text-amber-500', bgHover: 'hover:bg-amber-50' },
    { path: '/projects/upload', icon: Upload, label: 'Upload Project', color: 'text-sky-500', bgHover: 'hover:bg-sky-50' },
    { path: '/feedback', icon: MessageSquare, label: 'Feedback', color: 'text-rose-500', bgHover: 'hover:bg-rose-50' },
    { path: '/grades', icon: Award, label: 'My Grades', color: 'text-purple-500', bgHover: 'hover:bg-purple-50' },
    { path: '/assistant', icon: Brain, label: 'FAME', color: 'text-violet-500', bgHover: 'hover:bg-violet-50' },
    { path: '/coding-assistant', icon: Star, label: 'Coding Assistant', color: 'text-indigo-500', bgHover: 'hover:bg-indigo-50' },
    { path: '/notifications', icon: Bell, label: 'Notifications', color: 'text-orange-500', bgHover: 'hover:bg-orange-50' },
    { path: '/messages', icon: MessageCircle, label: 'Messages', color: 'text-sky-500', bgHover: 'hover:bg-sky-50' },
    { path: '/profile', icon: User, label: 'Profile', color: 'text-blue-500', bgHover: 'hover:bg-blue-50' },
    { path: '/settings', icon: Settings, label: 'Settings', color: 'text-gray-500', bgHover: 'hover:bg-gray-50' },
  ];

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  const handleLogoutClick = () => setShowLogoutModal(true);
  const handleConfirmLogout = async () => {
    await logout();
    setShowLogoutModal(false);
    navigate('/login');
  };
  const handleCancelLogout = () => setShowLogoutModal(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo Section */}
      <div className={`p-4 border-b border-emerald-100 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-2">
          <img
            src="/fame-logo.png"
            alt="FAME"
            className="w-9 h-9 object-contain shrink-0"
          />
          {!isCollapsed && (
            <div>
              <h1 className="font-bold text-gray-800 text-lg">FAME</h1>
              <p className="text-xs text-emerald-500">Student Portal</p>
            </div>
          )}
        </div>
        {!isCollapsed ? (
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-emerald-100 text-gray-400 transition-all">
            <ChevronLeft size={16} />
          </button>
        ) : (
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-emerald-100 text-gray-400 transition-all mt-2">
            <ChevronRight size={16} />
          </button>
        )}
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-1.5 rounded-xl text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-200 ${
                    isActive ? 'bg-emerald-50 text-emerald-600 font-medium' : ''
                  } ${isCollapsed ? 'justify-center' : ''}`
                }
                title={isCollapsed ? item.label : ''}
              >
                <IconGlass interactive className={item.color}>
                  <item.icon size={17} />
                </IconGlass>
                {!isCollapsed && (
                  <span className="text-sm flex-1 flex items-center justify-between">
                    {item.label}
                    {item.path === "/messages" && totalUnread > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {totalUnread > 99 ? "99+" : totalUnread}
                      </span>
                    )}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* User Info & Logout */}
      <div className="p-3 border-t border-emerald-100">
        {!isCollapsed && (
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-emerald-50 mb-3">
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold">{user?.name?.charAt(0) || 'S'}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-700">{user?.name?.split(' ')[0] || 'Student'}</p>
              <p className="text-xs text-emerald-500 capitalize">{user?.role || 'Student'}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogoutClick}
          className={`flex items-center gap-3 px-3 py-1.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 w-full ${isCollapsed ? 'justify-center' : ''}`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <IconGlass interactive className="text-rose-500"><LogOut size={17} /></IconGlass>
          {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block h-screen sticky top-0 bg-white/80 backdrop-blur-sm border-r border-emerald-100 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setIsMobileOpen(false)} />
      )}
      
      {/* Mobile Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white/95 backdrop-blur-sm shadow-xl z-50 transform transition-transform duration-300 lg:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-end p-2">
          <button onClick={() => setIsMobileOpen(false)} className="p-2 rounded-lg hover:bg-emerald-50">
            <X size={20} />
          </button>
        </div>
        <SidebarContent />
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCancelLogout}>
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto bg-rose-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={32} className="text-rose-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Ready to Leave?</h2>
              <p className="text-gray-500 mb-6">Are you sure you want to logout? You'll need to login again to access your account.</p>
              <div className="flex gap-3">
                <button onClick={handleCancelLogout} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleConfirmLogout} className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors flex items-center justify-center gap-2">
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;