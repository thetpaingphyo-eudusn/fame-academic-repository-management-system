import AnalyticsPage from "./pages/AnalyticsPage";
import CloudStoragePage from "./pages/CloudStoragePage";
import CodingAssistantPage from "./pages/CodingAssistantPage";
import CoursesPage from "./pages/CoursesPage";
import Dashboard from "./pages/Dashboard";
import DatabasePage from "./pages/DatabasePage";
import DepartmentsPage from "./pages/DepartmentsPage";
import FeedbackPage from "./pages/FeedbackPage";
import Layout from "./components/Layout/Layout";
import Login from "./pages/Login";
import MessagesPage from "./pages/MessagesPage";
import NotFoundPage from "./pages/NotFoundPage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";
import ProjectsPage from "./pages/ProjectsPage";
import RAGPage from "./pages/RAGPage";
import SecurityPage from "./pages/SecurityPage";
import SettingsPage from "./pages/SettingsPage";
import SubmissionsPage from "./pages/SubmissionsPage";
import UsersPage from "./pages/UsersPage";
import { createBrowserRouter } from "react-router-dom";

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <Layout />,  // ✅ Fixed - no Dashboard inside
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <Dashboard /> },  // ✅ This handles "/"
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'users/students', element: <UsersPage forcedRole="student" /> },
      { path: 'users/teachers', element: <UsersPage forcedRole="teacher" /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'departments', element: <DepartmentsPage /> },
      { path: 'courses', element: <CoursesPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'submissions', element: <SubmissionsPage /> },
      { path: 'feedback', element: <FeedbackPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'coding-assistant', element: <CodingAssistantPage /> },
      { path: 'rag', element: <RAGPage /> },
      { path: 'database', element: <DatabasePage /> },
      { path: 'cloud', element: <CloudStoragePage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'security', element: <SecurityPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export default router