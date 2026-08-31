import React, { useEffect, useState } from "react";
import api from "../services/api";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

import {
  Building2,
  Plus,
  Edit,
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
  UserCog,
  Eye,
  AlertCircle,
  Filter,
  GraduationCap,
  Users,
  Briefcase,  
  FolderKanban,
  BookOpen,
} from "lucide-react";

const MODAL_SIZES = {
  sm: "max-w-[360px]",
  md: "max-w-[420px]",
  lg: "max-w-[480px]",
};

const Modal = ({ onClose, title, icon: Icon, iconClass = "text-purple-500", size = "md", children }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6"
    onClick={onClose}
  >
    <div
      className={`${MODAL_SIZES[size]} w-full bg-white rounded-xl shadow-2xl border border-purple-100 overflow-hidden`}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-purple-50/80 to-white">
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

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [viewingDept, setViewingDept] = useState(null);
  const [viewInsights, setViewInsights] = useState({
    loading: false,
    error: "",
    teachers: [],
    students: [],
    courses: [],
    assignments: [],
    projects: [],
  });
  const [deletingDeptId, setDeletingDeptId] = useState(null);
  const [deletingDeptName, setDeletingDeptName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    students: 0,
    teachers: 0,
  });

  const [statusFilter, setStatusFilter] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    fullName: "",
    description: "",
    headOfDepartment: "",
    isActive: true,
  });

  const [teachers, setTeachers] = useState([]);
  const itemsPerPage = 10;

  useEffect(() => {
    loadDepartments();
  }, [currentPage, sortField, sortOrder, searchTerm, statusFilter]);

  useEffect(() => {
    loadTeachers();
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
      const response = await api.get("/departments", { params: { limit: 50, page: 1 } });
      const items = response.data.data || [];
      setStats({
        total: response.data.pagination?.total ?? items.length,
        active: items.filter((d) => d.isActive !== false).length,
        students: items.reduce((sum, d) => sum + (d.studentCount || 0), 0),
        teachers: items.reduce((sum, d) => sum + (d.teacherCount || 0), 0),
      });
    } catch (error) {
      console.error("Failed to load department stats:", error);
    }
  };

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("limit", itemsPerPage);
      params.append("sort", sortField);
      params.append("order", sortOrder);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());
      if (statusFilter) params.append("isActive", statusFilter === "active" ? "true" : "false");

      const response = await api.get(`/departments?${params.toString()}`);
      const pagination = response.data.pagination || {};
      const total = pagination.total ?? 0;

      setDepartments(response.data.data || []);
      setTotalItems(total);
      setTotalPages((pagination.pages ?? Math.ceil(total / itemsPerPage)) || 1);
    } catch (error) {
      console.error("Failed to load departments:", error);
      showNotice("error", "Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  const loadTeachers = async () => {
    try {
      const response = await api.get("/admin/users", {
        params: { role: "teacher", limit: 100 },
      });
      setTeachers(response.data.data || []);
    } catch (error) {
      console.error("Failed to load teachers:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDepartments(), loadStats()]);
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadDepartments();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const clearAllFilters = () => {
    setSearchTerm("");
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

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Department code is required";
    else if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,19}$/.test(formData.name.trim())) {
      errors.name = "Code must be 2–20 letters, numbers, hyphen, underscore, or dot";
    }
    if (!formData.fullName.trim()) errors.fullName = "Department name is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const dataToSend = {
        name: formData.name.trim().toUpperCase(),
        fullName: formData.fullName,
        description: formData.description,
        headOfDepartment: formData.headOfDepartment || null,
        isActive: formData.isActive,
      };

      if (editingDept) {
        await api.put(`/departments/${editingDept._id}`, dataToSend);
        showNotice("success", "Department updated successfully");
      } else {
        await api.post("/departments", dataToSend);
        showNotice("success", "Department created successfully");
      }

      setShowModal(false);
      resetForm();
      await Promise.all([loadDepartments(), loadStats()]);
    } catch (error) {
      showNotice("error", error.response?.data?.message || "Failed to save department");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/departments/${deletingDeptId}`);
      setShowDeleteConfirm(false);
      setDeletingDeptId(null);
      await Promise.all([loadDepartments(), loadStats()]);
      showNotice("success", "Department deleted successfully");
    } catch (error) {
      showNotice("error", error.response?.data?.message || "Failed to delete department");
    } finally {
      setIsDeleting(false);
    }
  };

  const loadDepartmentInsights = async (dept) => {
    setViewInsights((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const [teachersRes, studentsRes, coursesRes, projectsRes] = await Promise.all([
        api.get("/admin/users", { params: { role: "teacher", department: dept.name, limit: 200, page: 1 } }),
        api.get("/admin/users", { params: { role: "student", department: dept.name, limit: 400, page: 1 } }),
        api.get("/admin/courses", { params: { department: dept.name, limit: 200, page: 1 } }),
        api.get("/admin/submissions", { params: { department: dept.name, limit: 500, page: 1 } }),
      ]);

      const teachers = teachersRes.data?.data || [];
      const students = studentsRes.data?.data || [];
      const courses = coursesRes.data?.data || [];
      const projects = projectsRes.data?.data || [];

      const assignmentLists = await Promise.all(
        courses.map(async (course) => {
          try {
            const res = await api.get(`/assignments/course/${course._id}`);
            const assignments = res.data?.data || [];
            return assignments.map((a) => ({
              ...a,
              courseName: course.courseName,
              courseCode: course.courseCode,
            }));
          } catch (error) {
            return [];
          }
        })
      );

      setViewInsights({
        loading: false,
        error: "",
        teachers,
        students,
        courses,
        assignments: assignmentLists.flat(),
        projects,
      });
    } catch (error) {
      setViewInsights({
        loading: false,
        error: "Failed to load department insights",
        teachers: [],
        students: [],
        courses: [],
        assignments: [],
        projects: [],
      });
    }
  };

  const openViewModal = (dept) => {
    setViewingDept(dept);
    setShowViewModal(true);
    loadDepartmentInsights(dept);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      fullName: dept.fullName || "",
      description: dept.description || "",
      headOfDepartment: dept.headOfDepartment?._id || dept.headOfDepartment || "",
      isActive: dept.isActive !== false,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openDeleteConfirm = (dept) => {
    setDeletingDeptId(dept._id);
    setDeletingDeptName(dept.fullName || dept.name);
    setShowDeleteConfirm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      fullName: "",
      description: "",
      headOfDepartment: "",
      isActive: true,
    });
    setFormErrors({});
    setEditingDept(null);
  };

  const getHeadName = (headOfDepartment) => {
    if (!headOfDepartment) return "Not assigned";
    if (typeof headOfDepartment === "object" && headOfDepartment.name) {
      return headOfDepartment.name;
    }
    const teacher = teachers.find((t) => t._id === headOfDepartment);
    return teacher ? teacher.name : "Unknown";
  };

  const getTeachersForDept = () => {
    if (!formData.name) return teachers;
    return teachers.filter((t) => t.department === formData.name);
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-50" />;
    return sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const SortableHeader = ({ field, children }) => (
    <th
      className="px-5 py-3 text-left text-xs font-medium text-purple-600 uppercase cursor-pointer hover:bg-purple-100 transition-colors"
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
        icon={Building2}
        iconColor="text-purple-500"
        title="Department Management"
        subtitle={
          <>
            Manage academic departments
            {totalItems > 0 && <span className="ml-2 text-purple-500">({totalItems} matching)</span>}
          </>
        }
      >
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl text-sm font-medium hover:from-purple-600 hover:to-indigo-600 flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus size={16} /> Add Department
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Departments" value={stats.total} icon={Building2} iconColor="purple" cardClass="cute-card cute-card-purple" />
        <StatCard label="Active" value={stats.active} icon={CheckCircle} iconColor="green" cardClass="cute-card cute-card-green" />
        <StatCard label="Students" value={stats.students} icon={GraduationCap} iconColor="blue" cardClass="cute-card cute-card-blue" />
        <StatCard label="Teachers" value={stats.teachers} icon={Briefcase} iconColor="indigo" cardClass="cute-card" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-purple-100">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-500 mb-1 block">Search departments</label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
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
              showFilters ? "bg-purple-100 text-purple-700" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Filter size={14} /> Filters
          </button>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 flex items-center gap-2"
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
              <label className="text-xs text-gray-500 mb-1 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 min-w-[130px]"
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
      <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-purple-50">
              <tr>
                <SortableHeader field="name">Code</SortableHeader>
                <SortableHeader field="fullName">Department</SortableHeader>
                <th className="px-5 py-3 text-left text-xs font-medium text-purple-600 uppercase">
                  Head
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-purple-600 uppercase">
                  Students
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-purple-600 uppercase">
                  Teachers
                </th>
                <SortableHeader field="isActive">Status</SortableHeader>
                <th className="px-5 py-3 text-left text-xs font-medium text-purple-600 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center">
                    <Loader2 size={32} className="text-purple-500 animate-spin mx-auto mb-2" />
                    <span className="text-gray-400 text-sm">Loading departments...</span>
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center">
                    <Building2 size={40} className="text-gray-300 mx-auto mb-2" />
                    <span className="text-gray-400 text-sm">No departments found</span>
                    {(searchTerm || statusFilter) && (
                      <button
                        onClick={clearAllFilters}
                        className="block mx-auto mt-2 text-purple-500 text-sm hover:underline"
                      >
                        Clear all filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept._id} className="hover:bg-purple-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                          <Building2 size={14} className="text-purple-600" />
                        </div>
                        <span className="font-bold text-gray-800">{dept.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-gray-700">{dept.fullName}</span>
                      {dept.description && (
                        <p className="text-xs text-gray-400 truncate max-w-[180px]">
                          {dept.description}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <UserCog size={14} className="text-purple-400 shrink-0" />
                        <span className="text-sm text-gray-600">
                          {getHeadName(dept.headOfDepartment)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">
                        {dept.studentCount ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-700">
                        {dept.teacherCount ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          dept.isActive !== false
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {dept.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openViewModal(dept)}
                          className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(dept)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(dept)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {(totalPages > 1 || totalItems > 0) && (
          <div className="px-5 py-3 border-t border-purple-100 flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="text-sm text-gray-500">
              Showing {departments.length} of {totalItems} departments
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-purple-50 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-500 min-w-[120px] text-center">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages <= 1}
                className="p-2 rounded-lg hover:bg-purple-50 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {showViewModal && viewingDept && (
        <Modal
          title="Department Details"
          icon={Building2}
          size="md"
          onClose={() => setShowViewModal(false)}
        >
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Building2 size={22} className="text-purple-600" />
              </div>
              <div>
                <p className="font-bold text-gray-800">{viewingDept.name}</p>
                <p className="text-sm text-gray-600">{viewingDept.fullName}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    viewingDept.isActive !== false
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {viewingDept.isActive !== false ? "Active" : "Inactive"}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-400">Students</p>
                <p className="text-gray-700">{viewingDept.studentCount ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Teachers</p>
                <p className="text-gray-700">{viewingDept.teacherCount ?? 0}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400">Head of Department</p>
              <p className="text-gray-700 text-sm">{getHeadName(viewingDept.headOfDepartment)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Description</p>
              <p className="text-gray-600 text-sm">{viewingDept.description || "No description"}</p>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-sm font-semibold text-gray-700 mb-2">Academic Insights</p>
              {viewInsights.loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 size={14} className="animate-spin" />
                  Loading related courses, assignments, students and projects...
                </div>
              ) : viewInsights.error ? (
                <p className="text-sm text-red-500">{viewInsights.error}</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div className="rounded-lg bg-indigo-50 px-2 py-1.5">
                      <p className="text-xs text-gray-500">Courses</p>
                      <p className="font-semibold text-gray-700">{viewInsights.courses.length}</p>
                    </div>
                    <div className="rounded-lg bg-violet-50 px-2 py-1.5">
                      <p className="text-xs text-gray-500">Assignments</p>
                      <p className="font-semibold text-gray-700">{viewInsights.assignments.length}</p>
                    </div>
                    <div className="rounded-lg bg-sky-50 px-2 py-1.5">
                      <p className="text-xs text-gray-500">Students</p>
                      <p className="font-semibold text-gray-700">{viewInsights.students.length}</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 px-2 py-1.5">
                      <p className="text-xs text-gray-500">Projects</p>
                      <p className="font-semibold text-gray-700">{viewInsights.projects.length}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                        <BookOpen size={12} /> Top Courses
                      </p>
                      {viewInsights.courses.length === 0 ? (
                        <p className="text-xs text-gray-500">No courses yet</p>
                      ) : (
                        <div className="space-y-1">
                          {viewInsights.courses.slice(0, 3).map((course) => (
                            <p key={course._id} className="text-xs text-gray-700">
                              {course.courseCode} - {course.courseName}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                        <FolderKanban size={12} /> Recent Projects
                      </p>
                      {viewInsights.projects.length === 0 ? (
                        <p className="text-xs text-gray-500">No projects submitted yet</p>
                      ) : (
                        <div className="space-y-1">
                          {viewInsights.projects.slice(0, 3).map((project) => (
                            <p key={project._id} className="text-xs text-gray-700">
                              {project.title} ({project.status || "pending"})
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  openEditModal(viewingDept);
                }}
                className="flex-1 px-3 py-2 bg-purple-50 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-100 flex items-center justify-center gap-1"
              >
                <Edit size={14} /> Edit
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  openDeleteConfirm(viewingDept);
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
          title={editingDept ? "Edit Department" : "Add Department"}
          icon={editingDept ? Edit : Plus}
          size="md"
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Department Code *
              </label>
              <input
                type="text"
                placeholder="e.g. CS"
                value={formData.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10),
                  })
                }
                disabled={!!editingDept}
                maxLength={10}
                className={`w-full px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 ${
                  formErrors.name ? "border-red-400 bg-red-50" : "border-gray-200"
                } ${editingDept ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
              {formErrors.name && (
                <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Department Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Computer Science"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className={`w-full px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 ${
                  formErrors.fullName ? "border-red-400 bg-red-50" : "border-gray-200"
                }`}
              />
              {formErrors.fullName && (
                <p className="text-xs text-red-500 mt-1">{formErrors.fullName}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
              <textarea
                rows={2}
                placeholder="Brief description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Head of Department
              </label>
              <select
                value={formData.headOfDepartment}
                onChange={(e) => setFormData({ ...formData, headOfDepartment: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
              >
                <option value="">Not assigned</option>
                {getTeachersForDept().map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
              {formData.name && getTeachersForDept().length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No teachers in {formData.name} department yet
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    checked={formData.isActive === true}
                    onChange={() => setFormData({ ...formData, isActive: true })}
                    className="text-purple-500"
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    checked={formData.isActive === false}
                    onChange={() => setFormData({ ...formData, isActive: false })}
                    className="text-purple-500"
                  />
                  Inactive
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-2 rounded-xl text-sm font-medium hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                {editingDept ? "Update" : "Create"}
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
          title="Delete Department"
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
              Delete <span className="font-semibold text-gray-700">{deletingDeptName}</span>? This
              cannot be undone.
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

export default DepartmentsPage;
