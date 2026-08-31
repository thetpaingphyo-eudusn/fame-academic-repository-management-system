import AssignmentDetail from "./pages/AssignmentDetail";
import CourseDetail from "./pages/CourseDetail";
import CodingAssistantPage from "./pages/CodingAssistantPage";
import Dashboard from "./pages/Dashboard";
import Feedback from "./pages/Feedback";
import Grades from "./pages/Grades";
import Layout from "./components/Layout/Layout";
import Login from "./pages/Login";
import MessagesPage from "./pages/MessagesPage";
import MyCourses from "./pages/MyCourses";
import MyProjects from "./pages/MyProjects";
import NotFoundPage from "./pages/NotFoundPage";
import NotificationsPage from "./pages/NotificationsPage";
import Profile from "./pages/Profile";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectUpload from "./pages/ProjectUpload";
import RagChatPage from "./pages/RagChatPage";
import Settings from "./pages/Settings";
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
      { index: true, element: <Dashboard /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'my-courses', element: <MyCourses /> },
      { path: 'courses/:courseId', element: <CourseDetail /> },
      { path: 'courses/:courseId/assignments/:assignmentId', element: <AssignmentDetail /> },
      { path: 'my-projects', element: <MyProjects /> },
      { path: 'projects/upload', element: <ProjectUpload /> },
      { path: 'projects/:projectId', element: <ProjectDetail /> },
      { path: 'feedback', element: <Feedback /> },
      { path: 'profile', element: <Profile /> },
      { path: 'settings', element: <Settings /> },
      { path: 'grades', element: <Grades /> },
      { path: 'coding-assistant', element: <CodingAssistantPage /> },
      { path: 'assistant', element: <RagChatPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'messages', element: <MessagesPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export default router;