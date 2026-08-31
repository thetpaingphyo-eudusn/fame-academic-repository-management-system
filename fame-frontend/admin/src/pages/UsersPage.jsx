import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import IconGlass from "../components/IconGlass";
import PageHeader from "../components/PageHeader";

import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Key,
  Search,
  X,
  CheckCircle,
  GraduationCap,
  Briefcase,
  Shield,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Mail,
  User,
  Hash,
  Calendar,
  Eye,
  Filter,
  AlertCircle,
  Lock,
  FolderKanban,
  BookOpen,
} from "lucide-react";

const DEPARTMENTS_FALLBACK = [
  { value: "CS", label: "CS - Computer Science" },
  { value: "IT", label: "IT - Information Technology" },
  { value: "CT", label: "CT - Computer Technology" },
  { value: "EC", label: "EC - Electronic Commerce" },
];

const SEMESTER_OPTIONS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"].map(
  (s) => ({ value: s, label: `${s} Sem` })
);

const TEACHER_POSITION_OPTIONS = [
  "Professor",
  "Associate Professor",
  "Lecturer",
  "Assistant Lecturer",
  "Instructor",
  "Tutor",
];

const MODAL_SIZES = {
  sm: "max-w-[360px]",
  md: "max-w-[420px]",
  lg: "max-w-[480px]",
};

const Modal = ({ onClose, title, icon: Icon, iconClass = "text-pink-500", size = "md", children }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6"
    onClick={onClose}
  >
    <div
      className={`${MODAL_SIZES[size]} w-full bg-white rounded-xl shadow-2xl border border-pink-100 overflow-hidden`}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-pink-50/80 to-white">
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

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const UsersPage = ({ forcedRole = "" }) => {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [userType, setUserType] = useState(forcedRole || "student");
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [deletingUserName, setDeletingUserName] = useState("");
  const [filters, setFilters] = useState({ role: forcedRole || "", department: "", status: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [formErrors, setFormErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [notification, setNotification] = useState(null);
  const [viewInsights, setViewInsights] = useState({
    loading: false,
    error: "",
    courses: [],
    assignments: [],
    projects: [],
    students: [],
  });
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalAdmins: 0,
  });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    studentId: "",
    teacherId: "",
    department: "CS",
    semester: "1st",
    year: 1,
    section: "A",
    position: "",
    password: "",
    isActive: true,
  });

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [departments, setDepartments] = useState([]);

  const itemsPerPage = 10;

  useEffect(() => {
    const q = searchParams.get("search");
    const role = searchParams.get("role");
    if (q) setSearchTerm(q);
    if (!forcedRole && (role === "student" || role === "teacher")) {
      setUserType(role);
      setFilters((prev) => ({ ...prev, role }));
    }
  }, [searchParams, forcedRole]);

  useEffect(() => {
    if (!forcedRole) return;
    setUserType(forcedRole);
    setFilters((prev) => ({ ...prev, role: forcedRole }));
  }, [forcedRole]);

  useEffect(() => {
    loadUsers();
  }, [filters, currentPage, sortField, sortOrder, searchTerm]);

  useEffect(() => {
    loadStats();
    loadDepartments();
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
      const roleCounts = (data.userStats || []).reduce((acc, item) => {
        acc[item._id] = item.total;
        return acc;
      }, {});

      setStats({
        totalStudents: data.totalStudents || roleCounts.student || 0,
        totalTeachers: data.totalTeachers || roleCounts.teacher || 0,
        totalAdmins: roleCounts.admin || 0,
      });
    } catch (error) {
      console.error("Failed to load user stats:", error);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await api.get("/departments", { params: { limit: 100, page: 1 } });
      const items = response.data.data || [];
      if (items.length) {
        setDepartments(
          items.map((d) => ({
            value: d.name,
            label: d.fullName ? `${d.name} - ${d.fullName}` : d.name,
          }))
        );
      }
    } catch {
      setDepartments([]);
    }
  };

  const departmentOptions =
    departments.length > 0 ? departments : DEPARTMENTS_FALLBACK;

  const isStudentForm =
    userType === "student" || (editingUser && editingUser.role === "student");

  const isTeacherForm =
    userType === "teacher" || (editingUser && editingUser.role === "teacher");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.role) params.append("role", filters.role);
      if (filters.department) params.append("department", filters.department);
      if (filters.status) params.append("isActive", filters.status === "active" ? "true" : "false");
      params.append("page", currentPage);
      params.append("limit", itemsPerPage);
      params.append("sort", sortField);
      params.append("order", sortOrder);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());

      const response = await api.get(`/admin/users?${params.toString()}`);
      const pagination = response.data.pagination || {};

      setUsers(response.data.data || []);
      setTotalItems(pagination.total ?? response.data.total ?? 0);
      const total = pagination.total ?? response.data.total ?? 0;
      setTotalPages((pagination.pages ?? Math.ceil(total / itemsPerPage)) || 1);
    } catch (error) {
      console.error("Failed to load users:", error);
      showNotice("error", "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUsers(), loadStats()]);
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadUsers();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setFilters({ role: forcedRole || "", department: "", status: "" });
    setSearchTerm("");
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
    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(formData.email)) {
      errors.email = "Please enter a valid email";
    }
    if (!editingUser && userType === "student" && !formData.studentId.trim()) {
      errors.studentId = "Student ID is required";
    }
    if (!editingUser && userType === "teacher" && !formData.teacherId.trim()) {
      errors.teacherId = "Teacher ID is required";
    }
    if (!formData.department) errors.department = "Department is required";
    if (!editingUser && formData.password && formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePasswordForm = () => {
    const errors = {};
    if (!newPassword.trim()) errors.newPassword = "Password is required";
    else if (newPassword.length < 6) errors.newPassword = "Password must be at least 6 characters";
    if (newPassword !== confirmPassword) errors.confirmPassword = "Passwords do not match";
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const endpoint =
        userType === "student" ? "/admin/users/student" : "/admin/users/teacher";
      await api.post(endpoint, formData);
      setShowModal(false);
      resetForm();
      await Promise.all([loadUsers(), loadStats()]);
      showNotice("success", `${userType === "student" ? "Student" : "Teacher"} created successfully`);
    } catch (error) {
      showNotice("error", error.response?.data?.message || "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await api.put(`/admin/users/${editingUser._id}`, {
        name: formData.name,
        email: formData.email,
        department: formData.department,
        semester: formData.semester,
        section: formData.section,
        position: formData.position,
        isActive: formData.isActive,
      });
      setShowModal(false);
      resetForm();
      loadUsers();
      showNotice("success", "User updated successfully");
    } catch (error) {
      showNotice("error", error.response?.data?.message || "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/admin/users/${deletingUserId}`);
      setShowDeleteConfirm(false);
      setDeletingUserId(null);
      await Promise.all([loadUsers(), loadStats()]);
      showNotice("success", "User deleted successfully");
    } catch (error) {
      showNotice("error", error.response?.data?.message || "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!passwordUser || !validatePasswordForm()) return;

    const userId = passwordUser._id;
    const userName = passwordUser.name;

    setIsResettingPassword(true);
    try {
      await api.post(`/admin/users/${userId}/reset-password`, { newPassword });
      closePasswordModal();
      showNotice("success", `Password reset for ${userName}`);
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.msg ||
        "Failed to reset password";
      showNotice("error", msg);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const loadTeacherInsights = async (teacher) => {
    if (teacher.role !== "teacher") {
      setViewInsights({ loading: false, error: "", courses: [], assignments: [], projects: [], students: [] });
      return;
    }

    setViewInsights((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const [coursesRes, projectsRes] = await Promise.all([
        api.get("/admin/courses", { params: { limit: 400, page: 1 } }),
        api.get("/admin/submissions", { params: { limit: 800, page: 1 } }),
      ]);

      const allCourses = coursesRes.data?.data || [];
      const courses = allCourses.filter((course) => {
        const teacherId = typeof course.teacherId === "object" ? course.teacherId?._id : course.teacherId;
        return teacherId === teacher._id;
      });

      const courseIdSet = new Set(courses.map((c) => c._id));
      const allProjects = projectsRes.data?.data || [];
      const projects = allProjects.filter((project) => {
        const projectCourseId = typeof project.courseId === "object" ? project.courseId?._id : project.courseId;
        return courseIdSet.has(projectCourseId);
      });

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

      const studentMap = new Map();
      projects.forEach((p) => {
        const id =
          typeof p.studentId === "object" ? p.studentId?._id : p.studentId || p.studentName;
        if (!id) return;
        const name =
          (typeof p.studentId === "object" && p.studentId?.name) || p.studentName || "Unknown Student";
        studentMap.set(id, { id, name });
      });

      setViewInsights({
        loading: false,
        error: "",
        courses,
        assignments: assignmentLists.flat(),
        projects,
        students: Array.from(studentMap.values()),
      });
    } catch (error) {
      setViewInsights({
        loading: false,
        error: "Failed to load teacher insights",
        courses: [],
        assignments: [],
        projects: [],
        students: [],
      });
    }
  };

  const openViewModal = (user) => {
    setViewingUser(user);
    setShowViewModal(true);
    loadTeacherInsights(user);
  };

  // Open user detail from chat / deep link (?id=)
  useEffect(() => {
    const userId = searchParams.get("id");
    if (!userId || loading) return;
    if (showViewModal && String(viewingUser?._id) === String(userId)) return;

    let cancelled = false;
    (async () => {
      const match = users.find((u) => String(u._id) === String(userId));
      if (match) {
        if (!cancelled) {
          setViewingUser(match);
          setShowViewModal(true);
          loadTeacherInsights(match);
        }
        return;
      }
      try {
        const response = await api.get(`/admin/users/${userId}`);
        const user = response.data.data;
        if (!cancelled && user?._id) {
          setViewingUser(user);
          setShowViewModal(true);
          loadTeacherInsights(user);
        }
      } catch (err) {
        console.error("Failed to open user from URL:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, users, loading]);

  const openEditModal = (user) => {
    setEditingUser(user);
    setUserType(user.role);
    setFormData({
      name: user.name,
      email: user.email,
      studentId: user.studentId || "",
      teacherId: user.teacherId || "",
      department: user.department || "CS",
      semester: user.semester || "1st",
      year: user.year || 1,
      section: user.section || "A",
      position: user.position || "",
      password: "",
      isActive: user.isActive !== false,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openPasswordModal = (user) => {
    setPasswordUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordErrors({});
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordUser(null);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordErrors({});
  };

  const openDeleteConfirm = (user) => {
    setDeletingUserId(user._id);
    setDeletingUserName(user.name);
    setShowDeleteConfirm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      studentId: "",
      teacherId: "",
      department: "CS",
      semester: "1st",
      year: 1,
      section: "A",
      position: "",
      password: "",
      isActive: true,
    });
    setFormErrors({});
    setEditingUser(null);
    setUserType(forcedRole || "student");
  };


  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-50" />;
    return sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "admin":
        return <Shield size={16} className="text-purple-500" />;
      case "teacher":
        return <Briefcase size={16} className="text-blue-500" />;
      case "student":
        return <GraduationCap size={16} className="text-green-500" />;
      default:
        return <Users size={16} />;
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: "bg-purple-100 text-purple-700",
      teacher: "bg-blue-100 text-blue-700",
      student: "bg-green-100 text-green-700",
    };
    return badges[role] || "bg-gray-100 text-gray-700";
  };

  const getAvatarColor = (role) => {
    const colors = {
      admin: "from-purple-400 to-purple-600",
      teacher: "from-blue-400 to-blue-600",
      student: "from-emerald-400 to-emerald-600",
    };
    return colors[role] || "from-gray-400 to-gray-600";
  };

  const SortableHeader = ({ field, children }) => (
    <th
      className="px-5 py-3 text-left text-xs font-medium text-pink-600 uppercase cursor-pointer hover:bg-pink-100 transition-colors"
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
          {notification.type === "success" ? (
            <CheckCircle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {notification.message}
          <button onClick={() => setNotification(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      <PageHeader
        icon={forcedRole === "student" ? GraduationCap : forcedRole === "teacher" ? Briefcase : Users}
        iconColor={forcedRole === "student" ? "text-green-500" : forcedRole === "teacher" ? "text-blue-500" : "text-pink-500"}
        title={
          forcedRole === "student"
            ? "Student Management"
            : forcedRole === "teacher"
              ? "Teacher Management"
              : "User Management"
        }
        subtitle={
          <>
            {forcedRole === "student"
              ? "Manage all student accounts"
              : forcedRole === "teacher"
                ? "Manage all teacher accounts"
                : "Manage students, teachers and administrators"}
            {totalItems > 0 && <span className="ml-2 text-pink-500">({totalItems} matching)</span>}
          </>
        }
      >
        <button
          onClick={() => {
            resetForm();
            if (forcedRole) setUserType(forcedRole);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl text-sm font-medium hover:from-pink-600 hover:to-rose-600 flex items-center gap-2 shadow-sm transition-all"
        >
          <UserPlus size={16} />{" "}
          {forcedRole === "student" ? "Add Student" : forcedRole === "teacher" ? "Add Teacher" : "Add User"}
        </button>
      </PageHeader>

      {/* Stats Cards */}
      {!forcedRole ? (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => {
            setFilters({ ...filters, role: "student" });
            setCurrentPage(1);
          }}
          className="cute-card cute-card-green text-left hover:scale-[1.01] transition-transform"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Students</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalStudents}</p>
            </div>
            <IconGlass size="md" interactive className="text-green-600">
              <GraduationCap size={20} className="text-green-600" />
            </IconGlass>
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            setFilters({ ...filters, role: "teacher" });
            setCurrentPage(1);
          }}
          className="cute-card cute-card-blue text-left hover:scale-[1.01] transition-transform"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Teachers</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalTeachers}</p>
            </div>
            <IconGlass size="md" interactive className="text-blue-600">
              <Briefcase size={20} className="text-blue-600" />
            </IconGlass>
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            setFilters({ ...filters, role: "admin" });
            setCurrentPage(1);
          }}
          className="cute-card cute-card-purple text-left hover:scale-[1.01] transition-transform"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Admins</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalAdmins}</p>
            </div>
            <IconGlass size="md" interactive className="text-purple-600">
              <Shield size={20} className="text-purple-600" />
            </IconGlass>
          </div>
        </button>
      </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            className={`text-left border rounded-2xl p-4 ${
              forcedRole === "student"
                ? "cute-card cute-card-green"
                : "cute-card cute-card-blue"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  {forcedRole === "student" ? "Students" : "Teachers"}
                </p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {forcedRole === "student" ? stats.totalStudents : stats.totalTeachers}
                </p>
              </div>
              <IconGlass size="md" className={forcedRole === "student" ? "text-green-600" : "text-blue-600"}>
                {forcedRole === "student" ? (
                  <GraduationCap size={20} className="text-green-600" />
                ) : (
                  <Briefcase size={20} className="text-blue-600" />
                )}
              </IconGlass>
            </div>
          </div>
          <div className="text-left border rounded-2xl p-4 bg-purple-50 border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Admins</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalAdmins}</p>
              </div>
              <IconGlass size="md" className="text-purple-600">
                <Shield size={20} className="text-purple-600" />
              </IconGlass>
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-pink-100">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-500 mb-1 block">Search by name, email, or ID</label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              showFilters
                ? "bg-pink-100 text-pink-700"
                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Filter size={14} /> Filters
          </button>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 flex items-center gap-2 transition-all"
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
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-4 items-end">
              {!forcedRole && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Role</label>
                <select
                  value={filters.role}
                  onChange={(e) => {
                    setFilters({ ...filters, role: e.target.value });
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 min-w-[140px]"
                >
                  <option value="">All Roles</option>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              )}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Department</label>
                <select
                  value={filters.department}
                  onChange={(e) => {
                    setFilters({ ...filters, department: e.target.value });
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 min-w-[140px]"
                >
                  <option value="">All Departments</option>
                  {departmentOptions.map((dept) => (
                    <option key={dept.value} value={dept.value}>
                      {dept.value}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => {
                    setFilters({ ...filters, status: e.target.value });
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 min-w-[140px]"
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
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-pink-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-pink-50">
              <tr>
                <SortableHeader field="name">User</SortableHeader>
                <SortableHeader field="email">Email</SortableHeader>
                <SortableHeader field="role">Role</SortableHeader>
                <SortableHeader field="department">Department</SortableHeader>
                <SortableHeader field="studentId">ID</SortableHeader>
                <th className="px-5 py-3 text-left text-xs font-medium text-pink-600 uppercase">
                  Details
                </th>
                <SortableHeader field="isActive">Status</SortableHeader>
                <SortableHeader field="createdAt">Joined</SortableHeader>
                <th className="px-5 py-3 text-left text-xs font-medium text-pink-600 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-5 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={32} className="text-pink-500 animate-spin" />
                      <span className="text-gray-400">Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-5 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users size={40} className="text-gray-300" />
                      <span className="text-gray-400">No users found</span>
                      {(searchTerm || filters.role || filters.department || filters.status) && (
                        <button
                          onClick={clearAllFilters}
                          className="text-pink-500 text-sm hover:underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-pink-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(
                            user.role
                          )} flex items-center justify-center text-white text-xs font-semibold shrink-0`}
                        >
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{user.name}</p>
                          <p className="text-xs text-gray-400 capitalize">
                            {user.role}
                            {user.role === "teacher" && user.position ? ` · ${user.position}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{user.email}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getRoleBadge(
                          user.role
                        )}`}
                      >
                        {getRoleIcon(user.role)}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{user.department || "—"}</td>
                    <td className="px-5 py-3 text-sm font-mono text-gray-500">
                      {user.studentId || user.teacherId || "—"}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {user.role === "student" ? (
                        <span>
                          Y{user.year || "—"} · {user.semester ? `${user.semester} Sem` : "—"} · Sec {user.section || "—"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          user.isActive !== false
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openViewModal(user)}
                          className="p-1.5 rounded-lg hover:bg-pink-50 text-pink-500 transition-colors"
                          title="View details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => openPasswordModal(user)}
                          className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-600 transition-colors"
                          title="Reset password"
                        >
                          <Key size={16} />
                        </button>
                        {user.role !== "admin" && (
                          <button
                            onClick={() => openDeleteConfirm(user)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(totalPages > 1 || totalItems > 0) && (
          <div className="px-5 py-3 border-t border-pink-100 flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="text-sm text-gray-500">
              Showing {users.length} of {totalItems} users
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-pink-50 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-500 min-w-[120px] text-center">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages <= 1}
                className="p-2 rounded-lg hover:bg-pink-50 disabled:opacity-50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View User Modal */}
      {showViewModal && viewingUser && (
        <Modal
          title="User Details"
          icon={Eye}
          size="md"
          onClose={() => setShowViewModal(false)}
        >
          <div className="p-4 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                <div
                  className={`w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarColor(
                    viewingUser.role
                  )} flex items-center justify-center text-white text-lg font-semibold`}
                >
                  {getInitials(viewingUser.name)}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-lg">{viewingUser.name}</p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full mt-1 ${getRoleBadge(
                      viewingUser.role
                    )}`}
                  >
                    {getRoleIcon(viewingUser.role)}
                    {viewingUser.role}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400">Email</label>
                  <p className="text-gray-700 text-sm break-all">{viewingUser.email}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Department</label>
                  <p className="text-gray-700">{viewingUser.department || "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400">
                    {viewingUser.role === "teacher" ? "Teacher ID" : "Student ID"}
                  </label>
                  <p className="text-gray-700 font-mono text-sm">
                    {viewingUser.studentId || viewingUser.teacherId || "—"}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-400">Status</label>
                  <p>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        viewingUser.isActive !== false
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {viewingUser.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </p>
                </div>
              </div>
              {viewingUser.role === "student" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400">Semester</label>
                    <p className="text-gray-700">{viewingUser.semester ? `${viewingUser.semester} Sem` : "—"}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Section</label>
                    <p className="text-gray-700">Section {viewingUser.section || "—"}</p>
                  </div>
                </div>
              )}
              {viewingUser.role === "teacher" && viewingUser.position && (
                <div>
                  <label className="text-xs text-gray-400">Position</label>
                  <p className="text-gray-700">{viewingUser.position}</p>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-400">Joined</label>
                <p className="text-gray-700">{formatDate(viewingUser.createdAt)}</p>
              </div>
              {viewingUser.role === "teacher" && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Teaching Insights</p>
                  {viewInsights.loading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 size={14} className="animate-spin" />
                      Loading courses, assignments, students and projects...
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
                            <BookOpen size={12} /> Active Courses
                          </p>
                          {viewInsights.courses.length === 0 ? (
                            <p className="text-xs text-gray-500">No courses assigned</p>
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
                            <p className="text-xs text-gray-500">No project submissions yet</p>
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
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    openEditModal(viewingUser);
                  }}
                  className="flex-1 px-4 py-2 bg-pink-50 text-pink-700 rounded-xl text-sm font-medium hover:bg-pink-100 flex items-center justify-center gap-2"
                >
                  <Edit size={14} /> Edit
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    openPasswordModal(viewingUser);
                  }}
                  className="flex-1 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-xl text-sm font-medium hover:bg-yellow-100 flex items-center justify-center gap-2"
                >
                  <Key size={14} /> Reset Password
                </button>
              </div>
          </div>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && passwordUser && (
        <Modal
          title="Reset Password"
          icon={Lock}
          iconClass="text-amber-500"
          size="sm"
          onClose={closePasswordModal}
        >
          <form onSubmit={handleResetPassword} className="p-4 space-y-4">
              <p className="text-sm text-gray-500">
                Set a new password for{" "}
                <span className="font-semibold text-gray-700">{passwordUser.name}</span>
              </p>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  New Password *
                </label>
                <div className="relative">
                  <Key
                    size={16}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-300 ${
                      passwordErrors.newPassword ? "border-red-400 bg-red-50" : "border-gray-200"
                    }`}
                  />
                </div>
                {passwordErrors.newPassword && (
                  <p className="text-xs text-red-500 mt-1">{passwordErrors.newPassword}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-300 ${
                      passwordErrors.confirmPassword ? "border-red-400 bg-red-50" : "border-gray-200"
                    }`}
                  />
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{passwordErrors.confirmPassword}</p>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="flex-1 bg-yellow-500 text-white py-2 rounded-xl font-medium hover:bg-yellow-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isResettingPassword ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  Reset Password
                </button>
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
        </Modal>
      )}

      {/* Add/Edit User Modal */}
      {showModal && (
        <Modal
          title={editingUser ? "Edit User" : "Add New User"}
          icon={editingUser ? Edit : UserPlus}
          size="md"
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
        >
            <form
              onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
              className="p-4 space-y-4"
            >
              {!editingUser && !forcedRole && (
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setUserType("student")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      userType === "student"
                        ? "bg-pink-500 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <GraduationCap size={14} /> Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType("teacher")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      userType === "teacher"
                        ? "bg-pink-500 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <Briefcase size={14} /> Teacher
                  </button>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Full Name *</label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all ${
                      formErrors.name ? "border-red-400 bg-red-50" : "border-gray-200"
                    }`}
                  />
                </div>
                {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Email *</label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all ${
                      formErrors.email ? "border-red-400 bg-red-50" : "border-gray-200"
                    }`}
                  />
                </div>
                {formErrors.email && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                )}
              </div>

              {!editingUser && userType === "student" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Student ID *
                  </label>
                  <div className="relative">
                    <Hash
                      size={16}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Enter student ID"
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 ${
                        formErrors.studentId ? "border-red-400 bg-red-50" : "border-gray-200"
                      }`}
                    />
                  </div>
                  {formErrors.studentId && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.studentId}</p>
                  )}
                </div>
              )}

              {!editingUser && userType === "teacher" && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Teacher ID *
                  </label>
                  <div className="relative">
                    <Hash
                      size={16}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Enter teacher ID"
                      value={formData.teacherId}
                      onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                      className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 ${
                        formErrors.teacherId ? "border-red-400 bg-red-50" : "border-gray-200"
                      }`}
                    />
                  </div>
                  {formErrors.teacherId && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.teacherId}</p>
                  )}
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Department *</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 ${
                    formErrors.department ? "border-red-400 bg-red-50" : "border-gray-200"
                  }`}
                >
                  <option value="">Select department</option>
                  {departmentOptions.map((dept) => (
                    <option key={dept.value} value={dept.value}>
                      {dept.label}
                    </option>
                  ))}
                </select>
                {formErrors.department && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.department}</p>
                )}
              </div>

              {isStudentForm && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Semester</label>
                    <select
                      value={formData.semester}
                      onChange={(e) =>
                        setFormData({ ...formData, semester: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300"
                    >
                      {SEMESTER_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Section</label>
                    <select
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300"
                    >
                      {["A", "B", "C", "D"].map((sec) => (
                        <option key={sec} value={sec}>
                          Section {sec}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {isTeacherForm && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Position</label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300"
                  >
                    <option value="">Select position</option>
                    {TEACHER_POSITION_OPTIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {editingUser && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.isActive === true}
                        onChange={() => setFormData({ ...formData, isActive: true })}
                        className="text-pink-500 focus:ring-pink-300"
                      />
                      <span className="text-sm">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.isActive === false}
                        onChange={() => setFormData({ ...formData, isActive: false })}
                        className="text-pink-500 focus:ring-pink-300"
                      />
                      <span className="text-sm">Inactive</span>
                    </label>
                  </div>
                </div>
              )}

              {!editingUser && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Password</label>
                  <div className="relative">
                    <Key
                      size={16}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="password"
                      placeholder="Leave blank for auto-generated"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all ${
                        formErrors.password ? "border-red-400 bg-red-50" : "border-gray-200"
                      }`}
                    />
                  </div>
                  {formErrors.password && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white py-2 rounded-xl font-medium hover:from-pink-600 hover:to-rose-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  {editingUser ? "Update User" : "Create User"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl font-medium hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal
          title="Delete User"
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
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-700">{deletingUserName}</span>? This action
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : null}
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all"
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

export default UsersPage;
