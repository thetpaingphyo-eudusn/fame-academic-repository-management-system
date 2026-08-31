import React, { useEffect, useState } from "react";
import api from "../services/api";
import AdminRagChatBox from "../components/AdminRagChatBox";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

import {
  Brain,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  Database,
  Cpu,
  Sparkles,
  AlertCircle,
  Zap,
  FolderKanban,
} from "lucide-react";

import { FAME, toDisplayText } from "../utils/fameBrand";

const RAGPage = () => {
  const [training, setTraining] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [geminiStatus, setGeminiStatus] = useState(null);
  const [projectCount, setProjectCount] = useState(0);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!notification) return undefined;
    const t = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(t);
  }, [notification]);

  const showNotice = (type, message) => setNotification({ type, message });

  const loadAll = async () => {
    await Promise.all([loadStatus(), loadGeminiTest(), loadProjectCount()]);
  };

  const loadStatus = async () => {
    try {
      const response = await api.get("/admin/rag/status");
      setTrainingStatus(response.data.data);
    } catch (error) {
      console.error("Failed to load training status:", error);
    }
  };

  const loadGeminiTest = async () => {
    try {
      const response = await api.get("/admin/rag/test");
      setGeminiStatus(response.data.data);
    } catch (error) {
      setGeminiStatus({ success: false, message: `${FAME} not configured` });
    }
  };

  const loadProjectCount = async () => {
    try {
      const response = await api.get("/admin/dashboard/stats");
      setProjectCount(response.data.data?.totalProjects || 0);
    } catch (error) {
      console.error("Failed to load project count:", error);
    }
  };

  const startTraining = async () => {
    if (training) return;
    setTraining(true);
    try {
      const response = await api.post("/admin/rag/train");
      const data = response.data.data || {};
      await loadStatus();

      if (data.success === false) {
        showNotice("error", toDisplayText(data.message || "Training failed. Configure AI in Admin → Settings → AI Configuration."));
        return;
      }

      showNotice(
        "success",
        `Done! ${data.trainedCount || 0} records trained (${data.totalProjects || 0} projects, ${data.totalStudents || 0} students)`
      );
    } catch (error) {
      showNotice("error", toDisplayText(error.response?.data?.message || "Training failed"));
    } finally {
      setTraining(false);
    }
  };

  const isTrained = trainingStatus?.isTrained || false;
  const trainedCount = trainingStatus?.trainedRecordsCount || trainingStatus?.trainedProjectsCount || 0;
  const isGeminiConnected = geminiStatus?.success === true;

  return (
    <div className="space-y-5">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm max-w-md ${
            notification.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {notification.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {notification.message}
        </div>
      )}

      <PageHeader
        icon={Brain}
        iconColor="text-violet-600"
        title="RAG Training & Chat"
        subtitle="Train your database and chat — your past conversations appear in the sidebar"
      >
        <button
          onClick={startTraining}
          disabled={training}
          className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60 flex items-center gap-2 shadow-md"
        >
          {training ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Training...
            </>
          ) : (
            <>
              <Zap size={18} />
              {isTrained ? "Retrain Data" : "Train Data"}
            </>
          )}
        </button>
        <button
          onClick={loadAll}
          disabled={training}
          className="px-4 py-2.5 bg-white border border-violet-200 text-violet-700 rounded-xl text-sm font-medium hover:bg-violet-50 flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          className={`rounded-2xl p-4 border sm:col-span-2 ${isGeminiConnected ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}
        >
          <div className="flex items-center gap-3">
            {isGeminiConnected ? (
              <CheckCircle size={20} className="text-green-600 shrink-0" />
            ) : (
              <XCircle size={20} className="text-amber-600 shrink-0" />
            )}
            <div>
              <p className="font-medium text-gray-800">{FAME}</p>
              <p className="text-xs text-gray-500">{toDisplayText(geminiStatus?.message || "Checking…")}</p>
            </div>
          </div>
        </div>
        {[
          { label: "Projects", value: projectCount, icon: FolderKanban, iconColor: "violet" },
          { label: "Trained", value: trainedCount, icon: CheckCircle, iconColor: "green" },
          { label: "Status", value: isTrained ? "Ready" : "Empty", icon: Brain, iconColor: "indigo" },
        ].map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} icon={item.icon} iconColor={item.iconColor} />
        ))}
      </div>

      {training && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-violet-800 text-sm font-medium mb-2">
            <Loader2 size={16} className="animate-spin" />
            Training...
          </div>
          <div className="h-2 bg-violet-200 rounded-full overflow-hidden">
            <div className="h-full bg-violet-600 animate-pulse w-2/3 rounded-full" />
          </div>
        </div>
      )}

      <AdminRagChatBox />
    </div>
  );
};

export default RAGPage;
