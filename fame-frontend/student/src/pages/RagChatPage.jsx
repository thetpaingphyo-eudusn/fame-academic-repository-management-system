import React from "react";
import FameDevAssistant from "../components/FameDevAssistant";
import PageHeader from "../components/PageHeader";
import { Brain } from "lucide-react";

const RagChatPage = () => (
  <div className="space-y-3 sm:space-y-5 flex flex-col min-h-0 max-w-5xl mx-auto">
    <PageHeader
      title="FAME Assistant"
      subtitle="Role-based AI — ask about your courses, assignments, projects, and grades only"
      icon={Brain}
    />
    <div className="flex-1 min-h-0">
      <FameDevAssistant role="student" />
    </div>
  </div>
);

export default RagChatPage;
