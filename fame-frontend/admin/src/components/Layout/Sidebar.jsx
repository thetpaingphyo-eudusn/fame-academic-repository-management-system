import React, { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import IconGlass from "../IconGlass";

import {
  LayoutDashboard, 
  Users, 
  Building2, 
  BookOpen, 
  FolderKanban, 
  Brain, 
  Settings,
  GraduationCap,
  Briefcase,
  FileCheck,
  MessageSquare,
  BarChart3,
  Shield,
  Database,
  Cloud,
  Bell,
  MessageCircle,
  Code2,
  UserCircle,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  AlertTriangle
} from 'lucide-react'

const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const { logout, user } = useAuth()
  const { totalUnread } = useChat() || {}
  const location = useLocation()
  const navigate = useNavigate()

  // Load collapsed state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed')
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true')
    }
  }, [])

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed)
  }, [isCollapsed])

  useEffect(() => {
    setIsMobileOpen(false)
  }, [location.pathname, setIsMobileOpen])

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  const handleLogoutClick = () => {
    setShowLogoutModal(true)
  }

  const handleConfirmLogout = async () => {
    await logout()
    setShowLogoutModal(false)
    navigate('/login')
  }

  const handleCancelLogout = () => {
    setShowLogoutModal(false)
  }

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'text-pink-500' },
    { path: '/users/students', icon: GraduationCap, label: 'Students', color: 'text-green-500' },
    { path: '/users/teachers', icon: Briefcase, label: 'Teachers', color: 'text-blue-500' },
    { path: '/departments', icon: Building2, label: 'Departments', color: 'text-emerald-500' },
    { path: '/courses', icon: BookOpen, label: 'Courses', color: 'text-purple-500' },
    { path: '/projects', icon: FolderKanban, label: 'Projects', color: 'text-amber-500' },
    { path: '/submissions', icon: FileCheck, label: 'Submissions', color: 'text-teal-500' },
    { path: '/feedback', icon: MessageSquare, label: 'Feedback', color: 'text-rose-500' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics', color: 'text-indigo-500' },
    { path: '/coding-assistant', icon: Code2, label: 'Coding Assistant', color: 'text-violet-500' },
    { path: '/rag', icon: Brain, label: 'FAME', color: 'text-orange-500' },
    { path: '/notifications', icon: Bell, label: 'Notifications', color: 'text-violet-500' },
    { path: '/messages', icon: MessageCircle, label: 'Messages', color: 'text-sky-500' },
    { path: '/profile', icon: UserCircle, label: 'Profile', color: 'text-cyan-500' },
    { path: '/settings', icon: Settings, label: 'Settings', color: 'text-gray-500' },
  ]

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo Section with Toggle Button */}
      <div className={`p-4 border-b border-pink-100 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-2">
          <img
            src="/fame-logo.png"
            alt="FAME"
            className="w-9 h-9 object-contain shrink-0"
          />
          {!isCollapsed && (
            <div>
              <h1 className="font-bold text-gray-800 text-lg">FAME</h1>
              <p className="text-xs text-gray-400">Academic Repository</p>
            </div>
          )}
        </div>
        {/* Collapse Toggle Button */}
        {!isCollapsed ? (
          <button 
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-pink-100 text-gray-400 transition-all duration-200"
            title="Collapse sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
        ) : (
          <button 
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-pink-100 text-gray-400 transition-all duration-200 mt-2"
            title="Expand sidebar"
          >
            <PanelLeftOpen size={16} />
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
                  `flex items-center gap-3 px-3 py-1.5 rounded-xl text-gray-600 hover:bg-pink-50 hover:text-pink-600 transition-all duration-200 ${isActive ? 'bg-pink-50 text-pink-600 font-medium' : ''} ${isCollapsed ? 'justify-center' : ''}`
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
                      <span className="min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
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
      
      {/* User & Logout Section */}
      <div className="p-3 border-t border-pink-100">
        {!isCollapsed && (
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-pink-50 mb-3">
            <div className="w-8 h-8 bg-gradient-to-r from-pink-400 to-rose-400 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">{user?.name?.charAt(0) || 'A'}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">{user?.name?.split(' ')[0] || 'Admin'}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role || 'Administrator'}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogoutClick}
          className={`flex items-center gap-3 px-3 py-1.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 w-full ${isCollapsed ? 'justify-center' : ''}`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <IconGlass interactive className="text-rose-500"><LogOut size={17} /></IconGlass>
          {!isCollapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block h-screen sticky top-0 bg-white/80 backdrop-blur-sm border-r border-pink-100 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 lg:hidden" onClick={() => setIsMobileOpen(false)} />
      )}
      
      {/* Mobile Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white/95 backdrop-blur-sm shadow-xl z-50 transform transition-transform duration-300 lg:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-end p-2">
          <button onClick={() => setIsMobileOpen(false)} className="p-2 rounded-lg hover:bg-pink-50">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 border-b border-pink-100">
          <div className="flex items-center gap-2">
            <img
              src="/fame-logo.png"
              alt="FAME"
              className="w-9 h-9 object-contain shrink-0"
            />
            <div>
              <h1 className="font-bold text-gray-800 text-lg">FAME</h1>
              <p className="text-xs text-gray-400">Academic Repository</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-1.5 rounded-xl text-gray-600 hover:bg-pink-50 hover:text-pink-600 transition-all duration-200 ${isActive ? 'bg-pink-50 text-pink-600 font-medium' : ''}`
                  }
                >
                  <IconGlass interactive className={item.color}>
                    <item.icon size={17} />
                  </IconGlass>
                  <span className="text-sm">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-3 border-t border-pink-100">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-pink-50 mb-3">
            <div className="w-8 h-8 bg-gradient-to-r from-pink-400 to-rose-400 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">{user?.name?.charAt(0) || 'A'}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">{user?.name?.split(' ')[0] || 'Admin'}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role || 'Administrator'}</p>
            </div>
          </div>
          <button
            onClick={handleLogoutClick}
            className="flex items-center gap-3 px-3 py-1.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 w-full"
          >
            <IconGlass interactive className="text-rose-500"><LogOut size={17} /></IconGlass>
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={28} className="text-rose-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Confirm Logout</h3>
              <p className="text-gray-500 text-sm mb-6">
                Are you sure you want to logout from FAME Academic Repository?
                You will need to login again to access your account.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmLogout}
                  className="flex-1 bg-rose-500 text-white py-2.5 rounded-xl font-medium hover:bg-rose-600 transition-all flex items-center justify-center gap-2"
                >
                  <LogOut size={18} />
                  Yes, Logout
                </button>
                <button
                  onClick={handleCancelLogout}
                  className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar