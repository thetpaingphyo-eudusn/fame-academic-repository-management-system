import AddStudentPage from "./pages/AddStudentPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AssignmentSubmissionsPage from "./pages/AssignmentSubmissionsPage";
import AssignmentsPage from "./pages/AssignmentsPage";
import CodingAssistantPage from "./pages/CodingAssistantPage";
import CoursesPage from "./pages/CoursesPage";
import Dashboard from "./pages/Dashboard";
import EditStudentPage from "./pages/EditStudentPage";
import FeedbackPage from "./pages/FeedbackPage";
import GradesPage from "./pages/GradesPage";
import GradingCriteriaPage from "./pages/GradingCriteriaPage";
import Layout from "./components/Layout/Layout";
import Login from "./pages/Login";
import MessagesPage from "./pages/MessagesPage";
import NotFoundPage from "./pages/NotFoundPage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";
import RagChatPage from "./pages/RagChatPage";
import SettingsPage from "./pages/SettingsPage";
import StudentsPage from "./pages/StudentsPage";
import SubmissionsPage from "./pages/SubmissionsPage";
import { createBrowserRouter } from "react-router-dom";

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <Layout />,
    errorElement: <NotFoundPage />,
    children: [
      // Main Pages
      { index: true, element: <Dashboard /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'submissions', element: <SubmissionsPage /> },
      { path: 'feedback', element: <FeedbackPage /> },
      { path: 'courses', element: <CoursesPage /> },
      { path: 'students', element: <StudentsPage /> },
      { path: 'students/add', element: <AddStudentPage /> },
      { path: 'students/edit/:id', element: <EditStudentPage /> },
      { path: 'grades', element: <GradesPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'coding-assistant', element: <CodingAssistantPage /> },
      { path: 'assistant', element: <RagChatPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'settings', element: <SettingsPage /> },
      
      // Assignment Routes
      { path: 'courses/:courseId/assignments', element: <AssignmentsPage /> },
      { path: 'assignments/:assignmentId/criteria', element: <GradingCriteriaPage /> },
      { path: 'assignments/:assignmentId/submissions', element: <AssignmentSubmissionsPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export default router;