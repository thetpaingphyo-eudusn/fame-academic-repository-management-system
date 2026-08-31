import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import { FAME } from "../utils/fameBrand";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

import {
  FolderKanban,
  Trash2,
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
  Download,
  FileCode,
  FileJson,
  Star,
  Activity,
  Sparkles,
  Upload,
  Check,
  GraduationCap,
  BookOpen,
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
  { value: "archived", label: "Archived" },
];

const Modal = ({ onClose, title, icon: Icon, iconClass = "text-emerald-500", size = "md", children }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 sm:p-6"
    onClick={onClose}
  >
    <div
      className={`${MODAL_SIZES[size]} w-full bg-white rounded-xl shadow-2xl border border-emerald-100 overflow-hidden`}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50/80 to-white">
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

const getStudentName = (project) => {
  if (!project) return "—";
  return (
    project.studentName ||
    project.studentId?.name ||
    "Unknown Student"
  );
};

const getStudentEmail = (project) =>
  project?.studentEmail ||
  project?.studentId?.email ||
  project?.studentRollNumber ||
  project?.studentId?.studentId ||
  "—";

const getCourseLabel = (project) => {
  if (!project) return "—";
  const code = project.courseCode || project.courseId?.courseCode;
  const name = project.courseName || project.courseId?.courseName;
  if (code && name) return `${code} — ${name}`;
  return code || name || "—";
};

const normalizeProjectFromList = (project) => ({
  ...project,
  studentName: getStudentName(project),
  studentEmail: getStudentEmail(project),
  courseCode: project.courseCode || project.courseId?.courseCode || "N/A",
  courseName: project.courseName || project.courseId?.courseName || "N/A",
  department: project.department || "N/A",
  section: project.section || "N/A",
  year: project.year ?? "—",
});

const ProjectsPage = () => {
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewTab, setViewTab] = useState("overview");
  const [viewingProject, setViewingProject] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [uploadingProject, setUploadingProject] = useState(null);
  const [viewingVersions, setViewingVersions] = useState([]);
  const [viewingDependencies, setViewingDependencies] = useState([]);
  const [viewingHealthScore, setViewingHealthScore] = useState(null);
  const [viewingSuggestions, setViewingSuggestions] = useState([]);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState(null);
  const [deletingProjectTitle, setDeletingProjectTitle] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sortField, setSortField] = useState("submittedAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [notification, setNotification] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    graded: 0,
  });

  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [healthFilter, setHealthFilter] = useState("");

  const [uploadFormData, setUploadFormData] = useState({
    codeZip: null,
    srsPdf: null,
    designPdf: null,
    manualPdf: null,
    dependencyFile: null,
  });

  const itemsPerPage = 10;

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) setSearchTerm(q);
  }, [searchParams]);

  useEffect(() => {
    loadProjects();
  }, [currentPage, sortField, sortOrder, searchTerm, statusFilter, departmentFilter, yearFilter, healthFilter]);

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
      setStats({
        total: data.totalProjects || 0,
        pending: data.pendingProjects || 0,
        approved: 0,
        graded: 0,
      });
      const statusRes = await api.get("/projects", { params: { limit: 200, page: 1 } });
      const items = statusRes.data.data || [];
      setStats((prev) => ({
        ...prev,
        approved: items.filter((p) => p.status === "approved").length,
        graded: items.filter((p) => p.status === "graded").length,
      }));
    } catch (error) {
      console.error("Failed to load project stats:", error);
    }
  };

  const loadProjects = async () => {
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
      if (healthFilter === "good") {
        params.append("minHealth", "80");
        params.append("maxHealth", "100");
      } else if (healthFilter === "warning") {
        params.append("minHealth", "50");
        params.append("maxHealth", "79");
      } else if (healthFilter === "critical") {
        params.append("minHealth", "0");
        params.append("maxHealth", "49");
      }

      const response = await api.get(`/projects?${params.toString()}`);
      const pagination = response.data.pagination || {};
      const total = pagination.total ?? 0;

      setProjects(response.data.data || []);
      setTotalItems(total);
      setTotalPages((pagination.pages ?? Math.ceil(total / itemsPerPage)) || 1);
    } catch (error) {
      console.error("Failed to load projects:", error);
      showNotice("error", "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const loadProjectDetails = async (projectId, fallbackProject = null) => {
    setLoadingDetails(true);
    if (fallbackProject) {
      setViewingProject(normalizeProjectFromList(fallbackProject));
    }
    setViewingVersions([]);
    setViewingDependencies([]);
    setViewingHealthScore(fallbackProject?.codeHealthScore ?? null);
    setViewingSuggestions([]);

    try {
      const response = await api.get(`/projects/${projectId}`);
      const projectData = response.data.data || {};
      const project = normalizeProjectFromList(projectData.project || {});
      setViewingProject(project);
      setViewingVersions(projectData.versions || []);

      const latestVersion =
        projectData.latestVersion ||
        projectData.versions?.find((v) => v.isLatest) ||
        projectData.versions?.[0];

      if (latestVersion) {
        setViewingDependencies(latestVersion.dependencies || []);
        setViewingHealthScore(
          latestVersion.codeHealthScore ?? project.codeHealthScore ?? null
        );
        const saved = latestVersion.dependencyAnalysis?.recommendations;
        if (saved?.length) {
          setViewingSuggestions(
            saved.map((item) =>
              typeof item === "string" ? { type: "info", message: item } : item
            )
          );
        }
      }
    } catch (error) {
      console.error("Failed to load project details:", error);
      showNotice("error", "Failed to load project details");
      if (!fallbackProject) {
        setShowViewModal(false);
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  const triggerFileDownload = (url, label) => {
    const resolved = resolveFileUrl(url);
    if (!resolved) {
      showNotice("error", `${label} is not available`);
      return false;
    }
    const link = document.createElement("a");
    link.href = resolved;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  };

  const handleDownloadProject = async (project) => {
    setDownloadingId(project._id);
    try {
      const response = await api.get(`/projects/${project._id}/download`);
      const data = response.data.data || {};
      const files = [
        { url: data.codeZipUrl, label: "Code ZIP" },
        { url: data.srsPdfUrl, label: "SRS PDF" },
        { url: data.designPdfUrl, label: "Design PDF" },
        { url: data.manualPdfUrl, label: "Manual PDF" },
      ].filter((f) => f.url);

      if (files.length === 0) {
        showNotice("error", "No files uploaded for this project yet");
        return;
      }

      triggerFileDownload(files[0].url, files[0].label);
      files.slice(1).forEach((file, index) => {
        setTimeout(() => triggerFileDownload(file.url, file.label), (index + 1) * 400);
      });
      showNotice("success", `Downloading ${files.length} file(s)`);
    } catch (error) {
      showNotice("error", error.response?.data?.message || "Failed to download project");
    } finally {
      setDownloadingId(null);
    }
  };

  const checkProjectHealth = async () => {
    if (!viewingProject) return;
    setCheckingHealth(true);
    setViewingSuggestions([]);

    try {
      const latestVersion = viewingVersions.find((v) => v.isLatest);
      if (!latestVersion?.dependencies?.length) {
        setViewingSuggestions([
          {
            type: "info",
            message: "No dependencies found.",
            action: "Upload a project with package.json or requirements.txt.",
          },
        ]);
        return;
      }

      const geminiResponse = await api.post("/ai/analyze-dependencies", {
        dependencies: latestVersion.dependencies,
      });

      if (geminiResponse.data.success) {
        const result = geminiResponse.data.data;
        setViewingSuggestions(result.recommendations || []);
        setViewingHealthScore(result.healthScore ?? viewingHealthScore);
        if (result.source === "local-fallback") {
          showNotice(
            "warning",
            result.fallbackReason || `${FAME} unavailable — showing local dependency analysis.`
          );
        }
      } else {
        setViewingSuggestions([
          { type: "warning", message: "Unable to get AI suggestions. Try again later." },
        ]);
      }
    } catch (error) {
      setViewingSuggestions([
        {
          type: "error",
          message: error.response?.data?.message || "Failed to analyze project health.",
        },
      ]);
    } finally {
      setCheckingHealth(false);
    }
  };

  const handleUploadFiles = async (e) => {
    e.preventDefault();
    setUploading(true);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      if (uploadFormData.codeZip) formData.append("codeZip", uploadFormData.codeZip);
      if (uploadFormData.srsPdf) formData.append("srsPdf", uploadFormData.srsPdf);
      if (uploadFormData.designPdf) formData.append("designPdf", uploadFormData.designPdf);
      if (uploadFormData.manualPdf) formData.append("manualPdf", uploadFormData.manualPdf);
      if (uploadFormData.dependencyFile) formData.append("dependencyFile", uploadFormData.dependencyFile);

      await api.post(`/admin/projects/${uploadingProject._id}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadSuccess(true);
      showNotice("success", "Files uploaded successfully");
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadSuccess(false);
        setUploadFormData({
          codeZip: null,
          srsPdf: null,
          designPdf: null,
          manualPdf: null,
          dependencyFile: null,
        });
        loadProjects();
        loadStats();
        if (viewingProject?._id === uploadingProject._id) {
          loadProjectDetails(uploadingProject._id);
        }
      }, 1500);
    } catch (error) {
      showNotice("error", error.response?.data?.message || "Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/admin/projects/${deletingProjectId}`);
      setShowDeleteConfirm(false);
      setDeletingProjectId(null);
      await Promise.all([loadProjects(), loadStats()]);
      showNotice("success", "Project deleted successfully");
    } catch (error) {
      showNotice("error", error.response?.data?.message || "Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  };

  const openViewModal = async (project) => {
    setViewTab("overview");
    setViewingProject(normalizeProjectFromList(project));
    setShowViewModal(true);
    await loadProjectDetails(project._id, project);
  };

  // Open project detail directly from chat / deep link (?id= or ?project=)
  useEffect(() => {
    const projectId = searchParams.get("id") || searchParams.get("project");
    if (!projectId || loading) return;
    if (showViewModal && String(viewingProject?._id) === String(projectId)) return;

    let cancelled = false;
    (async () => {
      const match = projects.find((p) => String(p._id) === String(projectId));
      if (match) {
        if (!cancelled) {
          setViewTab("overview");
          setViewingProject(normalizeProjectFromList(match));
          setShowViewModal(true);
          await loadProjectDetails(match._id, match);
        }
        return;
      }
      try {
        const response = await api.get(`/projects/${projectId}`);
        const data = response.data.data || {};
        const project = data.project || data;
        if (!cancelled && project?._id) {
          setViewTab("overview");
          setViewingProject(normalizeProjectFromList(project));
          setShowViewModal(true);
          await loadProjectDetails(project._id, project);
        }
      } catch (err) {
        console.error("Failed to open project from URL:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, projects, loading]);

  const openUploadModal = (project) => {
    setUploadingProject(normalizeProjectFromList(project));
    setUploadFormData({
      codeZip: null,
      srsPdf: null,
      designPdf: null,
      manualPdf: null,
      dependencyFile: null,
    });
    setUploadSuccess(false);
    setShowUploadModal(true);
  };

  const openDeleteConfirm = (project) => {
    setDeletingProjectId(project._id);
    setDeletingProjectTitle(project.title || "Untitled Project");
    setShowDeleteConfirm(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProjects(), loadStats()]);
    setTimeout(() => setRefreshing(false), 500);
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setDepartmentFilter("");
    setYearFilter("");
    setHealthFilter("");
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

  const setQuickStatus = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: "bg-amber-100", text: "text-amber-700", icon: Clock, label: "Pending" },
      approved: { bg: "bg-green-100", text: "text-green-700", icon: CheckCircle, label: "Approved" },
      rejected: { bg: "bg-red-100", text: "text-red-700", icon: X, label: "Rejected" },
      revision: { bg: "bg-blue-100", text: "text-blue-700", icon: AlertCircle, label: "Revision" },
      graded: { bg: "bg-purple-100", text: "text-purple-700", icon: Award, label: "Graded" },
      archived: { bg: "bg-gray-100", text: "text-gray-600", icon: FolderKanban, label: "Archived" },
    };
    return badges[status] || { bg: "bg-gray-100", text: "text-gray-700", icon: FileText, label: status };
  };

  const getHealthInfo = (score) => {
    const value = score ?? null;
    if (value === null) return { label: "N/A", color: "bg-gray-200", text: "text-gray-500" };
    if (value >= 80) return { label: "Healthy", color: "bg-green-500", text: "text-green-700" };
    if (value >= 50) return { label: "Warning", color: "bg-amber-500", text: "text-amber-700" };
    return { label: "Critical", color: "bg-red-500", text: "text-red-700" };
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-50" />;
    return sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const SortableHeader = ({ field, children }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-emerald-700 uppercase cursor-pointer hover:bg-emerald-100"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {getSortIcon(field)}
      </div>
    </th>
  );

  const FileUploadBox = ({ id, label, required, accept, icon: Icon, hint, file }) => (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center hover:border-emerald-400 transition-colors">
        <input
          type="file"
          accept={accept}
          onChange={(e) =>
            setUploadFormData((prev) => ({ ...prev, [id]: e.target.files?.[0] || null }))
          }
          className="hidden"
          id={id}
          required={required}
        />
        <label htmlFor={id} className="cursor-pointer flex flex-col items-center gap-1">
          <Icon size={24} className="text-gray-400" />
          <span className="text-xs text-gray-600 truncate max-w-full px-2">
            {file ? file.name : `Select ${label.toLowerCase()}`}
          </span>
          {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
        </label>
      </div>
    </div>
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
        icon={FolderKanban}
        iconColor="text-emerald-500"
        title="Project Management"
        subtitle={
          <>
            Review submissions, upload files, and monitor code health
            {totalItems > 0 && <span className="ml-2 text-emerald-600">({totalItems} matching)</span>}
          </>
        }
      >
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} icon={FolderKanban} iconColor="emerald" cardClass="cute-card cute-card-green" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} iconColor="amber" cardClass="cute-card" onClick={() => setQuickStatus("pending")} />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle} iconColor="blue" cardClass="cute-card cute-card-blue" onClick={() => setQuickStatus("approved")} />
        <StatCard label="Graded" value={stats.graded} icon={Award} iconColor="purple" cardClass="cute-card cute-card-purple" onClick={() => setQuickStatus("graded")} />
      </div>

      {/* Quick status chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value || "all"}
            type="button"
            onClick={() => setQuickStatus(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              statusFilter === opt.value
                ? "bg-emerald-500 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:border-emerald-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100">
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
                onKeyPress={(e) => e.key === "Enter" && (setCurrentPage(1), loadProjects())}
                className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
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
              showFilters ? "bg-emerald-100 text-emerald-700" : "bg-gray-50 text-gray-600"
            }`}
          >
            <Filter size={14} /> More
          </button>
          <button
            onClick={() => {
              setCurrentPage(1);
              loadProjects();
            }}
            className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 flex items-center gap-2"
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
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Health</label>
              <select
                value={healthFilter}
                onChange={(e) => {
                  setHealthFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm min-w-[120px]"
              >
                <option value="">All</option>
                <option value="good">Healthy (80+)</option>
                <option value="warning">Warning (50–79)</option>
                <option value="critical">Critical (&lt;50)</option>
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
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-emerald-50">
              <tr>
                <SortableHeader field="title">Project</SortableHeader>
                <SortableHeader field="studentName">Student</SortableHeader>
                <SortableHeader field="department">Dept</SortableHeader>
                <SortableHeader field="status">Status</SortableHeader>
                <th className="px-4 py-3 text-left text-xs font-medium text-emerald-700 uppercase">Health</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-emerald-700 uppercase">Ver.</th>
                <SortableHeader field="submittedAt">Submitted</SortableHeader>
                <th className="px-4 py-3 text-left text-xs font-medium text-emerald-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-5 py-10 text-center">
                    <Loader2 size={32} className="text-emerald-500 animate-spin mx-auto mb-2" />
                    <span className="text-gray-400 text-sm">Loading projects...</span>
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-10 text-center">
                    <FolderKanban size={40} className="text-gray-300 mx-auto mb-2" />
                    <span className="text-gray-400 text-sm">No projects found</span>
                  </td>
                </tr>
              ) : (
                projects.map((project) => {
                  const status = getStatusBadge(project.status);
                  const health = getHealthInfo(project.codeHealthScore);
                  const StatusIcon = status.icon;
                  return (
                    <tr key={project._id} className="hover:bg-emerald-50/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-[160px]">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                            <FileText size={14} className="text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">{project.title}</p>
                            {project.grade != null && (
                              <p className="text-xs text-purple-600">Grade: {project.grade}%</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <User size={14} className="text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-600 truncate max-w-[100px]">
                            {getStudentName(project)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                          {displayValue(project.department, "N/A")}
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-[90px]">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${health.color}`}
                              style={{
                                width: `${
                                  project.codeHealthScore != null ? project.codeHealthScore : 0
                                }%`,
                              }}
                            />
                          </div>
                          <span className={`text-[10px] font-medium ${health.text}`}>
                            {project.codeHealthScore != null ? `${project.codeHealthScore}%` : "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        v{project.versionCount || project.currentVersion || 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(project.submittedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openViewModal(project)}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleDownloadProject(project)}
                            disabled={downloadingId === project._id}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 disabled:opacity-50"
                            title="Download"
                          >
                            {downloadingId === project._id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Download size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => openUploadModal(project)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
                            title="Upload"
                          >
                            <Upload size={16} />
                          </button>
                          <button
                            onClick={() => openDeleteConfirm(project)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
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
          <div className="px-5 py-3 border-t border-emerald-100 flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="text-sm text-gray-500">
              Showing {projects.length} of {totalItems} projects
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-emerald-50 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-500 min-w-[100px] text-center">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages <= 1}
                className="p-2 rounded-lg hover:bg-emerald-50 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal — tabbed */}
      {showViewModal && viewingProject && (
        <Modal
          title={displayValue(viewingProject.title, "Project Details")}
          icon={FolderKanban}
          size="xl"
          onClose={() => setShowViewModal(false)}
        >
          <div className="p-4">
            {loadingDetails ? (
              <div className="py-12 text-center">
                <Loader2 size={28} className="text-emerald-500 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading project details...</p>
              </div>
            ) : (
              <>
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-4">
              {[
                { id: "overview", label: "Overview" },
                { id: "files", label: "Files" },
                { id: "health", label: "Health & AI" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setViewTab(tab.id)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    viewTab === tab.id
                      ? "bg-white text-emerald-700 shadow-sm"
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
                    <p className="text-xs text-gray-400">Status</p>
                    <span
                      className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-xs rounded-full ${getStatusBadge(viewingProject.status).bg} ${getStatusBadge(viewingProject.status).text}`}
                    >
                      {getStatusBadge(viewingProject.status).label}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Submitted</p>
                    <p className="text-gray-700">{formatDate(viewingProject.submittedAt)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <GraduationCap size={12} /> Student
                  </p>
                  <p className="text-gray-800 font-medium">{getStudentName(viewingProject)}</p>
                  <p className="text-xs text-gray-500">{getStudentEmail(viewingProject)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <BookOpen size={12} /> Course
                  </p>
                  <p className="text-gray-700">{getCourseLabel(viewingProject)}</p>
                  {viewingProject.assignmentTitle && viewingProject.assignmentTitle !== "N/A" && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Assignment: {viewingProject.assignmentTitle}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-xs text-gray-400">Dept</p>
                    <p>{displayValue(viewingProject.department, "N/A")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Year</p>
                    <p>{viewingProject.year != null ? `Y${viewingProject.year}` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Section</p>
                    <p>{displayValue(viewingProject.section, "N/A")}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Description</p>
                  <p className="text-gray-600">{viewingProject.description || "No description"}</p>
                </div>
                {viewingProject.grade != null && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Star size={12} /> Grade
                    </p>
                    <p className="text-xl font-bold text-gray-800">{viewingProject.grade}%</p>
                    {viewingProject.teacherFeedback && (
                      <p className="text-xs text-gray-600 mt-2">{viewingProject.teacherFeedback}</p>
                    )}
                  </div>
                )}
                <div className="flex gap-2 pt-1 flex-wrap">
                  <button
                    onClick={() => handleDownloadProject(viewingProject)}
                    disabled={downloadingId === viewingProject._id}
                    className="flex-1 min-w-[100px] py-2 bg-sky-50 text-sky-700 rounded-xl text-xs font-medium hover:bg-sky-100 flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    {downloadingId === viewingProject._id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    Download
                  </button>
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      openUploadModal(viewingProject);
                    }}
                    className="flex-1 min-w-[100px] py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-medium hover:bg-emerald-100 flex items-center justify-center gap-1"
                  >
                    <Upload size={14} /> Upload
                  </button>
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      openDeleteConfirm(viewingProject);
                    }}
                    className="flex-1 min-w-[100px] py-2 bg-red-50 text-red-600 rounded-xl text-xs font-medium hover:bg-red-100 flex items-center justify-center gap-1"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            )}

            {viewTab === "files" && (
              <div className="space-y-3">
                {viewingVersions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">No files uploaded yet.</p>
                ) : (
                  [...viewingVersions]
                    .sort((a, b) => b.versionNumber - a.versionNumber)
                    .map((version) => (
                      <div
                        key={version._id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">Version {version.versionNumber}</p>
                            {version.isLatest && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                Latest
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            {formatDate(version.submittedAt)} ·{" "}
                            {((version.totalFileSize || 0) / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {version.codeZipUrl && (
                            <a
                              href={resolveFileUrl(version.codeZipUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg hover:bg-white text-gray-500"
                              title="Download ZIP"
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
                              title="SRS PDF"
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
                              <FileCode size={16} />
                            </a>
                          )}
                          {version.manualPdfUrl && (
                            <a
                              href={resolveFileUrl(version.manualPdfUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg hover:bg-white text-gray-500"
                              title="Manual PDF"
                            >
                              <FileJson size={16} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}

            {viewTab === "health" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-emerald-600" />
                    <span className="text-sm font-medium">
                      Health: {viewingHealthScore != null ? `${viewingHealthScore}%` : "Not analyzed"}
                    </span>
                  </div>
                  <button
                    onClick={checkProjectHealth}
                    disabled={checkingHealth}
                    className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                  >
                    {checkingHealth ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                    AI Check
                  </button>
                </div>

                {viewingHealthScore != null && (
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getHealthInfo(viewingHealthScore).color}`}
                      style={{ width: `${viewingHealthScore}%` }}
                    />
                  </div>
                )}

                {viewingDependencies.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {viewingDependencies.slice(0, 8).map((dep, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs"
                      >
                        <span className="font-medium">{dep.name}</span>
                        <span className="text-gray-400">v{dep.currentVersion || "?"}</span>
                      </div>
                    ))}
                    {viewingDependencies.length > 8 && (
                      <p className="text-xs text-gray-400 text-center">
                        +{viewingDependencies.length - 8} more
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No dependency data. Upload with package.json.</p>
                )}

                {checkingHealth ? (
                  <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-xl text-xs text-purple-700">
                    <Loader2 size={14} className="animate-spin" /> Analyzing...
                  </div>
                ) : viewingSuggestions.length > 0 ? (
                  <div className="space-y-2">
                    {viewingSuggestions.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-purple-100 bg-purple-50/50 text-xs"
                      >
                        <p className="text-gray-800">{s.message || s}</p>
                        {s.action && (
                          <code className="block mt-1 text-[10px] bg-gray-800 text-green-400 px-2 py-1 rounded">
                            {s.action}
                          </code>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-4">
                    Run AI Check for {FAME} dependency suggestions
                  </p>
                )}
              </div>
            )}
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Upload Modal */}
      {showUploadModal && uploadingProject && (
        <Modal
          title="Upload Files"
          icon={Upload}
          size="md"
          onClose={() => setShowUploadModal(false)}
        >
          {uploadSuccess ? (
            <div className="p-8 text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={28} className="text-green-500" />
              </div>
              <p className="font-medium text-gray-800">Upload successful!</p>
            </div>
          ) : (
            <form onSubmit={handleUploadFiles} className="p-4 space-y-3">
              <p className="text-xs text-gray-500 mb-2 truncate">
                Project:{" "}
                <span className="font-medium">
                  {displayValue(uploadingProject.title, "Untitled Project")}
                </span>
              </p>
              <p className="text-xs text-gray-400 mb-2">
                Student: {getStudentName(uploadingProject)} · {displayValue(uploadingProject.department, "N/A")}
              </p>
              <FileUploadBox
                id="codeZip"
                label="Code ZIP"
                required
                accept=".zip"
                icon={FileCode}
                hint="Max 50MB"
                file={uploadFormData.codeZip}
              />
              <FileUploadBox
                id="srsPdf"
                label="SRS PDF"
                required
                accept=".pdf"
                icon={FileText}
                file={uploadFormData.srsPdf}
              />
              <FileUploadBox
                id="designPdf"
                label="Design PDF"
                accept=".pdf"
                icon={FileText}
                file={uploadFormData.designPdf}
              />
              <FileUploadBox
                id="manualPdf"
                label="Manual PDF"
                accept=".pdf"
                icon={FileText}
                file={uploadFormData.manualPdf}
              />
              <FileUploadBox
                id="dependencyFile"
                label="Dependencies"
                accept=".json,.txt"
                icon={FileJson}
                hint="package.json / requirements.txt"
                file={uploadFormData.dependencyFile}
              />
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={uploading || !uploadFormData.codeZip || !uploadFormData.srsPdf}
                  className="flex-1 bg-emerald-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <Modal
          title="Delete Project"
          icon={Trash2}
          iconClass="text-red-500"
          size="sm"
          onClose={() => setShowDeleteConfirm(false)}
        >
          <div className="p-4 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <p className="text-gray-500 text-sm mb-4">
              Delete{" "}
              <span className="font-semibold text-gray-700">
                {displayValue(deletingProjectTitle, "this project")}
              </span>
              ? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting && <Loader2 size={16} className="animate-spin" />}
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-200"
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

export default ProjectsPage;
