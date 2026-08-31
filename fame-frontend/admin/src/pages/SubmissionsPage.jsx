import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import CriteriaGradingPanel from "../components/CriteriaGradingPanel";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

import {
  FileCheck,
  Search,
  X,
  CheckCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  User,
  Eye,
  Filter,
  FileText,
  Clock,
  Award,
  AlertCircle,
  Star,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  GraduationCap,
  BookOpen,
  Download,
  XCircle,
} from "lucide-react";

const backendBaseUrl = (import.meta.env.VITE_API_URL || "/api").replace(/\/api\/?$/, "") || "";

const MODAL_SIZES = {
  sm: "max-w-[360px]",
  md: "max-w-[420px]",
  lg: "max-w-[560px]",
  xl: "max-w-[640px]",
};

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "revision", label: "Revision" },
  { value: "graded", label: "Graded" },
];

const Modal = ({ onClose, title, icon: Icon, iconClass = "text-sky-500", size = "md", children }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 sm:p-6"
    onClick={onClose}
  >
    <div
      className={`${MODAL_SIZES[size]} w-full bg-white rounded-xl shadow-2xl border border-sky-100 overflow-hidden`}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-sky-50/80 to-white">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon size={18} className={`shrink-0 ${iconClass}`} />}
          <h2 className="text-base font-semibold text-gray-800 truncate">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0"
        >
          <X size={16} />
        </button>
      </div>
      <div className="max-h-[min(75vh,560px)] overflow-y-auto">{children}</div>
    </div>
  </div>
);

const resolveFileUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${backendBaseUrl}${url}`;
  return `${backendBaseUrl}/${url}`;
};

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const displayValue = (value, fallback = "—") => {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
};

const getStudentName = (submission) => {
  if (!submission) return "—";
  return submission.studentName || submission.studentId?.name || "Unknown Student";
};

const getStudentEmail = (submission) =>
  submission?.studentEmail ||
  submission?.studentId?.email ||
  submission?.studentRollNumber ||
  submission?.studentId?.studentId ||
  "—";

const getCourseLabel = (submission) => {
  if (!submission) return "—";
  const code = submission.courseCode || submission.courseId?.courseCode;
  const name = submission.courseName || submission.courseId?.courseName;
  if (code && name) return `${code} — ${name}`;
  return code || name || "N/A";
};

const normalizeSubmission = (submission) => ({
  ...submission,
  title: submission?.title || "Untitled Submission",
  studentName: getStudentName(submission),
  studentEmail: getStudentEmail(submission),
  courseCode: submission?.courseCode || submission?.courseId?.courseCode || "N/A",
  courseName: submission?.courseName || submission?.courseId?.courseName || "N/A",
  department: submission?.department || "N/A",
  section: submission?.section || "N/A",
  year: submission?.year ?? "—",
  description: submission?.description || "No description provided.",
  status: submission?.status || "pending",
});

const SubmissionContext = ({ submission }) => (
  <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 text-xs space-y-1">
    <p className="font-medium text-gray-800 truncate">
      {displayValue(submission?.title, "Untitled Submission")}
    </p>
    <p className="text-gray-600">
      {getStudentName(submission)} · {displayValue(submission?.department, "N/A")}
      {submission?.year != null && submission?.year !== "—" ? ` · Y${submission.year}` : ""}
    </p>
    <p className="text-gray-500 truncate">{getCourseLabel(submission)}</p>
  </div>
);

const SubmissionsPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewTab, setViewTab] = useState("overview");
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [viewingVersions, setViewingVersions] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionSubmission, setActionSubmission] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sortField, setSortField] = useState("submittedAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [submittingRevision, setSubmittingRevision] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [notification, setNotification] = useState(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, graded: 0, revision: 0 });

  const [statusFilter, setStatusFilter] = useState("pending");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const [revisionForm, setRevisionForm] = useState({ revisionNotes: "" });

  const itemsPerPage = 10;
  const canReview = user?.role === "admin" || user?.role === "teacher";

  useEffect(() => {
    loadSubmissions();
  }, [currentPage, sortField, sortOrder, searchTerm, statusFilter, departmentFilter, yearFilter]);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (!notification) return undefined;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  const showNotice = (type, message) => setNotification({ type, message });

  const loadStats = async () => {
    try {
      const response = await api.get("/admin/dashboard/stats");
      const data = response.data.data || {};
      const listRes = await api.get("/admin/submissions", { params: { limit: 200, page: 1 } });
      const items = listRes.data.data || [];
      setStats({
        total: data.totalProjects || items.length,
        pending: data.pendingProjects || items.filter((s) => s.status === "pending").length,
        graded: items.filter((s) => s.status === "graded").length,
        revision: items.filter((s) => s.status === "revision").length,
      });
    } catch (error) {
      console.error("Failed to load submission stats:", error);
    }
  };

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("limit", itemsPerPage);
      params.append("sort", sortField);
      params.append("order", sortOrder);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      if (statusFilter) params.append("status", statusFilter);
      if (departmentFilter) params.append("department", departmentFilter);
      if (yearFilter) params.append("year", yearFilter);

      const response = await api.get(`/admin/submissions?${params.toString()}`);
      const pagination = response.data.pagination || {};
      const total = pagination.total ?? 0;

      setSubmissions((response.data.data || []).filter(Boolean));
      setTotalItems(total);
      setTotalPages((pagination.pages ?? Math.ceil(total / itemsPerPage)) || 1);
    } catch (error) {
      console.error("Failed to load submissions:", error);
      showNotice("error", "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissionDetails = async (id, fallbackSubmission = null) => {
    setLoadingDetails(true);
    if (fallbackSubmission) {
      setViewingSubmission(normalizeSubmission(fallbackSubmission));
    }
    setViewingVersions([]);

    try {
      const response = await api.get(`/projects/${id}`);
      const data = response.data.data || {};
      const submission = normalizeSubmission(data.project || {});

      if (data.feedback) {
        submission.teacherFeedback =
          submission.teacherFeedback || data.feedback.feedbackText || null;
        submission.grade = submission.grade ?? data.feedback.grade ?? null;
        submission.gradedByName =
          submission.gradedByName || data.feedback.teacherName || null;
        submission.criterionScores = data.feedback.criterionScores || [];
        submission.existingFeedback = data.feedback;
      }

      setViewingSubmission(submission);
      setViewingVersions(data.versions || []);
    } catch (error) {
      showNotice("error", "Failed to load submission details");
      if (!fallbackSubmission) {
        setShowViewModal(false);
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadSubmissions(), loadStats()]);
    setTimeout(() => setRefreshing(false), 500);
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setDepartmentFilter("");
    setYearFilter("");
    setCurrentPage(1);
  };

  const setQuickStatus = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleGradeSuccess = async () => {
    setShowGradeModal(false);
    setActionSubmission(null);
    await Promise.all([loadSubmissions(), loadStats()]);
    if (showViewModal && viewingSubmission?._id) {
      await loadSubmissionDetails(viewingSubmission._id, viewingSubmission);
    }
    showNotice("success", "Grade submitted successfully");
  };

  const openGradeModal = async (submission) => {
    const normalized = normalizeSubmission(submission);
    setActionSubmission(normalized);
    setShowGradeModal(true);
    try {
      const response = await api.get(`/projects/${submission._id}`);
      const data = response.data.data || {};
      const full = normalizeSubmission(data.project || normalized);
      if (data.feedback) {
        full.existingFeedback = data.feedback;
        full.teacherFeedback = data.feedback.feedbackText || full.teacherFeedback;
        full.grade = data.feedback.grade ?? full.grade;
        full.criterionScores = data.feedback.criterionScores || [];
      }
      setActionSubmission(full);
    } catch {
      /* keep normalized */
    }
  };
  const handleRevisionSubmit = async (e) => {
    e.preventDefault();
    setSubmittingRevision(true);
    try {
      await api.put(`/teacher/projects/${actionSubmission._id}/revision`, {
        revisionNotes: revisionForm.revisionNotes,
      });
      setShowRevisionModal(false);
      setRevisionForm({ revisionNotes: "" });
      await Promise.all([loadSubmissions(), loadStats()]);
      showNotice("success", "Revision request sent");
    } catch (error) {
      showNotice("error", error.response?.data?.message || "Failed to request revision");
    } finally {
      setSubmittingRevision(false);
    }
  };

  const handleApprove = async () => {
    setSubmittingAction(true);
    try {
      await api.put(`/teacher/projects/${actionSubmission._id}/approve`, {
        notes: "Approved",
      });
      setShowApproveConfirm(false);
      await Promise.all([loadSubmissions(), loadStats()]);
      showNotice("success", "Submission approved");
    } catch (error) {
      showNotice("error", error.response?.data?.message || "Failed to approve");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReject = async () => {
    setSubmittingAction(true);
    try {
      await api.put(`/teacher/projects/${actionSubmission._id}/reject`, {
        reason: "Rejected after review",
      });
      setShowRejectConfirm(false);
      await Promise.all([loadSubmissions(), loadStats()]);
      showNotice("success", "Submission rejected");
    } catch (error) {
      showNotice("error", error.response?.data?.message || "Failed to reject");
    } finally {
      setSubmittingAction(false);
    }
  };

  const openViewModal = async (submission) => {
    setViewTab("overview");
    setViewingSubmission(normalizeSubmission(submission));
    setShowViewModal(true);
    await loadSubmissionDetails(submission._id, submission);
  };

  // Open submission detail from chat / deep link (?id= or ?project=)
  useEffect(() => {
    const submissionId = searchParams.get("id") || searchParams.get("project");
    if (!submissionId || loading) return;
    if (showViewModal && String(viewingSubmission?._id) === String(submissionId)) return;

    let cancelled = false;
    (async () => {
      const match = submissions.find((s) => String(s._id) === String(submissionId));
      if (match) {
        if (!cancelled) {
          setViewTab("overview");
          setViewingSubmission(normalizeSubmission(match));
          setShowViewModal(true);
          await loadSubmissionDetails(match._id, match);
        }
        return;
      }
      try {
        const response = await api.get(`/projects/${submissionId}`);
        const data = response.data.data || {};
        const submission = normalizeSubmission(data.project || data);
        if (!cancelled && submission?._id) {
          setViewTab("overview");
          setViewingSubmission(submission);
          setShowViewModal(true);
          await loadSubmissionDetails(submission._id, submission);
        }
      } catch (err) {
        console.error("Failed to open submission from URL:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, submissions, loading]);

  const openRevisionModal = (submission) => {
    const normalized = normalizeSubmission(submission);
    setActionSubmission(normalized);
    setRevisionForm({
      revisionNotes: normalized.teacherFeedback || "",
    });
    setShowRevisionModal(true);
  };

  const openApproveConfirm = (submission) => {
    setActionSubmission(normalizeSubmission(submission));
    setShowApproveConfirm(true);
  };

  const openRejectConfirm = (submission) => {
    setActionSubmission(normalizeSubmission(submission));
    setShowRejectConfirm(true);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: "bg-amber-100", text: "text-amber-700", icon: Clock, label: "Pending" },
      approved: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle, label: "Approved" },
      rejected: { bg: "bg-red-100", text: "text-red-700", icon: XCircle, label: "Rejected" },
      revision: { bg: "bg-blue-100", text: "text-blue-700", icon: RotateCcw, label: "Revision" },
      graded: { bg: "bg-purple-100", text: "text-purple-700", icon: Award, label: "Graded" },
    };
    return badges[status] || { bg: "bg-gray-100", text: "text-gray-700", icon: FileText, label: status };
  };

  const canTakeAction = (submission) =>
    canReview && ["pending", "revision", "approved"].includes(submission.status);

  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-50" />;
    return sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const SortableHeader = ({ field, children }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-sky-700 uppercase cursor-pointer hover:bg-sky-100"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {getSortIcon(field)}
      </div>
    </th>
  );

  return (
    <div className="space-y-5">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm ${
            notification.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {notification.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {notification.message}
          <button onClick={() => setNotification(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      <PageHeader
        icon={FileCheck}
        iconColor="text-sky-500"
        title="Submissions"
        subtitle={
          <>
            Review workflow: grade, approve, reject, or request revision. For file uploads and code health, use{" "}
            <span className="font-medium text-sky-700">Projects</span>.
            {totalItems > 0 && <span className="ml-2 text-sky-600">({totalItems} matching)</span>}
          </>
        }
      >
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600 flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} icon={FileCheck} iconColor="sky" onClick={() => setQuickStatus("")} />
        <StatCard label="Pending" value={stats.pending} icon={Clock} iconColor="amber" onClick={() => setQuickStatus("pending")} />
        <StatCard label="Graded" value={stats.graded} icon={Award} iconColor="purple" onClick={() => setQuickStatus("graded")} />
        <StatCard label="Revision" value={stats.revision} icon={RotateCcw} iconColor="blue" onClick={() => setQuickStatus("revision")} />
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value || "all"}
            type="button"
            onClick={() => setQuickStatus(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              statusFilter === opt.value
                ? "bg-sky-500 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:border-sky-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-sky-100">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-500 mb-1 block">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Title, student, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (setCurrentPage(1), loadSubmissions())}
                className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${
              showFilters ? "bg-sky-100 text-sky-700" : "bg-gray-50 text-gray-600"
            }`}
          >
            <Filter size={14} /> More
          </button>
          <button
            onClick={() => {
              setCurrentPage(1);
              loadSubmissions();
            }}
            className="px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-600 flex items-center gap-2"
          >
            <Search size={14} /> Search
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Department</label>
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm min-w-[120px]"
              >
                <option value="">All</option>
                {["CS", "IT", "CT", "EC"].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Year</label>
              <select
                value={yearFilter}
                onChange={(e) => {
                  setYearFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm min-w-[100px]"
              >
                <option value="">All</option>
                {[1, 2, 3, 4, 5].map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 flex items-center gap-2"
            >
              <X size={14} /> Clear
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-sky-50">
              <tr>
                <SortableHeader field="title">Project</SortableHeader>
                <SortableHeader field="studentName">Student</SortableHeader>
                <SortableHeader field="department">Dept</SortableHeader>
                <SortableHeader field="status">Status</SortableHeader>
                <th className="px-4 py-3 text-left text-xs font-medium text-sky-700 uppercase">Grade</th>
                <SortableHeader field="submittedAt">Submitted</SortableHeader>
                <th className="px-4 py-3 text-left text-xs font-medium text-sky-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center">
                    <Loader2 size={32} className="text-sky-500 animate-spin mx-auto mb-2" />
                    <span className="text-gray-400 text-sm">Loading submissions...</span>
                  </td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center">
                    <FileCheck size={40} className="text-gray-300 mx-auto mb-2" />
                    <span className="text-gray-400 text-sm">No submissions found</span>
                  </td>
                </tr>
              ) : (
                submissions.map((submission) => {
                  const status = getStatusBadge(submission.status);
                  const StatusIcon = status.icon;
                  return (
                    <tr key={submission._id} className="hover:bg-sky-50/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-[150px]">
                          <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
                            <FileText size={14} className="text-sky-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">
                              {displayValue(submission.title, "Untitled Submission")}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              v{submission.versionCount || submission.currentVersion || 1}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{getStudentName(submission)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                          {displayValue(submission.department, "N/A")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${status.bg} ${status.text}`}
                        >
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {submission.grade != null ? (
                          <span className="font-semibold text-purple-700">{submission.grade}%</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(submission.submittedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => openViewModal(submission)}
                            className="p-1.5 rounded-lg hover:bg-sky-50 text-sky-600"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          {canTakeAction(submission) && (
                            <>
                              <button
                                onClick={() => openGradeModal(submission)}
                                className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-600"
                                title="Grade"
                              >
                                <Star size={16} />
                              </button>
                              <button
                                onClick={() => openRevisionModal(submission)}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
                                title="Revision"
                              >
                                <RotateCcw size={16} />
                              </button>
                              <button
                                onClick={() => openApproveConfirm(submission)}
                                className="p-1.5 rounded-lg hover:bg-green-50 text-green-600"
                                title="Approve"
                              >
                                <ThumbsUp size={16} />
                              </button>
                              <button
                                onClick={() => openRejectConfirm(submission)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                                title="Reject"
                              >
                                <ThumbsDown size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {(totalPages > 1 || totalItems > 0) && (
          <div className="px-5 py-3 border-t border-sky-100 flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="text-sm text-gray-500">
              Showing {submissions.length} of {totalItems} submissions
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-sky-50 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-500 min-w-[100px] text-center">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages <= 1}
                className="p-2 rounded-lg hover:bg-sky-50 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {showViewModal && viewingSubmission && (
        <Modal
          title={displayValue(viewingSubmission.title, "Submission Details")}
          icon={FileCheck}
          size="xl"
          onClose={() => setShowViewModal(false)}
        >
          <div className="p-4">
            {loadingDetails ? (
              <div className="py-12 text-center">
                <Loader2 size={28} className="text-sky-500 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading submission details...</p>
              </div>
            ) : (
              <>
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-4">
              {[
                { id: "overview", label: "Overview" },
                { id: "files", label: "Files" },
                { id: "feedback", label: "Feedback" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setViewTab(tab.id)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium ${
                    viewTab === tab.id
                      ? "bg-white text-sky-700 shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {viewTab === "overview" && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400">Status</p>
                    <span
                      className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-xs rounded-full ${getStatusBadge(viewingSubmission.status).bg} ${getStatusBadge(viewingSubmission.status).text}`}
                    >
                      {getStatusBadge(viewingSubmission.status).label}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Submitted</p>
                    <p>{formatDate(viewingSubmission.submittedAt)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <GraduationCap size={12} /> Student
                  </p>
                  <p className="font-medium">{getStudentName(viewingSubmission)}</p>
                  <p className="text-xs text-gray-500">{getStudentEmail(viewingSubmission)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <BookOpen size={12} /> Course
                  </p>
                  <p>{getCourseLabel(viewingSubmission)}</p>
                  {viewingSubmission.assignmentTitle &&
                    viewingSubmission.assignmentTitle !== "N/A" && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Assignment: {viewingSubmission.assignmentTitle}
                      </p>
                    )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-xs text-gray-400">Dept</p>
                    <p>{displayValue(viewingSubmission.department, "N/A")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Year</p>
                    <p>
                      {viewingSubmission.year != null && viewingSubmission.year !== "—"
                        ? `Y${viewingSubmission.year}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Section</p>
                    <p>{displayValue(viewingSubmission.section, "N/A")}</p>
                  </div>
                </div>
                <p className="text-gray-600">{viewingSubmission.description}</p>
                {canTakeAction(viewingSubmission) && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => {
                        setShowViewModal(false);
                        openGradeModal(viewingSubmission);
                      }}
                      className="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-medium"
                    >
                      Grade
                    </button>
                    <button
                      onClick={() => {
                        setShowViewModal(false);
                        openApproveConfirm(viewingSubmission);
                      }}
                      className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setShowViewModal(false);
                        openRevisionModal(viewingSubmission);
                      }}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium"
                    >
                      Request Revision
                    </button>
                  </div>
                )}
              </div>
            )}

            {viewTab === "files" && (
              <div className="space-y-2">
                {viewingVersions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">No files uploaded.</p>
                ) : (
                  [...viewingVersions]
                    .sort((a, b) => b.versionNumber - a.versionNumber)
                    .map((version) => (
                      <div
                        key={version._id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            Version {version.versionNumber}
                            {version.isLatest && (
                              <span className="ml-2 text-[10px] text-emerald-600">Latest</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">{formatDate(version.submittedAt)}</p>
                        </div>
                        <div className="flex gap-1">
                          {version.codeZipUrl && (
                            <a
                              href={resolveFileUrl(version.codeZipUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg hover:bg-white text-gray-500"
                            >
                              <Download size={16} />
                            </a>
                          )}
                          {version.srsPdfUrl && (
                            <a
                              href={resolveFileUrl(version.srsPdfUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg hover:bg-white text-gray-500"
                            >
                              <FileText size={16} />
                            </a>
                          )}
                          {version.designPdfUrl && (
                            <a
                              href={resolveFileUrl(version.designPdfUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg hover:bg-white text-gray-500"
                              title="Design PDF"
                            >
                              <FileText size={16} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}

            {viewTab === "feedback" && (
              <div className="space-y-3 text-sm">
                {viewingSubmission.grade != null ? (
                  <div className="p-4 bg-purple-50 rounded-xl">
                    <p className="text-xs text-gray-400">Grade</p>
                    <p className="text-2xl font-bold text-gray-800">{viewingSubmission.grade}%</p>
                    {viewingSubmission.gradedAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        Graded {formatDate(viewingSubmission.gradedAt)}
                        {viewingSubmission.gradedByName
                          ? ` by ${viewingSubmission.gradedByName}`
                          : ""}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">Not graded yet.</p>
                )}
                {viewingSubmission.criterionScores?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase">Criteria scores</p>
                    {viewingSubmission.criterionScores.map((c) => (
                      <div key={c.name} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">{c.name}</span>
                          <span className="font-medium text-gray-800">
                            {c.score}% <span className="text-gray-400">× {c.weight}%</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500 rounded-full"
                            style={{ width: `${c.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {viewingSubmission.teacherFeedback ? (
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-400 mb-1">Feedback</p>
                    <p className="text-gray-700">{viewingSubmission.teacherFeedback}</p>
                  </div>
                ) : (
                  <p className="text-gray-400 text-xs">No feedback yet.</p>
                )}
                {viewingSubmission.status === "revision" && (
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium">Revision required</p>
                    <p className="text-gray-700 mt-1">
                      {viewingSubmission.teacherFeedback || "Student must resubmit."}
                    </p>
                  </div>
                )}
              </div>
            )}
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Grade Modal */}
      {showGradeModal && actionSubmission && (
        <Modal
          title="Grade Submission"
          icon={Star}
          iconClass="text-yellow-500"
          size="lg"
          onClose={() => setShowGradeModal(false)}
        >
          <div className="p-4 space-y-3">
            <SubmissionContext submission={actionSubmission} />
            <CriteriaGradingPanel
              project={actionSubmission}
              existingFeedback={actionSubmission.existingFeedback}
              onSuccess={handleGradeSuccess}
              onCancel={() => setShowGradeModal(false)}
            />
          </div>
        </Modal>
      )}

      {/* Revision Modal */}
      {showRevisionModal && actionSubmission && (
        <Modal
          title="Request Revision"
          icon={RotateCcw}
          iconClass="text-blue-500"
          size="md"
          onClose={() => setShowRevisionModal(false)}
        >
          <form onSubmit={handleRevisionSubmit} className="p-4 space-y-3">
            <SubmissionContext submission={actionSubmission} />
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Revision notes *</label>
              <textarea
                rows={4}
                value={revisionForm.revisionNotes}
                onChange={(e) => setRevisionForm({ revisionNotes: e.target.value })}
                placeholder="What should the student fix?"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm resize-none"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submittingRevision}
                className="flex-1 bg-blue-500 text-white py-2 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingRevision && <Loader2 size={16} className="animate-spin" />}
                Send
              </button>
              <button
                type="button"
                onClick={() => setShowRevisionModal(false)}
                className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Approve Confirm */}
      {showApproveConfirm && actionSubmission && (
        <Modal
          title="Approve Submission"
          icon={ThumbsUp}
          iconClass="text-green-500"
          size="sm"
          onClose={() => setShowApproveConfirm(false)}
        >
          <div className="p-4">
            <SubmissionContext submission={actionSubmission} />
            <p className="text-sm text-gray-600 mb-4 text-center">
              Approve this submission from{" "}
              <span className="font-semibold">{getStudentName(actionSubmission)}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={submittingAction}
                className="flex-1 bg-green-500 text-white py-2 rounded-xl text-sm disabled:opacity-50"
              >
                {submittingAction ? "..." : "Approve"}
              </button>
              <button
                onClick={() => setShowApproveConfirm(false)}
                className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Confirm */}
      {showRejectConfirm && actionSubmission && (
        <Modal
          title="Reject Submission"
          icon={ThumbsDown}
          iconClass="text-red-500"
          size="sm"
          onClose={() => setShowRejectConfirm(false)}
        >
          <div className="p-4">
            <SubmissionContext submission={actionSubmission} />
            <p className="text-sm text-gray-600 mb-4 text-center">
              Reject this submission from{" "}
              <span className="font-semibold">{getStudentName(actionSubmission)}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={submittingAction}
                className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm disabled:opacity-50"
              >
                {submittingAction ? "..." : "Reject"}
              </button>
              <button
                onClick={() => setShowRejectConfirm(false)}
                className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SubmissionsPage;
