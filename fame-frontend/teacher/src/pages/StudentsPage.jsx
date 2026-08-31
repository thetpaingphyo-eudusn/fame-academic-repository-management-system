import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { aiAPI, courseAPI, projectAPI, studentAPI } from "../services/api";
import {
  averageGrade,
  filterProjectsByStudent,
  getAssignmentTitle,
  getStudentDisplayName
} from "../utils/projectHelpers";
import ProjectDetailModal from "../components/ProjectDetailModal";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

import {
  AlertCircle, Users, UserPlus, Mail, Search, RefreshCw, Loader,
  X, Eye, FileText, Star, Clock, CheckCircle, XCircle,
  LayoutGrid, List, TrendingUp, Award, BookOpen,
  GraduationCap, FolderKanban, Trash2, Edit, Brain
} from "lucide-react";

const STATUS_BADGE = {
  pending: { bg: "bg-amber-100", text: "text-amber-700", label: "Awaiting Review", icon: Clock },
  approved: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Approved", icon: CheckCircle },
  rejected: { bg: "bg-red-100", text: "text-red-700", label: "Rejected", icon: XCircle },
  revision: { bg: "bg-sky-100", text: "text-sky-700", label: "Revision", icon: AlertCircle },
  graded: { bg: "bg-purple-100", text: "text-purple-700", label: "Graded", icon: Star }
};

const StudentsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentProjects, setStudentProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [showAiModal, setShowAiModal] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) setSearchTerm(q);
  }, [searchParams]);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, selectedCourseFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [coursesRes, projectsRes] = await Promise.all([
        courseAPI.getMyCourses(),
        projectAPI.getMyProjects({ limit: 500 })
      ]);
      const coursesData = coursesRes.data.data || [];
      const allProjects = projectsRes.data.data || [];
      setCourses(coursesData);

      if (coursesData.length === 0) {
        setStudents([]);
        setFilteredStudents([]);
        return;
      }

      let allStudents = [];
      for (const course of coursesData) {
        try {
          const studentsRes = await courseAPI.getStudentsByCourse(course._id);
          const courseStudents = studentsRes.data.data || [];
          const studentsWithCourseInfo = courseStudents.map((s) => ({
            ...s,
            courseName: course.courseName || course.name,
            courseCode: course.courseCode || course.code,
            courseId: course._id,
            name: getStudentDisplayName(s)
          }));
          allStudents = [...allStudents, ...studentsWithCourseInfo];
        } catch (e) {
          console.error(`Failed to load students for course ${course._id}:`, e);
        }
      }

      const uniqueStudents = allStudents.filter(
        (student, index, self) => index === self.findIndex((s) => s._id === student._id)
      );

      const studentsWithProjects = uniqueStudents.map((student) => {
        const projects = filterProjectsByStudent(allProjects, student._id);
        return {
          ...student,
          projectCount: projects.length,
          avgGrade: averageGrade(projects),
          pendingCount: projects.filter((p) => p.status === "pending").length
        };
      });

      setStudents(studentsWithProjects);
      setFilteredStudents(studentsWithProjects);
    } catch (error) {
      console.error("Failed to load students:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentProjects = async (studentId) => {
    setLoadingProjects(true);
    try {
      const res = await projectAPI.getMyProjects({ studentId, limit: 50 });
      setStudentProjects(res.data.data || []);
    } catch (error) {
      console.error("Failed to load student projects:", error);
      setStudentProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const filterStudents = () => {
    let filtered = [...students];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.studentId?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.courseName?.toLowerCase().includes(q)
      );
    }
    if (selectedCourseFilter) {
      filtered = filtered.filter((s) => s.courseId === selectedCourseFilter);
    }
    setFilteredStudents(filtered);
  };

  const viewStudentDetails = async (student) => {
    setSelectedStudent(student);
    setShowStudentModal(true);
    await loadStudentProjects(student._id);
  };

  // Open student detail from chat / deep link (?id=)
  useEffect(() => {
    const studentId = searchParams.get("id");
    if (!studentId || loading) return;
    if (showStudentModal && String(selectedStudent?._id) === String(studentId)) return;

    let cancelled = false;
    (async () => {
      const match = students.find((s) => String(s._id) === String(studentId));
      if (match) {
        if (!cancelled) await viewStudentDetails(match);
        return;
      }
      try {
        const res = await studentAPI.getStudentById(studentId);
        const student = res?.data?.data;
        if (!cancelled && student?._id) {
          await viewStudentDetails(student);
        }
      } catch (err) {
        console.error("Failed to open student from URL:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, students, loading]);

  const openProjectDetail = (project) => {
    setSelectedProject(project);
    setShowProjectModal(true);
  };

  const handleProjectStatusChange = async (projectId, newStatus, notes = "") => {
    try {
      switch (newStatus) {
        case "approved":
          await projectAPI.approveProject(projectId, notes);
          break;
        case "rejected":
          await projectAPI.rejectProject(projectId, notes);
          break;
        case "revision":
          await projectAPI.requestRevision(projectId, notes);
          break;
        default:
          return;
      }
      if (selectedStudent) await loadStudentProjects(selectedStudent._id);
      await loadData();
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update project status.");
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    setSubmitting(true);
    try {
      await studentAPI.deleteStudent(studentToDelete._id);
      setShowDeleteConfirm(false);
      setStudentToDelete(null);
      loadData();
    } catch (error) {
      console.error("Failed to delete student:", error);
      alert("Failed to delete student");
    } finally {
      setSubmitting(false);
    }
  };

  const analyzeProjectHealth = async (project) => {
    setAiAnalyzing(true);
    setShowAiModal(true);
    setAiAnalysis(null);
    try {
      const healthRes = await projectAPI.getProjectHealth(project._id);
      const deps = healthRes.data.data?.dependencies || project.dependencies || [];
      if (!deps.length) {
        setAiAnalysis({
          healthScore: healthRes.data.data?.healthScore ?? null,
          recommendations: [
            { type: 'info', message: 'No dependency data for this project.', action: 'Upload package.json with project files.' },
          ],
        });
        return;
      }
      const response = await aiAPI.analyzeDependencies(deps);
      setAiAnalysis(response.data.data);
    } catch (error) {
      setAiAnalysis({
        healthScore: null,
        recommendations: [
          { type: 'error', message: error.response?.data?.message || 'Health check failed.', action: '' },
        ],
      });
    } finally {
      setAiAnalyzing(false);
    }
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return "bg-emerald-100 text-emerald-600";
    if (score >= 60) return "bg-amber-100 text-amber-600";
    return "bg-red-100 text-red-600";
  };

  const totalStudents = students.length;
  const totalProjects = students.reduce((sum, s) => sum + (s.projectCount || 0), 0);
  const avgProjectsPerStudent = totalStudents > 0 ? (totalProjects / totalStudents).toFixed(1) : 0;
  const overallAvgGrade =
    students.length > 0
      ? Math.round(students.reduce((sum, s) => sum + (s.avgGrade || 0), 0) / students.length)
      : 0;
  const pendingReviews = students.reduce((sum, s) => sum + (s.pendingCount || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-3">
        <Loader className="w-9 h-9 text-violet-500 animate-spin" />
        <p className="text-sm text-slate-400">Loading students…</p>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-96">
        <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center max-w-md shadow-lg shadow-amber-100/60">
          <BookOpen size={48} className="mx-auto text-amber-500 mb-3" />
          <h2 className="text-lg font-semibold text-amber-900 mb-2">No Courses Found</h2>
          <p className="text-amber-700/80 mb-5 text-sm leading-relaxed">
            Students appear here once you create courses and enroll them.
          </p>
          <button
            onClick={() => navigate("/courses")}
            className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-violet-500/25"
          >
            Go to My Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Students"
        subtitle={`${totalStudents} students across ${courses.length} courses`}
        icon={Users}
        iconColor="text-violet-500"
      >
        <button
          onClick={loadData}
          className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200/80 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={18} />
        </button>
        <button
          onClick={() => navigate("/students/add")}
          className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-violet-500/25 flex items-center gap-2"
        >
          <UserPlus size={16} /> Enroll Student
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Courses" value={courses.length} icon={BookOpen} iconColor="violet" cardClass="cute-card cute-card-purple p-4" />
        <StatCard label="Students" value={totalStudents} icon={Users} iconColor="green" cardClass="cute-card cute-card-green p-4" />
        <StatCard label="Projects" value={totalProjects} icon={FolderKanban} iconColor="blue" cardClass="cute-card cute-card-blue p-4" />
        <StatCard label="Avg Grade" value={`${overallAvgGrade}%`} icon={Award} iconColor="purple" cardClass="cute-card cute-card-purple p-4" />
      </div>
      {pendingReviews > 0 && (
        <StatCard
          label="Pending Review"
          value={pendingReviews}
          icon={Clock}
          iconColor="amber"
          cardClass="cute-card cute-card-amber p-4"
        />
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <select
          value={selectedCourseFilter}
          onChange={(e) => setSelectedCourseFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-slate-50 text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-violet-200 outline-none transition-all"
        >
          <option value="">All Courses ({courses.length})</option>
          {courses.map((course) => (
            <option key={course._id} value={course._id}>
              {course.courseName || course.name}
            </option>
          ))}
        </select>

        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by name, ID, or email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-violet-200 outline-none transition-all"
          />
        </div>

        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            { mode: "table", icon: List, label: "Table" },
            { mode: "card", icon: LayoutGrid, label: "Cards" }
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all ${
                viewMode === mode ? "bg-white shadow-sm text-violet-600" : "text-slate-500"
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {viewMode === "table" && totalStudents > 0 && (
        <div className="rounded-2xl bg-white shadow-sm shadow-slate-200/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80">
                <tr>
                  {["Student", "ID", "Course", "Sem / Sec", "Projects", "Avg Grade", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {student.name?.charAt(0) || "S"}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{student.name}</p>
                          <p className="text-xs text-slate-400">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{student.studentId}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{student.courseName || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      Y{student.year} · {student.semester ? `${student.semester} Sem` : "—"} · Sec {student.section}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 text-xs rounded-full bg-violet-50 text-violet-600 font-medium">
                        {student.projectCount || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {student.avgGrade > 0 ? (
                        <span className="text-sm font-semibold text-purple-600">{student.avgGrade}%</span>
                      ) : (
                        <span className="text-sm text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => viewStudentDetails(student)}
                          className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-500"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/students/edit/${student._id}`)}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => { setStudentToDelete(student); setShowDeleteConfirm(true); }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <Users size={40} className="mx-auto text-slate-200 mb-2" />
              <p className="text-slate-500">No students match your filters</p>
            </div>
          )}
        </div>
      )}

      {/* Cards */}
      {viewMode === "card" && totalStudents > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => (
            <div
              key={student._id}
              className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/60 hover:shadow-md hover:shadow-violet-100/40 transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold">
                    {student.name?.charAt(0) || "S"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{student.name}</h3>
                    <p className="text-xs text-slate-400">{student.studentId}</p>
                  </div>
                </div>
                <button
                  onClick={() => viewStudentDetails(student)}
                  className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-500"
                >
                  <Eye size={16} />
                </button>
              </div>
              <div className="space-y-1.5 text-sm text-slate-600">
                <p className="flex items-center gap-2"><Mail size={13} className="text-slate-400" />{student.email}</p>
                <p className="flex items-center gap-2"><BookOpen size={13} className="text-slate-400" />{student.courseName || "—"}</p>
                <p className="flex items-center gap-2"><GraduationCap size={13} className="text-slate-400" />{student.semester ? `${student.semester} Sem` : `Year ${student.year}`}, Sec {student.section}</p>
              </div>
              <div className="mt-4 pt-4 flex justify-between items-center">
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1 text-slate-500">
                    <FolderKanban size={13} className="text-violet-500" />
                    {student.projectCount || 0}
                  </span>
                  {student.avgGrade > 0 && (
                    <span className="text-purple-600 font-semibold">{student.avgGrade}%</span>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/submissions?student=${student._id}`)}
                  className="text-xs text-violet-500 font-medium hover:text-violet-700"
                >
                  Submissions →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalStudents === 0 && (
        <div className="text-center py-16 rounded-2xl bg-white shadow-sm">
          <Users size={48} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-500">No students in your courses yet</p>
          <button onClick={() => navigate("/students/add")} className="mt-3 text-violet-500 text-sm font-medium">
            Enroll your first student →
          </button>
        </div>
      )}

      {/* Student Detail Modal */}
      {showStudentModal && selectedStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setShowStudentModal(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-3xl bg-white shadow-2xl shadow-violet-500/10 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 opacity-95" />
              <div className="relative px-6 py-5 flex justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white text-xl font-bold">
                    {selectedStudent.name?.charAt(0) || "S"}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{selectedStudent.name}</h2>
                    <p className="text-sm text-white/70">{selectedStudent.studentId} · {selectedStudent.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStudentModal(false)}
                  className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5 bg-gradient-to-b from-slate-50/80 to-white">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Department", value: selectedStudent.department },
                  { label: "Semester / Section", value: `${selectedStudent.semester ? `${selectedStudent.semester} Sem` : `Y${selectedStudent.year}`} · Sec ${selectedStudent.section}` },
                  { label: "Course", value: selectedStudent.courseName || "—" },
                  { label: "Projects", value: studentProjects.length }
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-white p-3 shadow-sm shadow-slate-200/50">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">{item.label}</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FolderKanban size={16} className="text-violet-500" />
                  Projects ({studentProjects.length})
                </h3>
                <button
                  onClick={() => navigate(`/submissions?student=${selectedStudent._id}`)}
                  className="text-sm text-violet-500 font-medium hover:text-violet-700"
                >
                  All submissions →
                </button>
              </div>

              {loadingProjects ? (
                <div className="flex justify-center py-10">
                  <Loader className="w-8 h-8 text-violet-500 animate-spin" />
                </div>
              ) : studentProjects.length > 0 ? (
                <div className="space-y-3">
                  {studentProjects.map((project) => {
                    const badge = STATUS_BADGE[project.status] || STATUS_BADGE.pending;
                    const Icon = badge.icon;
                    return (
                      <div
                        key={project._id}
                        className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-200/50 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <FileText size={14} className="text-violet-500 shrink-0" />
                              <h4 className="font-medium text-slate-800">{project.title}</h4>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${badge.bg} ${badge.text}`}>
                                <Icon size={11} /> {badge.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">{getAssignmentTitle(project)}</p>
                            <div className="flex gap-3 mt-2 text-xs text-slate-500">
                              {project.submittedAt && (
                                <span>{new Date(project.submittedAt).toLocaleDateString("en-US")}</span>
                              )}
                              {project.grade != null && (
                                <span className="font-semibold text-purple-600">{project.grade}%</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => analyzeProjectHealth(project)}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500"
                              title="AI Health Check"
                            >
                              <Brain size={15} />
                            </button>
                            <button
                              onClick={() => openProjectDetail(project)}
                              className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-500"
                              title="View & Grade"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => openProjectDetail(project)}
                              className="px-2.5 py-1.5 rounded-lg bg-violet-500 text-white text-xs font-medium hover:bg-violet-600"
                            >
                              Grade
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 rounded-2xl bg-slate-50">
                  <FolderKanban size={36} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-slate-500 text-sm">No projects submitted yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Project detail with criteria grading */}
      {showProjectModal && selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => {
            setShowProjectModal(false);
            setSelectedProject(null);
          }}
          onRefresh={async () => {
            await loadData();
            if (selectedStudent) await loadStudentProjects(selectedStudent._id);
          }}
          onAnalyzeHealth={(p) => {
            setShowProjectModal(false);
            analyzeProjectHealth(p);
          }}
          onStatusChange={handleProjectStatusChange}
        />
      )}

      {/* AI Modal */}
      {showAiModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setShowAiModal(false)}
        >
          <div className="rounded-3xl bg-white max-w-md w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 flex justify-between items-center">
              <div className="flex items-center gap-2 text-white">
                <Brain size={20} />
                <h2 className="font-semibold">AI Health Analysis</h2>
              </div>
              <button onClick={() => setShowAiModal(false)} className="p-1.5 rounded-lg bg-white/20 text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              {aiAnalyzing ? (
                <div className="text-center py-8">
                  <Loader className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Analyzing project health…</p>
                </div>
              ) : aiAnalysis ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${getHealthScoreColor(aiAnalysis.healthScore)} mb-2`}>
                      <span className="text-xl font-bold">{aiAnalysis.healthScore}%</span>
                    </div>
                    <p className="text-sm text-slate-500">Overall Health Score</p>
                  </div>
                  <div className="space-y-2">
                    {aiAnalysis.recommendations?.map((rec, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 text-sm">
                        <p className="text-slate-700">{rec.message}</p>
                        {rec.action && <p className="text-xs text-slate-400 mt-1">{rec.action}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && studentToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div className="rounded-3xl bg-white max-w-md w-full shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Delete Student</h2>
            <p className="text-slate-600 text-sm mb-1">
              Remove <strong>{studentToDelete.name}</strong> from your courses?
            </p>
            <p className="text-sm text-red-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStudent}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsPage;
