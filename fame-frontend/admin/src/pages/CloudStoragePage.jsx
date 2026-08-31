import React from "react";
import PageHeader from "../components/PageHeader";
import { Cloud } from "lucide-react";

const CloudStoragePage = () => (
  <div className="space-y-6">
    <PageHeader
      icon={Cloud}
      iconColor="text-sky-500"
      title="Cloud Storage"
      subtitle="Cloudinary storage management"
    />
    <div className="cute-card p-6">
      <p className="text-gray-500">Cloudinary storage management page.</p>
    </div>
  </div>
);

export default CloudStoragePage;
