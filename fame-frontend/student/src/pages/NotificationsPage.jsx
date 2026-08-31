import React from "react";
import NotificationHistoryPanel from "../components/NotificationHistoryPanel";
import PageHeader from "../components/PageHeader";
import { Bell } from "lucide-react";

const NotificationsPage = () => (
  <div className="space-y-6">
    <PageHeader
      title="Notifications"
      subtitle="All announcements and alerts sent to you"
      icon={Bell}
    />
    <NotificationHistoryPanel />
  </div>
);

export default NotificationsPage;
