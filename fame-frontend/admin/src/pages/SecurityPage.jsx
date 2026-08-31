import React from "react";
import PageHeader from "../components/PageHeader";
import { Shield } from "lucide-react";

const SecurityPage = () => (
  <div className="space-y-6">
    <PageHeader
      icon={Shield}
      iconColor="text-purple-500"
      title="Security Settings"
      subtitle="Security configuration and audit logs"
    />
    <div className="cute-card p-6">
      <p className="text-gray-500">Security configuration and audit logs page.</p>
    </div>
  </div>
);

export default SecurityPage;
