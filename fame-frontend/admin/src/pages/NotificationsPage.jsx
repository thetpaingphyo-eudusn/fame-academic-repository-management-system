import React, { useState } from "react";
import api from "../services/api";
import NotificationHistoryPanel from "../components/NotificationHistoryPanel";
import PageHeader from "../components/PageHeader";
import { Bell, CheckCircle, History, Loader2, Send, Users, GraduationCap, UserCheck } from "lucide-react";

const AUDIENCE_OPTIONS = [
  { value: "both", label: "Teachers & Students", icon: Users },
  { value: "teachers", label: "Teachers only", icon: UserCheck },
  { value: "students", label: "Students only", icon: GraduationCap },
];

const NotificationsPage = () => {
  const [tab, setTab] = useState("history");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("both");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const sendNotification = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError("Title and message are required");
      return;
    }

    setSending(true);
    setError("");
    setResult(null);

    try {
      const response = await api.post("/admin/notifications/broadcast", {
        title: title.trim(),
        message: message.trim(),
        audience,
      });
      setResult(response.data.data);
      setTitle("");
      setMessage("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bell}
        iconColor="text-blue-600"
        title="Notifications"
        subtitle="View your inbox or send alerts to teachers and students"
      />

      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: "history", label: "My history", icon: History },
          { id: "send", label: "Send notification", icon: Send },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === item.id ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <item.icon size={16} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "history" ? (
        <NotificationHistoryPanel />
      ) : (
        <div className="max-w-3xl space-y-6">
          {result && (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm">
              <CheckCircle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Notification sent successfully</p>
                <p className="text-green-700 mt-0.5">
                  Delivered to {result.recipientCount} user{result.recipientCount !== 1 ? "s" : ""} (
                  {AUDIENCE_OPTIONS.find((o) => o.value === result.audience)?.label || result.audience})
                </p>
              </div>
            </div>
          )}

          {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

          <form onSubmit={sendNotification} className="card p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Audience</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {AUDIENCE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAudience(option.value)}
                    className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-colors ${
                      audience === option.value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <option.icon size={16} />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. System maintenance tonight"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your announcement..."
                rows={5}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                maxLength={2000}
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Send size={16} /> Send notification
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
