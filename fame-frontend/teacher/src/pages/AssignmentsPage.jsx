import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { assignmentAPI, courseAPI, projectAPI } from "../services/api";
import { averageGrade, toId } from "../utils/projectHelpers";
import { exportAssignments } from "../utils/exportAssignments";
import { useConfirmDialog } from "../components/ConfirmDialog";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import IconGlass from "../components/IconGlass";

import {
  Plus, Edit, Trash2, Eye, FileText, Calendar, Clock,
  Users, RefreshCw, Loader, X, AlertCircle,
  ChevronLeft, Download, Star, BookOpen, Search,
  ClipboardCheck, FileSpreadsheet, FileType, ChevronDown,
  Lock, Timer
} from "lucide-react";

const REQUIRED_FILE_LABELS = {
  code: "Source Code",
  srs: "SRS Document",
  design: "Design Document",
  manual: "User Manual",
  presentation: "Presentation",
  video: "Video Demo",
};

const AssignmentsPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    openDate: "",
    dueDate: "",
    allowLate: true,
    latePenalty: 10,
    maxLateDays: 5,
    maxFileSize: 200,
    requiredFiles: ["code", "srs", "design"]
  });

  useEffect(() => {
    loadData();
  }, [courseId]);

  const enrichAssignments = (assignmentsData, projectsData) =>
    assignmentsData.map((assignment) => {
      const projects = projectsData.filter(
        (p) => toId(p.assignmentId) === toId(assignment._id)
      );
      const graded = projects.filter((p) => p.grade != null);
      const pending = projects.filter((p) => p.status === "pending");
      return {
        ...assignment,
        submissionCount: projects.length,
        gradedCount: graded.length,
        pendingCount: pending.length,
        avgGrade: averageGrade(projects)
      };
    });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [courseRes, assignmentsRes, projectsRes] = await Promise.all([
        courseAPI.getCourseById(courseId),
        assignmentAPI.getAssignmentsByCourse(courseId),
        projectAPI.getMyProjects({ limit: 500 })
      ]);
      const projectsData = projectsRes.data.data || [];
      const assignmentsData = enrichAssignments(
        assignmentsRes.data.data || [],
        projectsData
      );
      setCourse(courseRes.data.data);
      setAssignments(assignmentsData);
    } catch (err) {
      console.error("Failed to load assignments:", err);
      setError("Failed to load assignments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getAssignmentStatus = (assignment) => {
    const now = new Date();
    const openDate = new Date(assignment.openDate);
    const dueDate = new Date(assignment.dueDate);
    if (now < openDate) {
      return { text: "Upcoming", color: "bg-gray-100 text-gray-700", Icon: Timer };
    }
    if (now > dueDate) {
      return { text: "Closed", color: "bg-rose-100 text-rose-700", Icon: Lock };
    }
    return { text: "Open", color: "bg-emerald-100 text-emerald-700", Icon: ClipboardCheck };
  };

  const filteredAssignments = useMemo(() => {
    const q = searchTerm.toLowerCase();
    if (!q) return assignments;
    return assignments.filter(
      (a) =>
        a.title?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q)
    );
  }, [assignments, searchTerm]);

  const stats = useMemo(() => {
    const open = assignments.filter((a) => {
      const s = getAssignmentStatus(a);
      return s.text === "Open";
    }).length;
    const totalSubmissions = assignments.reduce((s, a) => s + (a.submissionCount || 0), 0);
    const totalPending = assignments.reduce((s, a) => s + (a.pendingCount || 0), 0);
    const withGrades = assignments.filter((a) => a.avgGrade > 0);
    const avgGrade =
      withGrades.length > 0
        ? Math.round(withGrades.reduce((s, a) => s + a.avgGrade, 0) / withGrades.length)
        : 0;
    return { open, totalSubmissions, totalPending, avgGrade };
  }, [assignments]);

  const handleCreateAssignment = async () => {
    if (!formData.title.trim()) {
      alert("Please enter assignment title");
      return;
    }
    if (!formData.openDate || !formData.dueDate) {
      alert("Please select open and due dates");
      return;
    }
    const openDateObj = new Date(formData.openDate);
    const dueDateObj = new Date(formData.dueDate);
    if (openDateObj >= dueDateObj) {
      alert("Open date must be before due date");
      return;
    }
    if (!formData.requiredFiles.length) {
      alert("Please select at least one required submission file");
      return;
    }

    setSubmitting(true);
    try {
      await assignmentAPI.createAssignment({
        courseId,
        title: formData.title.trim(),
        description: formData.description || "",
        openDate: openDateObj.toISOString(),
        dueDate: dueDateObj.toISOString(),
        allowLate: formData.allowLate,
        latePenalty: parseInt(formData.latePenalty) || 10,
        maxLateDays: parseInt(formData.maxLateDays) || 5,
        maxFileSize: parseInt(formData.maxFileSize) || 200,
        requiredFiles: formData.requiredFiles,
        status: "published"
      });
      setShowCreateModal(false);
      resetForm();
      loadData();
      alert("Assignment created successfully!");
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        "Failed to create assignment";
      alert(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAssignment = async () => {
    const openDateObj = new Date(formData.openDate);
    const dueDateObj = new Date(formData.dueDate);
    if (openDateObj >= dueDateObj) {
      alert("Open date must be before due date");
      return;
    }
    if (!formData.requiredFiles.length) {
      alert("Please select at least one required submission file");
      return;
    }

    setSubmitting(true);
    try {
      await assignmentAPI.updateAssignment(selectedAssignment._id, {
        title: formData.title,
        description: formData.description,
        openDate: openDateObj.toISOString(),
        dueDate: dueDateObj.toISOString(),
        allowLate: formData.allowLate,
        latePenalty: parseInt(formData.latePenalty),
        maxLateDays: parseInt(formData.maxLateDays),
        maxFileSize: parseInt(formData.maxFileSize),
        requiredFiles: formData.requiredFiles
      });
      setShowEditModal(false);
      resetForm();
      loadData();
      alert("Assignment updated successfully!");
    } catch {
      alert("Failed to update assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!(await confirm({
      title: "Delete assignment?",
      message: "All related submissions will also be permanently removed.",
      confirmLabel: "Delete assignment",
    }))) {
      return;
    }
    try {
      await assignmentAPI.deleteAssignment(assignmentId);
      loadData();
      alert("Assignment deleted successfully!");
    } catch {
      alert("Failed to delete assignment");
    }
  };

  const handleExport = (format) => {
    if (!filteredAssignments.length) {
      alert("No assignments to export.");
      return;
    }
    setExporting(true);
    setShowExportMenu(false);
    try {
      exportAssignments(format, filteredAssignments, {
        filenamePrefix: "assignments",
        courseName: course?.courseName || course?.name || "Course",
        getStatusLabel: (a) => getAssignmentStatus(a).text
      });
    } finally {
      setExporting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      openDate: "",
      dueDate: "",
      allowLate: true,
      latePenalty: 10,
      maxLateDays: 5,
      maxFileSize: 200,
      requiredFiles: ["code", "srs", "design"]
    });
  };

  const openEditModal = (assignment) => {
    setSelectedAssignment(assignment);
    setFormData({
      title: assignment.title,
      description: assignment.description || "",
      openDate: assignment.openDate?.split("T")[0] || "",
      dueDate: assignment.dueDate?.split("T")[0] || "",
      allowLate: assignment.allowLate ?? true,
      latePenalty: assignment.latePenalty ?? 10,
      maxLateDays: assignment.maxLateDays ?? 5,
      maxFileSize: assignment.maxFileSize ?? 200,
      requiredFiles: assignment.requiredFiles || ["code", "srs", "design"]
    });
    setShowEditModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <Loader className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading assignments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-96">
        <AlertCircle size={48} className="text-red-500 mb-3" />
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center gap-2"
        >
          <RefreshCw size={16} /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate("/courses")}
          className="text-blue-500 text-sm mb-3 hover:underline flex items-center gap-1"
        >
          <ChevronLeft size={16} /> Back to Courses
        </button>
        <PageHeader
          title={course?.courseName || course?.name || "Assignments"}
          subtitle={`${course?.courseCode || course?.code} · ${course?.semester || "Semester"} ${course?.academicYear || ""}`}
          icon={BookOpen}
        >
          <button
            onClick={loadData}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              disabled={exporting || !filteredAssignments.length}
              className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2"
            >
              {exporting ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              Export
              <ChevronDown size={14} />
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border py-1 z-20">
                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FileText size={16} className="text-emerald-600" /> Export CSV
                  </button>
                  <button
                    onClick={() => handleExport("excel")}
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FileSpreadsheet size={16} className="text-green-600" /> Export Excel
                  </button>
                  <button
                    onClick={() => handleExport("pdf")}
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FileType size={16} className="text-red-600" /> Export PDF
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:from-blue-600 hover:to-indigo-600 shadow-sm"
          >
            <Plus size={16} /> Create Assignment
          </button>
        </PageHeader>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Search assignments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={assignments.length} icon={FileText} iconColor="blue" cardClass="cute-card cute-card-blue p-4" />
        <StatCard label="Open" value={stats.open} icon={ClipboardCheck} iconColor="green" cardClass="cute-card cute-card-green p-4" />
        <StatCard label="Submissions" value={stats.totalSubmissions} icon={Users} iconColor="purple" cardClass="cute-card cute-card-purple p-4" />
        <StatCard label="Avg Grade" value={`${stats.avgGrade}%`} icon={Star} iconColor="amber" cardClass="cute-card cute-card-amber p-4" />
      </div>
      {stats.totalPending > 0 && (
        <StatCard
          label="Awaiting Review"
          value={stats.totalPending}
          icon={AlertCircle}
          iconColor="amber"
          cardClass="cute-card cute-card-amber p-4"
        />
      )}

      {/* Assignments List */}
      <div className="space-y-4">
        {filteredAssignments.map((assignment) => {
          const status = getAssignmentStatus(assignment);
          const StatusIcon = status.Icon;
          return (
            <div
              key={assignment._id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start flex-wrap gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <StatusIcon size={18} className="text-gray-500 shrink-0" />
                    <h3 className="font-semibold text-gray-800 text-lg">{assignment.title}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${status.color}`}>
                      {status.text}
                    </span>
                    {(assignment.pendingCount || 0) > 0 && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
                        {assignment.pendingCount} pending
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {assignment.description || "No description"}
                  </p>
                  {(assignment.requiredFiles || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {assignment.requiredFiles.map((file) => (
                        <span
                          key={file}
                          className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-100"
                        >
                          {REQUIRED_FILE_LABELS[file] || file}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> Opens: {formatDate(assignment.openDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> Due: {formatDate(assignment.dueDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={12} /> Submissions: {assignment.submissionCount || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star size={12} /> Avg: {assignment.avgGrade || 0}%
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  <button
                    onClick={() => navigate(`/assignments/${assignment._id}/submissions`)}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 flex items-center gap-1"
                    title="View Submissions"
                  >
                    <Eye size={14} /> Submissions
                  </button>
                  <button
                    onClick={() => navigate(`/submissions?assignment=${assignment._id}`)}
                    className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-sm hover:bg-amber-100 flex items-center gap-1"
                  >
                    <ClipboardCheck size={14} /> Review
                  </button>
                  <button
                    onClick={() => navigate(`/assignments/${assignment._id}/criteria`)}
                    className="p-2 rounded-lg hover:bg-purple-50 text-purple-500"
                    title="Grading Criteria"
                  >
                    <Star size={18} />
                  </button>
                  <button
                    onClick={() => openEditModal(assignment)}
                    className="p-2 rounded-lg hover:bg-amber-50 text-amber-500"
                    title="Edit"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteAssignment(assignment._id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredAssignments.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-blue-100">
            <FileText size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm ? "No assignments match your search" : "No assignments yet"}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
              >
                Create Assignment
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3 min-w-0">
                <IconGlass size="md" interactive className="text-blue-500">
                  <Plus size={20} />
                </IconGlass>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Create New Assignment</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Set deadlines, late policy, and required submission files</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div>
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  className="form-input"
                  placeholder="e.g., Final Project — E-Learning Platform"
                />
              </div>

              <div>
                <label className="form-label">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="form-textarea"
                  placeholder="Brief instructions for students…"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Open Date *</label>
                  <input
                    type="date"
                    value={formData.openDate}
                    onChange={(e) => setFormData((p) => ({ ...p, openDate: e.target.value }))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Due Date *</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData((p) => ({ ...p, dueDate: e.target.value }))}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-section">
                <div className="flex items-center gap-2">
                  <Timer size={16} className="text-amber-500" />
                  <h3 className="font-medium text-gray-800">Late Submission Policy</h3>
                </div>
                <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowLate}
                    onChange={(e) => setFormData((p) => ({ ...p, allowLate: e.target.checked }))}
                    className="form-checkbox"
                  />
                  Allow late submissions
                </label>
                {formData.allowLate && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="form-label text-xs text-gray-500">Penalty (% per day)</label>
                      <input
                        type="number"
                        value={formData.latePenalty}
                        onChange={(e) => setFormData((p) => ({ ...p, latePenalty: e.target.value }))}
                        className="form-input"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs text-gray-500">Max Late Days</label>
                      <input
                        type="number"
                        value={formData.maxLateDays}
                        onChange={(e) => setFormData((p) => ({ ...p, maxLateDays: e.target.value }))}
                        className="form-input"
                        min="1"
                        max="30"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="form-label">Required Files</label>
                <div className="flex flex-wrap gap-2">
                  {["code", "srs", "design", "manual", "presentation", "video"].map((file) => (
                    <label key={file} className="form-chip">
                      <input
                        type="checkbox"
                        checked={formData.requiredFiles.includes(file)}
                        onChange={(e) => {
                          setFormData((p) => ({
                            ...p,
                            requiredFiles: e.target.checked
                              ? [...p.requiredFiles, file]
                              : p.requiredFiles.filter((f) => f !== file)
                          }));
                        }}
                        className="form-checkbox"
                      />
                      <span className="capitalize">
                        {file === "srs" ? "SRS Document" : file === "code" ? "Source Code" : file}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Max File Size (MB)</label>
                <input
                  type="number"
                  value={formData.maxFileSize}
                  onChange={(e) => setFormData((p) => ({ ...p, maxFileSize: e.target.value }))}
                  className="form-input"
                  min="1"
                  max="500"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateAssignment}
                disabled={submitting}
                className="flex-1 btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                Create Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedAssignment && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3 min-w-0">
                <IconGlass size="md" interactive className="text-indigo-500">
                  <Edit size={20} />
                </IconGlass>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Edit Assignment</h2>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{selectedAssignment.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div>
                <label className="form-label">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="form-textarea"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Open Date</label>
                  <input
                    type="date"
                    value={formData.openDate}
                    onChange={(e) => setFormData((p) => ({ ...p, openDate: e.target.value }))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData((p) => ({ ...p, dueDate: e.target.value }))}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateAssignment}
                disabled={submitting}
                className="flex-1 btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader size={16} className="animate-spin" /> : <Edit size={16} />}
                Update Assignment
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
};

export default AssignmentsPage;
