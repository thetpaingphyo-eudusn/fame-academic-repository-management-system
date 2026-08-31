import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { authAPI } from "../services/api";

import {
  Bell, Building2, Check, Globe, Key, Loader, Mail,
  RefreshCw, RotateCcw, Settings, Shield, User
} from "lucide-react";
import PageHeader from "../components/PageHeader";

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
      checked ? "bg-violet-500" : "bg-slate-200"
    } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
        checked ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
);

const PREFERENCE_TOGGLES = [
  {
    key: "emailNotifications",
    title: "Email notifications",
    desc: "Receive emails for important updates"
  },
  {
    key: "submissionAlerts",
    title: "New submission alerts",
    desc: "Notify when students submit projects"
  },
  {
    key: "gradeReminders",
    title: "Grading reminders",
    desc: "Remind about pending reviews"
  }
];

const SettingsPage = () => {
  const { user, refreshUser } = useAuth();
  const { settings, updateSetting, resetSettings } = useSettings();

  const [activeTab, setActiveTab] = useState("account");
  const [refreshing, setRefreshing] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  const handleRefreshProfile = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
      setMessage({ type: "success", text: "Profile refreshed." });
    } catch {
      setMessage({ type: "error", text: "Failed to refresh profile." });
    } finally {
      setRefreshing(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    setPasswordLoading(true);
    try {
      await authAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setMessage({ type: "success", text: "Password updated successfully." });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to change password."
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const tabs = [
    { id: "account", label: "Account", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "preferences", label: "Preferences", icon: Settings }
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Settings"
        subtitle="Manage your account, security, and notification preferences"
        icon={Settings}
        iconColor="text-violet-500"
      />

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? <Check size={16} /> : null}
          {message.text}
        </div>
      )}

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? "bg-white text-violet-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "account" && (
        <div className="rounded-2xl bg-white shadow-sm shadow-slate-200/60 p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
                {user?.name?.charAt(0) || "T"}
              </div>
              <div>
                <h2 className="font-semibold text-slate-800">{user?.name || "—"}</h2>
                <p className="text-sm text-slate-500 capitalize">{user?.role || "teacher"}</p>
              </div>
            </div>
            <button
              onClick={handleRefreshProfile}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200/80 transition-colors"
              title="Refresh profile"
            >
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="grid gap-3">
            {[
              { icon: Mail, label: "Email", value: user?.email },
              { icon: Building2, label: "Department", value: user?.department || "Not assigned" },
              { icon: Shield, label: "Teacher ID", value: user?.teacherId || "—" }
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <Icon size={16} className="text-violet-500 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
                  <p className="text-sm text-slate-700">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Profile details are managed by your administrator. Contact admin to update name or department.
          </p>
        </div>
      )}

      {activeTab === "security" && (
        <form
          onSubmit={handlePasswordChange}
          className="rounded-2xl bg-white shadow-sm shadow-slate-200/60 p-6 space-y-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Key size={18} className="text-violet-500" />
            <h2 className="font-semibold text-slate-800">Change Password</h2>
          </div>

          {[
            { key: "currentPassword", label: "Current password", placeholder: "Enter current password" },
            { key: "newPassword", label: "New password", placeholder: "At least 6 characters" },
            { key: "confirmPassword", label: "Confirm new password", placeholder: "Repeat new password" }
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
              <input
                type="password"
                value={passwordData[key]}
                onChange={(e) => setPasswordData((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-violet-200 outline-none transition-all"
                required={key !== "confirmPassword" || passwordData.newPassword.length > 0}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={passwordLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium shadow-lg shadow-violet-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {passwordLoading ? <Loader size={16} className="animate-spin" /> : <Key size={16} />}
            Update Password
          </button>
        </form>
      )}

      {activeTab === "preferences" && (
        <div className="rounded-2xl bg-white shadow-sm shadow-slate-200/60 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {PREFERENCE_TOGGLES.map(({ key, title, desc }) => (
              <div key={key} className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-violet-50">
                    <Bell size={18} className="text-violet-500" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                  </div>
                </div>
                <Toggle
                  checked={settings[key]}
                  onChange={(v) => {
                    updateSetting(key, v);
                    setMessage({ type: "success", text: "Preference saved." });
                  }}
                />
              </div>
            ))}

            <div className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-50">
                  <Globe size={18} className="text-violet-500" />
                </div>
                <div>
                  <p className="font-medium text-slate-800">Language</p>
                  <p className="text-xs text-slate-500 mt-0.5">Display language</p>
                </div>
              </div>
              <select
                value={settings.language}
                onChange={(e) => {
                  updateSetting("language", e.target.value);
                  setMessage({ type: "success", text: "Language preference saved." });
                }}
                className="px-3 py-2 rounded-xl bg-slate-50 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
              >
                <option value="en">English</option>
                <option value="my">Myanmar (မြန်မာ)</option>
              </select>
            </div>
          </div>

          <div className="p-5 bg-slate-50">
            <button
              type="button"
              onClick={() => {
                resetSettings();
                setMessage({ type: "success", text: "Settings reset to defaults." });
              }}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-violet-600 transition-colors"
            >
              <RotateCcw size={14} />
              Reset all preferences to default
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
