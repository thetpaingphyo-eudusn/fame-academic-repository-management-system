import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ChatProvider } from "./context/ChatContext";
import { router } from "./routes";

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ChatProvider>
          <RouterProvider router={router} />
        </ChatProvider>
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App