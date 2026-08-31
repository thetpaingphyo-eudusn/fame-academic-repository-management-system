import React from "react";
import ChatMessenger from "../components/ChatMessenger";
import PageHeader from "../components/PageHeader";
import { MessageCircle } from "lucide-react";

const MessagesPage = () => (
  <div className="space-y-3 sm:space-y-5 flex flex-col flex-1 min-h-0 h-full">
    <PageHeader
      icon={MessageCircle}
      iconColor="text-pink-600"
      title="Messages"
      subtitle="Real-time chat with teachers, students, and staff — send text, images, videos, and files"
    />
    <div className="flex-1 min-h-0">
      <ChatMessenger />
    </div>
  </div>
);

export default MessagesPage;
