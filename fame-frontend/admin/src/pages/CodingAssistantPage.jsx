import React from "react";
import CodingAssistantPanel from "../components/CodingAssistantPanel";
import PageHeader from "../components/PageHeader";
import { Code2 } from "lucide-react";

const CodingAssistantPage = () => (
  <div className="flex flex-col min-h-0 w-full max-w-[1400px] mx-auto">
    <PageHeader
      icon={Code2}
      iconColor="text-violet-600"
      title="Coding Assistant"
      subtitle="Build UI, debug errors, fix bugs — with Code, Preview, and Issues canvas plus saved history."
    />
    <CodingAssistantPanel role="admin" accent="violet" />
  </div>
);

export default CodingAssistantPage;
