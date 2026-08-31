import React from "react";
import { Toaster } from "react-hot-toast";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ChatProvider } from "./context/ChatContext";
import { router } from "./router";

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ChatProvider>
          <RouterProvider router={router} />
          <Toaster position="top-right" />
        </ChatProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;