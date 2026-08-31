import React, { useEffect, useState } from "react";
import { courseAPI, notificationAPI } from "../services/api";
import NotificationHistoryPanel from "../components/NotificationHistoryPanel";
import PageHeader from "../components/PageHeader";
import {
  Bell,
  CheckCircle,
  History,
  Loader2,
  Send,
  Users,
  BookOpen,
  GraduationCap,
} from "lucide-react";

const AUDIENCE_OPTIONS = [
  { value: "all", label: "All my students", icon: Users },
  { value: "course", label: "By course", icon: BookOpen },
];

const NotificationsPage = () => {
  const [tab, setTab] = useState("history");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [courseId, setCourseId] = useState("");
  const [courses, setCourses] = useState([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    courseAPI
      .getMyCourses()
      .then((res) => setCourses(res.data.data || []))
      .catch(() => setCourses([]));
  }, []);

  const sendNotification = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError("Title and message are required");
      return;
    }
    if (audience === "course" && !courseId) {
      setError("Please select a course");
      return;
    }

    setSending(true);
    setError("");
    setResult(null);

    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
      };
      if (audience === "course") payload.courseId = courseId;

      const response = await notificationAPI.sendToStudents(payload);
      setResult(response.data.data);
      setTitle("");
      setMessage("");
      setCourseId("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="View your inbox or send alerts to your students"
        icon={Bell}
      />

      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: "history", label: "My history", icon: History },
          { id: "send", label: "Send to students", icon: Send },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === item.id
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
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
                  Delivered to {result.recipientCount} student
                  {result.recipientCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={sendNotification} className="card p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipients</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

            {audience === "course" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                >
                  <option value="">Select a course</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.courseCode} — {c.courseName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Assignment deadline reminder"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                maxLength={120}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message to students…"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <GraduationCap size={16} />}
              Send notification
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
