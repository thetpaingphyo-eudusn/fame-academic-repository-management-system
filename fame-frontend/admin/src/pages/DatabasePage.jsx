import React from "react";
import PageHeader from "../components/PageHeader";
import { Database } from "lucide-react";

const DatabasePage = () => (
  <div className="space-y-6">
    <PageHeader
      icon={Database}
      iconColor="text-indigo-500"
      title="Database Management"
      subtitle="Database backup and management"
    />
    <div className="cute-card p-6">
      <p className="text-gray-500">Database backup and management page.</p>
    </div>
  </div>
);

export default DatabasePage;
