  import { RouterProvider } from "react-router-dom";
  import { AuthProvider } from "./context/AuthContext";
  import { SettingsProvider } from "./context/SettingsContext";
  import { NotificationProvider } from "./context/NotificationContext";
  import { ChatProvider } from "./context/ChatContext";
  import { router } from "./routes";

  function App() {
    return (
      <AuthProvider>
        <SettingsProvider>
          <NotificationProvider>
            <ChatProvider>
              <RouterProvider router={router} />
            </ChatProvider>
          </NotificationProvider>
        </SettingsProvider>
      </AuthProvider>
    )
  }

  export default App