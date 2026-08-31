import Footer from "./Footer";
import Header from "./Header";
import React, { useState } from "react";
import Sidebar from "./Sidebar";
import { Outlet, useLocation } from "react-router-dom";

const Layout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const location = useLocation()
  const isMessagesPage = location.pathname.endsWith("/messages")

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Sidebar 
        isMobileOpen={isMobileOpen} 
        setIsMobileOpen={setIsMobileOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      <div className="flex-1 flex flex-col w-full overflow-x-hidden min-h-0">
        <Header onMenuClick={() => setIsMobileOpen(true)} sidebarCollapsed={isCollapsed} />
        <main className={`flex-1 flex flex-col min-h-0 ${isMessagesPage ? "p-4 sm:p-6 overflow-hidden" : "p-4 sm:p-6"}`}>
          <div className={`w-full ${isMessagesPage ? "flex-1 flex flex-col min-h-0 max-w-7xl mx-auto" : "max-w-7xl mx-auto"}`}>
            <Outlet />
          </div>
        </main>
        {!isMessagesPage && <Footer />}
      </div>
    </div>
  )
}

export default Layout