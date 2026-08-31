import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  CheckCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  UserCog,
  Eye,
  Filter,
  AlertCircle,
  Building2,
  FileText,
  Calendar,
  FolderKanban,
} from "lucide-react";

const MODAL_SIZES = {
  sm: "max-w-[360px]",
  md: "max-w-[420px]",
  lg: "max-w-[560px]",
  xl: "max-w-[680px]",
};

const Modal = ({ onClose, title, icon: Icon, iconClass = "text-blue-500", size = "md", children }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6"
    onClick={onClose}
  >
    <div
      className={`${MODAL_SIZES[size]} w-full bg-white rounded-xl shadow-2xl border border-blue-100 overflow-hidden`}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50/80 to-white">
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
      <div className="max-h-[min(70vh,520px)] overflow-y-auto">{children}</div>
    </div>
  </div>
);

const currentYear = new Date().getFullYear();
const ACADEMIC_YEARS = [currentYear - 1, currentYear, currentYear + 1].map((y) => ({
  value: String(y),
  label: `${y}-${y + 1}`,
}));

const SEMESTER_OPTIONS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"].map(
  (s) => ({ value: s, label: `${s} Sem` })
);

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

const getAssignmentStatus = (assignment) => {
  const status = assignment.status || "published";
  const due = assignment.dueDate ? new Date(assignment.dueDate) : null;
  if (status === "closed") return { label: "Closed", className: "bg-gray-100 text-gray-600" };
  if (status === "draft") return { label: "Draft", className: "bg-slate-100 text-slate-600" };
  if (due && due < new Date()) return { label: "Past due", className: "bg-amber-100 text-amber-700" };
  return { label: "Open", className: "bg-green-100 text-green-700" };
};

const AssignmentList = ({ assignments, compact = false }) => {
  if (!assignments?.length) {
    return (
      <div className={`text-center ${compact ? "py-4" : "py-6"} bg-white rounded-xl border border-dashed border-gray-200`}>
        <FileText size={compact ? 24 : 32} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">No assignments for this course</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {assignments.map((assignment) => {
        const status = getAssignmentStatus(assignment);
        return (
          <div
            key={assignment._id}
            className="bg-white rounded-xl p-3 border border-gray-200 hover:border-blue-200 hover:shadow-sm transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-800">{assignment.title}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1">
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={12} />
                    Due {formatDate(assignment.dueDate)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full ${status.className}`}>{status.label}</span>
                  <span className="inline-flex items-center gap-1">
                    <FolderKanban size={12} />
                    {assignment.submissionCount ?? 0} submissions
                  </span>
                  {assignment.gradedCount != null && (
                    <span>{assignment.gradedCount} graded</span>
                  )}
                </div>
              </div>
              <Link
                to={`/projects?search=${encodeURIComponent(assignment.title || "")}`}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                <Eye size={13} /> View projects
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const CoursesPage = () => {
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [viewingCourse, setViewingCourse] = useState(null);
  const [deletingCourseId, setDeletingCourseId] = useState(null);
  const [deletingCourseName, setDeletingCourseName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sortField, setSortField] = useState("courseCode");
  const [sortOrder, setSortOrder] = useState("asc");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, departments: 0 });

  const [departmentFilter, setDepartmentFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [formData, setFormData] = useState({
    courseCode: "",
    courseName: "",
    description: "",
    department: "CS",
    year: 1,
    semester: "1st",
    section: "A",
    teacherId: "",
    academicYear: String(currentYear),
    isActive: true,
  });

  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [expandedCourseId, setExpandedCourseId] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    loadCourses();
  }, [currentPage, sortField, sortOrder, searchTerm, departmentFilter, yearFilter, semesterFilter, statusFilter]);

  useEffect(() => {
    loadTeachers();
    loadDepartments();
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
      const response = await api.get("/admin/courses", { params: { limit: 200, page: 1 } });
      const items = response.data.data || [];
      const depts = new Set(items.map((c) => c.department).filter(Boolean));
      setStats({
        total: response.data.pagination?.total ?? items.length,
        active: items.filter((c) => c.isActive !== false).length,
        departments: depts.size,
      });
    } catch (error) {
      console.error("Failed to load course stats:", error);
    }
  };

  const loadCourses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("limit", itemsPerPage);
      params.append("sort", sortField);
      params.append("order", sortOrder);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      if (departmentFilter) params.append("department", departmentFilter);
      if (yearFilter) params.append("year", yearFilter);
      if (semesterFilter) params.append("semester", semesterFilter);
      if (statusFilter) params.append("isActive", statusFilter === "active" ? "true" : "false");

      const response = await api.get(`/admin/courses?${params.toString()}`);
      const pagination = response.data.pagination || {};
      const total = pagination.total ?? 0;
      const courseList = response.data.data || [];

      const enriched = await Promise.all(
        courseList.map(async (course) => {
          try {
            const aRes = await api.get(`/assignments/course/${course._id}`);
            const assignments = aRes.data?.data || [];
            return { ...course, assignments, assignmentsCount: assignments.length };
          } catch {
            return { ...course, assignments: [], assignmentsCount: 0 };
          }
        })
      );

      setCourses(enriched);
      setExpandedCourseId(null);
      setTotalItems(total);
      setTotalPages((pagination.pages ?? Math.ceil(total / itemsPerPage)) || 1);
    } catch (error) {
      console.error("Failed to load courses:", error);
      showNotice("error", "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const loadTeachers = async () => {
    try {
      const response = await api.get("/admin/users", { params: { role: "teacher", limit: 100 } });
      setTeachers(response.data.data || []);
    } catch (error) {
      console.error("Failed to load teachers:", error);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await api.get("/departments", { params: { limit: 50 } });
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error("Failed to load departments:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadCourses(), loadStats()]);
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadCourses();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setDepartmentFilter("");
    setYearFilter("");
    setSemesterFilter("");
    setStatusFilter("");
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

  const getTeacherName = (teacherId) => {
    if (!teacherId) return "Not assigned";
    if (typeof teacherId === "object" && teacherId.name) return teacherId.name;
    const teacher = teachers.find((t) => t._id === teacherId);
    return teacher ? teacher.name : "Unknown";
  };

  const getTeachersForDept = () => {
    if (!formData.department) return teachers;
    return teachers.filter((t) => t.department === formData.department);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.courseCode.trim()) errors.courseCode = "Course code is required";
    if (!formData.courseName.trim()) errors.courseName = "Course name is required";
    if (!formData.teacherId) errors.teacherId = "Teacher is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const dataToSend = {
        courseCode: formData.courseCode.toUpperCase(),
        courseName: formData.courseName,
        description: formData.description,
        department: formData.department,
        year: parseInt(formData.year, 10),
        semester: formData.semester,
        section: formData.section,
        credits: 3,
        teacherId: formData.teacherId,
        academicYear: formData.academicYear,
        isActive: formData.isActive,
      };

      if (editingCourse) {
        await api.put(`/admin/courses/${editingCourse._id}`, dataToSend);
        showNotice("success", "Course updated successfully");
      } else {
        await api.post("/admin/courses", dataToSend);
        showNotice("success", "Course created successfully");
      }

      setShowModal(false);
      resetForm();
      await Promise.all([loadCourses(), loadStats()]);
    } catch (error) {
      showNotice("error", error.response?.data?.message || "Failed to save course");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/admin/courses/${deletingCourseId}`);
      setShowDeleteConfirm(false);
      setDeletingCourseId(null);
      await Promise.all([loadCourses(), loadStats()]);
      showNotice("success", "Course deleted successfully");
    } catch (error) {
      showNotice("error", error.response?.data?.message || "Failed to delete course");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleAssignments = (courseId) => {
    setExpandedCourseId((prev) => (prev === courseId ? null : courseId));
  };

  const openViewModal = (course) => {
    setViewingCourse(course);
    setShowViewModal(true);
  };

  // Open course detail from chat / deep link (?id=)
  useEffect(() => {
    const courseId = searchParams.get("id");
    if (!courseId || loading) return;
    if (showViewModal && String(viewingCourse?._id) === String(courseId)) return;

    let cancelled = false;
    (async () => {
      const match = courses.find((c) => String(c._id) === String(courseId));
      if (match) {
        if (!cancelled) {
          setViewingCourse(match);
          setShowViewModal(true);
        }
        return;
      }
      try {
        const response = await api.get(`/admin/courses/${courseId}`);
        const course = response.data.data;
        if (!cancelled && course?._id) {
          setViewingCourse(course);
          setShowViewModal(true);
        }
      } catch (err) {
        console.error("Failed to open course from URL:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, courses, loading]);

  const openEditModal = (course) => {
    setEditingCourse(course);
    setFormData({
      courseCode: course.courseCode,
      courseName: course.courseName,
      description: course.description || "",
      department: course.department,
      year: course.year,
      semester: course.semester,
      section: course.section,
      teacherId: course.teacherId?._id || course.teacherId || "",
      academicYear: course.academicYear || String(currentYear),
      isActive: course.isActive !== false,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openDeleteConfirm = (course) => {
    setDeletingCourseId(course._id);
    setDeletingCourseName(`${course.courseCode} - ${course.courseName}`);
    setShowDeleteConfirm(true);
  };

  const resetForm = () => {
    setFormData({
      courseCode: "",
      courseName: "",
      description: "",
      department: "CS",
      year: 1,
      semester: "1st",
      section: "A",
      teacherId: "",
      academicYear: String(currentYear),
      isActive: true,
    });
    setFormErrors({});
    setEditingCourse(null);
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-50" />;
    return sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const SortableHeader = ({ field, children }) => (
    <th
      className="px-5 py-3 text-left text-xs font-medium text-blue-600 uppercase cursor-pointer hover:bg-blue-100 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {getSortIcon(field)}
      </div>
    </th>
  );

  const deptOptions =
    departments.length > 0
      ? departments.map((d) => ({ value: d.name, label: `${d.name} - ${d.fullName}` }))
      : [
          { value: "CS", label: "CS" },
          { value: "IT", label: "IT" },
          { value: "CT", label: "CT" },
          { value: "EC", label: "EC" },
        ];

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
        icon={BookOpen}
        iconColor="text-blue-500"
        title="Course Management"
        subtitle={
          <>
            Manage academic courses, teacher assignments, and course assignment lists
            {totalItems > 0 && <span className="ml-2 text-blue-500">({totalItems} matching)</span>}
          </>
        }
      >
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl text-sm font-medium hover:from-blue-600 hover:to-cyan-600 flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus size={16} /> Add Course
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Courses" value={stats.total} icon={BookOpen} iconColor="blue" cardClass="cute-card cute-card-blue" />
        <StatCard label="Active" value={stats.active} icon={CheckCircle} iconColor="green" cardClass="cute-card cute-card-green" />
        <StatCard label="Departments" value={stats.departments} icon={Building2} iconColor="purple" cardClass="cute-card cute-card-purple" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-500 mb-1 block">Search courses</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by code or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${
              showFilters ? "bg-blue-100 text-blue-700" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Filter size={14} /> Filters
          </button>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 flex items-center gap-2"
          >
            <Search size={14} /> Search
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-100 flex items-center gap-2"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
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
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[140px]"
              >
                <option value="">All Departments</option>
                {deptOptions.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
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
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm min-w-[110px]"
              >
                <option value="">All Years</option>
                {[1, 2, 3, 4, 5].map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Semester</label>
              <select
                value={semesterFilter}
                onChange={(e) => {
                  setSemesterFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm min-w-[110px]"
              >
                <option value="">All Semesters</option>
                {SEMESTER_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm min-w-[110px]"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 flex items-center gap-2"
            >
              <X size={14} /> Clear All
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-50">
              <tr>
                <SortableHeader field="courseCode">Code</SortableHeader>
                <SortableHeader field="courseName">Course</SortableHeader>
                <SortableHeader field="department">Dept</SortableHeader>
                <th className="px-5 py-3 text-left text-xs font-medium text-blue-600 uppercase">
                  Class
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-blue-600 uppercase">
                  Teacher
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-blue-600 uppercase">
                  Assignments
                </th>
                <SortableHeader field="isActive">Status</SortableHeader>
                <th className="px-5 py-3 text-left text-xs font-medium text-blue-600 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-5 py-10 text-center">
                    <Loader2 size={32} className="text-blue-500 animate-spin mx-auto mb-2" />
                    <span className="text-gray-400 text-sm">Loading courses...</span>
                  </td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-10 text-center">
                    <BookOpen size={40} className="text-gray-300 mx-auto mb-2" />
                    <span className="text-gray-400 text-sm">No courses found</span>
                    {(searchTerm || departmentFilter || yearFilter || semesterFilter || statusFilter) && (
                      <button
                        onClick={clearAllFilters}
                        className="block mx-auto mt-2 text-blue-500 text-sm hover:underline"
                      >
                        Clear all filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                courses.map((course) => (
                  <React.Fragment key={course._id}>
                    <tr className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                            <BookOpen size={14} className="text-blue-600" />
                          </div>
                          <span className="font-bold text-gray-800">{course.courseCode}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-700">{course.courseName}</p>
                        {course.description && (
                          <p className="text-xs text-gray-400 truncate max-w-[160px]">
                            {course.description}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                          {course.department}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">
                        Y{course.year} · {course.semester} · Sec {course.section}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <UserCog size={14} className="text-blue-400 shrink-0" />
                          <span className="text-sm text-gray-600 truncate max-w-[120px]">
                            {getTeacherName(course.teacherId)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => toggleAssignments(course._id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                          title="Show assignments"
                        >
                          <FileText size={14} />
                          <span className="font-medium">{course.assignmentsCount ?? 0}</span>
                          {expandedCourseId === course._id ? (
                            <ChevronUp size={14} className="text-blue-400" />
                          ) : (
                            <ChevronDown size={14} className="text-blue-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            course.isActive !== false
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {course.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openViewModal(course)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => openEditModal(course)}
                            className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-600"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => openDeleteConfirm(course)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedCourseId === course._id && (
                      <tr className="bg-slate-50/80">
                        <td colSpan="8" className="px-5 py-4">
                          <div className="flex items-center gap-2 mb-3">
                            <FileText size={16} className="text-blue-500" />
                            <p className="text-sm font-semibold text-gray-700">
                              Assignments for {course.courseCode}
                            </p>
                            <span className="text-xs text-gray-400">
                              ({course.assignmentsCount ?? 0} total)
                            </span>
                          </div>
                          <AssignmentList assignments={course.assignments} compact />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {(totalPages > 1 || totalItems > 0) && (
          <div className="px-5 py-3 border-t border-blue-100 flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="text-sm text-gray-500">
              Showing {courses.length} of {totalItems} courses
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-blue-50 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-500 min-w-[120px] text-center">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages <= 1}
                className="p-2 rounded-lg hover:bg-blue-50 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {showViewModal && viewingCourse && (
        <Modal
          title="Course Details"
          icon={BookOpen}
          size="xl"
          onClose={() => setShowViewModal(false)}
        >
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <BookOpen size={22} className="text-blue-600" />
              </div>
              <div>
                <p className="font-bold text-gray-800">{viewingCourse.courseCode}</p>
                <p className="text-sm text-gray-600">{viewingCourse.courseName}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Department</p>
                <p className="text-gray-700">{viewingCourse.department}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Academic Year</p>
                <p className="text-gray-700">{viewingCourse.academicYear || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Year / Semester</p>
                <p className="text-gray-700">
                  Year {viewingCourse.year} · {viewingCourse.semester}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Section</p>
                <p className="text-gray-700">Section {viewingCourse.section}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Academic Year</p>
                <p className="text-gray-700">{viewingCourse.academicYear}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    viewingCourse.isActive !== false
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {viewingCourse.isActive !== false ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400">Teacher</p>
              <p className="text-gray-700 text-sm">{getTeacherName(viewingCourse.teacherId)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Description</p>
              <p className="text-gray-600 text-sm">{viewingCourse.description || "No description"}</p>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FileText size={16} className="text-blue-500" />
                  Assignments ({viewingCourse.assignmentsCount ?? viewingCourse.assignments?.length ?? 0})
                </p>
              </div>
              <AssignmentList assignments={viewingCourse.assignments} />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  openEditModal(viewingCourse);
                }}
                className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 flex items-center justify-center gap-1"
              >
                <Edit size={14} /> Edit
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  openDeleteConfirm(viewingCourse);
                }}
                className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 flex items-center justify-center gap-1"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal
          title={editingCourse ? "Edit Course" : "Add Course"}
          icon={editingCourse ? Edit : Plus}
          size="lg"
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Course Code *</label>
              <input
                type="text"
                placeholder="e.g. CS301"
                value={formData.courseCode}
                onChange={(e) => setFormData({ ...formData, courseCode: e.target.value })}
                disabled={!!editingCourse}
                className={`w-full px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                  formErrors.courseCode ? "border-red-400 bg-red-50" : "border-gray-200"
                } ${editingCourse ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
              {formErrors.courseCode && (
                <p className="text-xs text-red-500 mt-1">{formErrors.courseCode}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Course Name *</label>
              <input
                type="text"
                placeholder="e.g. Web Development"
                value={formData.courseName}
                onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                className={`w-full px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                  formErrors.courseName ? "border-red-400 bg-red-50" : "border-gray-200"
                }`}
              />
              {formErrors.courseName && (
                <p className="text-xs text-red-500 mt-1">{formErrors.courseName}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Department</label>
              <select
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value, teacherId: "" })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {deptOptions.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Year</label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value, 10) })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm"
                >
                  {[1, 2, 3, 4, 5].map((y) => (
                    <option key={y} value={y}>
                      Year {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Semester</label>
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm"
                >
                  {SEMESTER_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Section</label>
              <select
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm"
              >
                {["A", "B", "C", "D"].map((s) => (
                  <option key={s} value={s}>
                    Section {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Academic Year</label>
              <select
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm"
              >
                {ACADEMIC_YEARS.map((y) => (
                  <option key={y.value} value={y.value}>
                    {y.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Teacher *</label>
              <select
                value={formData.teacherId}
                onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                className={`w-full px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                  formErrors.teacherId ? "border-red-400 bg-red-50" : "border-gray-200"
                }`}
              >
                <option value="">Select teacher</option>
                {getTeachersForDept().map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
              {formErrors.teacherId && (
                <p className="text-xs text-red-500 mt-1">{formErrors.teacherId}</p>
              )}
              {formData.department && getTeachersForDept().length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No teachers in {formData.department} department
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.isActive === true}
                    onChange={() => setFormData({ ...formData, isActive: true })}
                    className="text-blue-500"
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.isActive === false}
                    onChange={() => setFormData({ ...formData, isActive: false })}
                    className="text-blue-500"
                  />
                  Inactive
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2 rounded-xl text-sm font-medium hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                {editingCourse ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-sm font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <Modal
          title="Delete Course"
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
              Delete <span className="font-semibold text-gray-700">{deletingCourseName}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting && <Loader2 size={16} className="animate-spin" />}
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-sm font-medium hover:bg-gray-200"
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

export default CoursesPage;
