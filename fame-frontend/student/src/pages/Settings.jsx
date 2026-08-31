import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { authAPI, studentAPI } from "../services/api";
import {
  Bell,
  Download,
  Globe,
  Key,
  Loader,
  Settings as SettingsIcon,
  Shield,
  X
} from "lucide-react";
import PageHeader from "../components/PageHeader";

const SETTINGS_KEY = "studentSettings";

const defaultSettings = {
  notifications: {
    emailNotifications: true,
    projectUpdates: true,
    gradeAlerts: true,
    feedbackNotifications: true,
    deadlineReminders: true
  },
  preferences: {
    language: "en",
    compactView: false
  },
  privacy: {
    profileVisibility: "teachers",
    showEmail: false,
    showProjects: true
  }
};

const Settings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [exportFormat, setExportFormat] = useState("json");
  const [exporting, setExporting] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setSettings({
        notifications: { ...defaultSettings.notifications, ...(parsed.notifications || {}) },
        preferences: { ...defaultSettings.preferences, ...(parsed.preferences || {}) },
        privacy: { ...defaultSettings.privacy, ...(parsed.privacy || {}) }
      });
    } catch {
      setSettings(defaultSettings);
    }
  }, []);

  const persistSettings = (next) => {
    setSettings(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  };

  const updateSection = (section, key, value) => {
    const next = {
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value
      }
    };
    persistSettings(next);
    toast.success("Settings updated");
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!passwordData.currentPassword) {
      toast.error("Please enter current password");
      return;
    }
    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      await authAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
      toast.success("Password changed successfully");
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const [projectsRes, profileRes] = await Promise.all([
        studentAPI.getMyProjects({ limit: 1000 }),
        studentAPI.getProfile()
      ]);

      const projects = projectsRes.data.data || [];
      const profile = profileRes.data.data || {};

      const exportData = {
        user: profile,
        projects,
        settings,
        exportedAt: new Date().toISOString()
      };

      let blob;
      let filename;

      if (exportFormat === "json") {
        blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        filename = `student-data-${new Date().toISOString().split("T")[0]}.json`;
      } else {
        const headers = ["Project", "Status", "Grade", "Submitted", "Course"];
        const rows = projects.map((p) => [
          p.title,
          p.status,
          p.grade ?? "Not graded",
          p.submittedAt ? new Date(p.submittedAt).toLocaleDateString() : "N/A",
          p.courseName || "N/A"
        ]);
        const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
        blob = new Blob([csv], { type: "text/csv" });
        filename = `student-projects-${new Date().toISOString().split("T")[0]}.csv`;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Data exported");
      setShowExportModal(false);
    } catch {
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your preferences, privacy, and account security"
        icon={SettingsIcon}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-emerald-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <Bell size={18} className="text-emerald-500" />
            <h2 className="font-semibold text-gray-800">Notifications</h2>
          </div>
          <div className="p-5 space-y-3">
            {[
              ["emailNotifications", "Email notifications"],
              ["projectUpdates", "Project updates"],
              ["gradeAlerts", "Grade alerts"],
              ["feedbackNotifications", "Feedback notifications"],
              ["deadlineReminders", "Deadline reminders"]
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between py-1 cursor-pointer">
                <span className="text-sm text-gray-700">{label}</span>
                <input
                  type="checkbox"
                  checked={settings.notifications[key]}
                  onChange={(e) => updateSection("notifications", key, e.target.checked)}
                  className="h-4 w-4 accent-emerald-500"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <Globe size={18} className="text-emerald-500" />
            <h2 className="font-semibold text-gray-800">Preferences</h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-sm text-gray-700 block mb-1">Language</label>
              <select
                value={settings.preferences.language}
                onChange={(e) => updateSection("preferences", "language", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="en">English</option>
                <option value="my">Myanmar</option>
              </select>
            </div>
            <label className="flex items-center justify-between py-1 cursor-pointer">
              <span className="text-sm text-gray-700">Compact view</span>
              <input
                type="checkbox"
                checked={settings.preferences.compactView}
                onChange={(e) => updateSection("preferences", "compactView", e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
            </label>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <Shield size={18} className="text-emerald-500" />
            <h2 className="font-semibold text-gray-800">Privacy</h2>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-sm text-gray-700 block mb-1">Profile visibility</label>
              <select
                value={settings.privacy.profileVisibility}
                onChange={(e) => updateSection("privacy", "profileVisibility", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="public">Public</option>
                <option value="teachers">Teachers only</option>
                <option value="private">Private</option>
              </select>
            </div>
            <label className="flex items-center justify-between py-1 cursor-pointer">
              <span className="text-sm text-gray-700">Show email on profile</span>
              <input
                type="checkbox"
                checked={settings.privacy.showEmail}
                onChange={(e) => updateSection("privacy", "showEmail", e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
            </label>
            <label className="flex items-center justify-between py-1 cursor-pointer">
              <span className="text-sm text-gray-700">Show projects on profile</span>
              <input
                type="checkbox"
                checked={settings.privacy.showProjects}
                onChange={(e) => updateSection("privacy", "showProjects", e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
            </label>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <Key size={18} className="text-emerald-500" />
            <h2 className="font-semibold text-gray-800">Account</h2>
          </div>
          <div className="p-5 space-y-3">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50"
            >
              Change password
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="w-full px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm hover:bg-emerald-600 flex items-center justify-center gap-2"
            >
              <Download size={16} /> Export my data
            </button>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-100 p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Change Password</h2>
              <button onClick={() => setShowPasswordModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handlePasswordChange}>
              <div className="p-4 space-y-3">
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData((p) => ({ ...p, currentPassword: e.target.value }))}
                  placeholder="Current password"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData((p) => ({ ...p, newPassword: e.target.value }))}
                  placeholder="New password"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div className="border-t border-gray-100 p-4 flex gap-3">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-600">
                  Cancel
                </button>
                <button type="submit" disabled={savingPassword} className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                  {savingPassword ? <Loader size={16} className="animate-spin" /> : <Key size={16} />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowExportModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-100 p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Export Data</h2>
              <button onClick={() => setShowExportModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <label className="flex items-center gap-2">
                <input type="radio" name="fmt" value="json" checked={exportFormat === "json"} onChange={(e) => setExportFormat(e.target.value)} />
                JSON (full data)
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="fmt" value="csv" checked={exportFormat === "csv"} onChange={(e) => setExportFormat(e.target.value)} />
                CSV (projects only)
              </label>
            </div>
            <div className="border-t border-gray-100 p-4 flex gap-3">
              <button onClick={() => setShowExportModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-600">
                Cancel
              </button>
              <button onClick={handleExportData} disabled={exporting} className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                {exporting ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
