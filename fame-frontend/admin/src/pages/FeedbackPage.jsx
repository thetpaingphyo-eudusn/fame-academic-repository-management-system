import React, { useEffect, useState } from "react";
import api from "../services/api";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

import {
  MessageSquare,
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
  Star,
  AlertCircle,
  GraduationCap,
  BookOpen,
  Award,
  TrendingUp,
} from "lucide-react";

const MODAL_SIZES = {
  sm: "max-w-[360px]",
  md: "max-w-[420px]",
  lg: "max-w-[560px]",
  xl: "max-w-[640px]",
};

const GRADE_FILTER_OPTIONS = [
  { value: "", label: "All Grades" },
  { value: "80", label: "Excellent (80+)" },
  { value: "60", label: "Good (60+)" },
  { value: "40", label: "Average (40+)" },
];

const Modal = ({ onClose, title, icon: Icon, iconClass = "text-rose-500", size = "lg", children }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 sm:p-6"
    onClick={onClose}
  >
    <div
      className={`${MODAL_SIZES[size]} w-full bg-white rounded-xl shadow-2xl border border-rose-100 overflow-hidden`}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-rose-50/80 to-white">
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

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const displayValue = (value, fallback = "—") => {
  if (value === null || value === undefined || value === "") return fallback;
  return value;
};

const normalizeFeedback = (feedback) => ({
  ...feedback,
  projectTitle:
    feedback?.projectTitle ||
    feedback?.projectId?.title ||
    "Untitled Project",
  studentName:
    feedback?.studentName ||
    feedback?.projectId?.studentName ||
    feedback?.projectId?.studentId?.name ||
    "Unknown Student",
  studentEmail:
    feedback?.studentEmail ||
    feedback?.projectId?.studentEmail ||
    feedback?.projectId?.studentId?.email ||
    null,
  teacherName: feedback?.teacherName || feedback?.teacherId?.name || "Unknown Teacher",
  department:
    feedback?.department || feedback?.projectId?.department || "N/A",
  section: feedback?.section || feedback?.projectId?.section || "N/A",
  year: feedback?.year ?? feedback?.projectId?.year ?? null,
  courseCode:
    feedback?.courseCode ||
    feedback?.projectId?.courseCode ||
    feedback?.projectId?.courseId?.courseCode ||
    "N/A",
  courseName:
    feedback?.courseName ||
    feedback?.projectId?.courseName ||
    feedback?.projectId?.courseId?.courseName ||
    "N/A",
  feedbackText: feedback?.feedbackText || "No feedback provided.",
  grade: feedback?.grade ?? null,
});

const getCourseLabel = (feedback) => {
  const code = feedback?.courseCode;
  const name = feedback?.courseName;
  if (code && name && code !== "N/A" && name !== "N/A") return `${code} — ${name}`;
  return code !== "N/A" ? code : name !== "N/A" ? name : "N/A";
};

const getGradeLabel = (grade) => {
  if (grade == null) return { label: "Ungraded", bg: "bg-gray-100", text: "text-gray-600" };
  if (grade >= 80) return { label: "Excellent", bg: "bg-green-100", text: "text-green-700" };
  if (grade >= 60) return { label: "Good", bg: "bg-blue-100", text: "text-blue-700" };
  if (grade >= 40) return { label: "Average", bg: "bg-amber-100", text: "text-amber-700" };
  return { label: "Needs Work", bg: "bg-red-100", text: "text-red-700" };
};

const ScoreBar = ({ label, score }) => {
  if (score == null) return null;
  let color = "bg-red-500";
  if (score >= 80) color = "bg-green-500";
  else if (score >= 60) color = "bg-blue-500";
  else if (score >= 40) color = "bg-amber-500";

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-700 font-medium">{score}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
};

const FeedbackPage = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewTab, setViewTab] = useState("overview");
  const [viewingFeedback, setViewingFeedback] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [notification, setNotification] = useState(null);
  const [stats, setStats] = useState({ total: 0, excellent: 0, average: 0, revision: 0 });

  const [gradeFilter, setGradeFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const itemsPerPage = 10;

  useEffect(() => {
    loadFeedbacks();
  }, [currentPage, sortField, sortOrder, searchTerm, gradeFilter, departmentFilter, yearFilter]);

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
      const response = await api.get("/admin/feedbacks", { params: { limit: 200, page: 1 } });
      const items = (response.data.data || []).map(normalizeFeedback);
      const grades = items.filter((f) => f.grade != null);
      const avg =
        grades.length > 0
          ? Math.round(grades.reduce((sum, f) => sum + f.grade, 0) / grades.length)
          : 0;
      setStats({
        total: response.data.pagination?.total ?? items.length,
        excellent: items.filter((f) => (f.grade ?? 0) >= 80).length,
        average: avg,
        revision: items.filter((f) => f.revisionRequested).length,
      });
    } catch (error) {
      console.error("Failed to load feedback stats:", error);
    }
  };

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("limit", itemsPerPage);
      params.append("sort", sortField);
      params.append("order", sortOrder);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      if (gradeFilter) params.append("gradeMin", gradeFilter);
      if (departmentFilter) params.append("department", departmentFilter);
      if (yearFilter) params.append("year", yearFilter);

      const response = await api.get(`/admin/feedbacks?${params.toString()}`);
      const pagination = response.data.pagination || {};
      const total = pagination.total ?? 0;

      setFeedbacks((response.data.data || []).map(normalizeFeedback));
      setTotalItems(total);
      setTotalPages((pagination.pages ?? Math.ceil(total / itemsPerPage)) || 1);
    } catch (error) {
      console.error("Failed to load feedbacks:", error);
      showNotice("error", "Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadFeedbacks(), loadStats()]);
    setTimeout(() => setRefreshing(false), 500);
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setGradeFilter("");
    setDepartmentFilter("");
    setYearFilter("");
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

  const openViewModal = (feedback) => {
    setViewTab("overview");
    setViewingFeedback(normalizeFeedback(feedback));
    setShowViewModal(true);
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-50" />;
    return sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const SortableHeader = ({ field, children }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-rose-700 uppercase cursor-pointer hover:bg-rose-100"
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
        icon={MessageSquare}
        iconColor="text-rose-500"
        title="Feedback"
        subtitle={
          <>
            Review teacher feedback and grades across all submissions
            {totalItems > 0 && <span className="ml-2 text-rose-600">({totalItems} matching)</span>}
          </>
        }
      >
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} icon={MessageSquare} iconColor="rose" />
        <StatCard label="Excellent (80+)" value={stats.excellent} icon={Award} iconColor="green" />
        <StatCard label="Avg Grade" value={stats.average ? `${stats.average}%` : "—"} icon={TrendingUp} iconColor="blue" />
        <StatCard label="Revisions" value={stats.revision} icon={Star} iconColor="amber" />
      </div>

      {/* Grade chips */}
      <div className="flex flex-wrap gap-2">
        {GRADE_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value || "all"}
            type="button"
            onClick={() => {
              setGradeFilter(opt.value);
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              gradeFilter === opt.value
                ? "bg-rose-500 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:border-rose-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-rose-100">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-500 mb-1 block">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Project, student, teacher, feedback..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (setCurrentPage(1), loadFeedbacks())}
                className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
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
              showFilters ? "bg-rose-100 text-rose-700" : "bg-gray-50 text-gray-600"
            }`}
          >
            <Filter size={14} /> More
          </button>
          <button
            onClick={() => {
              setCurrentPage(1);
              loadFeedbacks();
            }}
            className="px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 flex items-center gap-2"
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
      <div className="bg-white rounded-2xl shadow-sm border border-rose-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-rose-50">
              <tr>
                <SortableHeader field="projectTitle">Project</SortableHeader>
                <SortableHeader field="studentName">Student</SortableHeader>
                <SortableHeader field="teacherName">Teacher</SortableHeader>
                <SortableHeader field="grade">Grade</SortableHeader>
                <th className="px-4 py-3 text-left text-xs font-medium text-rose-700 uppercase">
                  Feedback
                </th>
                <SortableHeader field="createdAt">Date</SortableHeader>
                <th className="px-4 py-3 text-left text-xs font-medium text-rose-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center">
                    <Loader2 size={32} className="text-rose-500 animate-spin mx-auto mb-2" />
                    <span className="text-gray-400 text-sm">Loading feedback...</span>
                  </td>
                </tr>
              ) : feedbacks.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center">
                    <MessageSquare size={40} className="text-gray-300 mx-auto mb-2" />
                    <span className="text-gray-400 text-sm">No feedback found</span>
                  </td>
                </tr>
              ) : (
                feedbacks.map((feedback) => {
                  const gradeInfo = getGradeLabel(feedback.grade);
                  return (
                    <tr key={feedback._id} className="hover:bg-rose-50/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
                            <FileText size={14} className="text-rose-600" />
                          </div>
                          <p className="font-medium text-gray-800 truncate max-w-[140px]">
                            {displayValue(feedback.projectTitle, "Untitled Project")}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <User size={14} className="text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-600 truncate max-w-[100px]">
                            {feedback.studentName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[100px]">
                        {feedback.teacherName}
                      </td>
                      <td className="px-4 py-3">
                        {feedback.grade != null ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${gradeInfo.bg} ${gradeInfo.text}`}
                          >
                            <Star size={10} />
                            {feedback.grade}%
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600 line-clamp-2 max-w-[200px]">
                          {feedback.feedbackText}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(feedback.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openViewModal(feedback)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {(totalPages > 1 || totalItems > 0) && (
          <div className="px-5 py-3 border-t border-rose-100 flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="text-sm text-gray-500">
              Showing {feedbacks.length} of {totalItems} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-rose-50 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-500 min-w-[100px] text-center">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages <= 1}
                className="p-2 rounded-lg hover:bg-rose-50 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {showViewModal && viewingFeedback && (
        <Modal
          title={displayValue(viewingFeedback.projectTitle, "Feedback Details")}
          icon={MessageSquare}
          size="xl"
          onClose={() => setShowViewModal(false)}
        >
          <div className="p-4">
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-4">
              {[
                { id: "overview", label: "Overview" },
                { id: "scores", label: "Scores" },
                { id: "feedback", label: "Feedback" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setViewTab(tab.id)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    viewTab === tab.id
                      ? "bg-white text-rose-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {viewTab === "overview" && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400">Grade</p>
                    {viewingFeedback.grade != null ? (
                      <p className="text-2xl font-bold text-gray-800">{viewingFeedback.grade}%</p>
                    ) : (
                      <p className="text-gray-500">Not graded</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Submitted</p>
                    <p className="text-gray-700">{formatDateTime(viewingFeedback.createdAt)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <GraduationCap size={12} /> Student
                  </p>
                  <p className="font-medium text-gray-800">{viewingFeedback.studentName}</p>
                  <p className="text-xs text-gray-500">
                    {viewingFeedback.studentEmail || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <User size={12} /> Teacher
                  </p>
                  <p className="font-medium text-gray-800">{viewingFeedback.teacherName}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <BookOpen size={12} /> Course
                  </p>
                  <p className="text-gray-700">{getCourseLabel(viewingFeedback)}</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-xs text-gray-400">Dept</p>
                    <p>{displayValue(viewingFeedback.department, "N/A")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Year</p>
                    <p>
                      {viewingFeedback.year != null ? `Y${viewingFeedback.year}` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Section</p>
                    <p>{displayValue(viewingFeedback.section, "N/A")}</p>
                  </div>
                </div>

                {viewingFeedback.revisionRequested && (
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-600 font-medium">Revision requested</p>
                    <p className="text-gray-700 mt-1 text-xs">
                      {viewingFeedback.revisionNotes || "Student must address feedback and resubmit."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {viewTab === "scores" && (
              <div className="space-y-4">
                {viewingFeedback.grade != null ? (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-xs text-gray-400 mb-1">Overall Grade</p>
                    <p className="text-3xl font-bold text-gray-800">{viewingFeedback.grade}%</p>
                    <span
                      className={`inline-block mt-2 px-2 py-0.5 text-xs rounded-full ${getGradeLabel(viewingFeedback.grade).bg} ${getGradeLabel(viewingFeedback.grade).text}`}
                    >
                      {getGradeLabel(viewingFeedback.grade).label}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-6">No grade recorded.</p>
                )}

                <div className="space-y-3">
                  {viewingFeedback.criterionScores?.length > 0 ? (
                    viewingFeedback.criterionScores.map((c) => (
                      <ScoreBar
                        key={c.name}
                        label={`${c.name} (${c.weight}%)`}
                        score={c.score}
                      />
                    ))
                  ) : (
                    <>
                      <ScoreBar label="Code Quality" score={viewingFeedback.codeQualityScore} />
                      <ScoreBar label="Documentation" score={viewingFeedback.documentationScore} />
                      <ScoreBar label="Library Usage" score={viewingFeedback.libraryUsageScore} />
                    </>
                  )}
                </div>

                {!viewingFeedback.criterionScores?.length &&
                  !viewingFeedback.codeQualityScore &&
                  !viewingFeedback.documentationScore &&
                  !viewingFeedback.libraryUsageScore && (
                    <p className="text-xs text-gray-400 text-center">
                      No category scores recorded for this feedback.
                    </p>
                  )}
              </div>
            )}

            {viewTab === "feedback" && (
              <div className="space-y-3 text-sm">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                    <MessageSquare size={12} /> Teacher Feedback
                  </p>
                  <p className="text-gray-700 leading-relaxed">{viewingFeedback.feedbackText}</p>
                  <p className="text-xs text-gray-400 mt-3">
                    {viewingFeedback.teacherName} · {formatDateTime(viewingFeedback.createdAt)}
                  </p>
                </div>

                {viewingFeedback.isFinal && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle size={12} /> Marked as final feedback
                  </p>
                )}

                {viewingFeedback.isPublished && viewingFeedback.publishedAt && (
                  <p className="text-xs text-gray-500">
                    Published {formatDateTime(viewingFeedback.publishedAt)}
                  </p>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FeedbackPage;
