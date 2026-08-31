import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useConfirmDialog } from "../components/ConfirmDialog";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import IconGlass from "../components/IconGlass";
import { courseAPI, projectAPI } from "../services/api";
import {
  averageGrade,
  getStudentName,
  matchesCourse
} from "../utils/projectHelpers";

import { 
  BookOpen, Users, Calendar, Clock, RefreshCw, Loader, 
  Plus, Edit, Trash2, Eye, FileText, Star, AlertCircle, CheckCircle,
  X, Search, Filter, Download, Mail, MoreVertical, Copy, Check, Save,
  GraduationCap, BarChart3, TrendingUp, ChevronDown, ChevronUp,
  UserPlus, Mail as MailIcon, Phone, MapPin, FolderKanban,
  Award, Zap, Brain
} from 'lucide-react';

const SEMESTER_OPTIONS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"].map(
  (s) => ({ value: s, label: `${s} Sem` })
);

const CoursesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [courseProjects, setCourseProjects] = useState({});
  const [courseStudents, setCourseStudents] = useState({});
  const [loadingProjects, setLoadingProjects] = useState({});
  const [loadingStudents, setLoadingStudents] = useState({});
  const [allProjects, setAllProjects] = useState([]);
  
  const [formData, setFormData] = useState({
    courseName: '',
    courseCode: '',
    description: '',
    department: user?.department || 'CS',
    year: '4',
    section: 'A',
    semester: '1st',
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    credits: '3',
    schedule: ''
  });

  useEffect(() => {
    loadCourses();
  }, []);

  const enrichCourses = (coursesData, projectsData) =>
    coursesData.map((course) => {
      const projects = projectsData.filter((p) => matchesCourse(p, course._id));
      const pending = projects.filter((p) => p.status === "pending").length;
      return {
        ...course,
        submissionsCount: projects.length,
        pendingSubmissions: pending,
        avgGrade: averageGrade(projects),
        gradedCount: projects.filter((p) => p.grade != null).length
      };
    });

  const loadCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const [coursesRes, projectsRes] = await Promise.all([
        courseAPI.getMyCourses(),
        projectAPI.getMyProjects({ limit: 500 })
      ]);
      const projectsData = projectsRes.data.data || [];
      const coursesData = enrichCourses(coursesRes.data.data || [], projectsData);
      setAllProjects(projectsData);
      setCourses(coursesData);
      setCourseProjects({});
      setCourseStudents({});
    } catch (err) {
      console.error("Failed to load courses:", err);
      setError("Failed to load courses. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadProjectsForCourse = async (courseId) => {
    if (courseProjects[courseId]) return;

    setLoadingProjects((prev) => ({ ...prev, [courseId]: true }));
    try {
      const list = allProjects.filter((p) => matchesCourse(p, courseId));
      setCourseProjects((prev) => ({ ...prev, [courseId]: list }));
    } catch (err) {
      console.error(`Failed to load projects for course ${courseId}:`, err);
      setCourseProjects((prev) => ({ ...prev, [courseId]: [] }));
    } finally {
      setLoadingProjects((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const loadStudentsForCourse = async (courseId) => {
    if (courseStudents[courseId]) return;

    setLoadingStudents((prev) => ({ ...prev, [courseId]: true }));
    try {
      const res = await courseAPI.getStudentsByCourse(courseId);
      setCourseStudents((prev) => ({ ...prev, [courseId]: res.data.data || [] }));
    } catch (err) {
      console.error(`Failed to load students for course ${courseId}:`, err);
      setCourseStudents((prev) => ({ ...prev, [courseId]: [] }));
    } finally {
      setLoadingStudents((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const handleCreateCourse = async () => {
    if (!formData.courseName || !formData.courseCode) {
      alert('Please fill course name and code');
      return;
    }

    setSubmitting(true);
    try {
      const courseData = {
        courseName: formData.courseName,
        courseCode: formData.courseCode.toUpperCase(),
        description: formData.description,
        department: formData.department,
        year: parseInt(formData.year),
        section: formData.section,
        semester: formData.semester,
        academicYear: formData.academicYear,
        credits: parseInt(formData.credits),
        schedule: formData.schedule,
        teacherId: user?._id
      };
      
      await courseAPI.createCourse(courseData);
      setShowCreateModal(false);
      resetForm();
      loadCourses();
      alert('Course created successfully!');
    } catch (error) {
      console.error('Failed to create course:', error);
      alert(error.response?.data?.message || 'Failed to create course');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCourse = async () => {
    if (!selectedCourse) return;
    
    setSubmitting(true);
    try {
      const updateData = {
        courseName: formData.courseName,
        description: formData.description,
        department: formData.department,
        year: parseInt(formData.year),
        section: formData.section,
        semester: formData.semester,
        academicYear: formData.academicYear,
        credits: parseInt(formData.credits),
        schedule: formData.schedule
      };
      
      await courseAPI.updateCourse(selectedCourse._id, updateData);
      setShowEditModal(false);
      resetForm();
      loadCourses();
      alert('Course updated successfully!');
    } catch (error) {
      console.error('Failed to update course:', error);
      alert('Failed to update course');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async (courseId, courseName) => {
    if (await confirm({
      title: "Delete course?",
      message: `Delete "${courseName}"? All assignments and submissions in this course will also be permanently removed.`,
      confirmLabel: "Delete course",
    })) {
      try {
        await courseAPI.deleteCourse(courseId);
        loadCourses();
        alert('Course deleted successfully!');
      } catch (error) {
        console.error('Failed to delete course:', error);
        alert('Failed to delete course');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      courseName: '',
      courseCode: '',
      description: '',
      department: user?.department || 'CS',
      year: '4',
      section: 'A',
      semester: '1st',
      academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      credits: '3',
      schedule: ''
    });
  };

  const openEditModal = (course) => {
    setSelectedCourse(course);
    setFormData({
      courseName: course.courseName || course.name,
      courseCode: course.courseCode || course.code,
      description: course.description || '',
      department: course.department,
      year: course.year?.toString(),
      section: course.section,
      semester: course.semester || '1st',
      academicYear: course.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      credits: course.credits?.toString(),
      schedule: course.schedule || ''
    });
    setShowEditModal(true);
  };

  const toggleCourseExpand = async (courseId, section) => {
    if (expandedCourse === courseId && expandedSection === section) {
      setExpandedCourse(null);
      setExpandedSection(null);
    } else {
      setExpandedCourse(courseId);
      setExpandedSection(section);
      if (section === "projects") await loadProjectsForCourse(courseId);
      if (section === "students") await loadStudentsForCourse(courseId);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Submitted' },
      graded: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Graded' },
      approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved' },
      rejected: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Rejected' },
      revision: { bg: 'bg-sky-100', text: 'text-sky-700', label: 'Revision' }
    };
    return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
  };

  const filteredCourses = courses.filter(course => {
    const searchLower = searchTerm.toLowerCase();
    const courseName = (course.courseName || course.name || '').toLowerCase();
    const courseCode = (course.courseCode || course.code || '').toLowerCase();
    return courseName.includes(searchLower) || courseCode.includes(searchLower);
  });

  const totalStudents = new Set(
    courses.flatMap((c) => (c.students || []).map((s) => s._id))
  ).size || courses.reduce((sum, c) => sum + (c.studentCount || 0), 0);
  const totalAssignments = courses.reduce((sum, c) => sum + (c.assignmentsCount || 0), 0);
  const totalSubmissions = courses.reduce((sum, c) => sum + (c.submissionsCount || 0), 0);
  const totalPending = courses.reduce((sum, c) => sum + (c.pendingSubmissions || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-96">
        <div className="bg-red-50 rounded-2xl p-6 text-center max-w-md">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-3" />
          <h2 className="text-lg font-semibold text-red-700 mb-2">Error Loading Courses</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadCourses}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={16} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Courses"
        subtitle="Manage your courses, assignments, and student projects"
        icon={BookOpen}
      >
        <button
          onClick={loadCourses}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw size={16} /> Refresh
        </button>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:from-blue-600 hover:to-indigo-600 transition-all"
        >
          <Plus size={16} /> Create Course
        </button>
      </PageHeader>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Search courses by name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Courses" value={courses.length} icon={BookOpen} iconColor="blue" cardClass="cute-card cute-card-blue p-4" />
        <StatCard label="Total Students" value={totalStudents} icon={Users} iconColor="green" cardClass="cute-card cute-card-green p-4" />
        <StatCard label="Total Assignments" value={totalAssignments} icon={FileText} iconColor="amber" cardClass="cute-card cute-card-amber p-4" />
        <StatCard label="Total Submissions" value={totalSubmissions} icon={FolderKanban} iconColor="purple" cardClass="cute-card cute-card-purple p-4" />
      </div>
      {totalPending > 0 && (
        <StatCard
          label="Awaiting Review"
          value={totalPending}
          icon={AlertCircle}
          iconColor="amber"
          cardClass="cute-card cute-card-amber p-4"
        />
      )}

      {/* Courses List */}
      <div className="space-y-4">
        {filteredCourses.map((course) => {
          const courseId = course._id;
          const courseName = course.courseName || course.name;
          const courseCode = course.courseCode || course.code;
          const assignments = course.assignments || [];
          const students = courseStudents[courseId] ?? course.students ?? [];
          const projects = courseProjects[courseId] || [];
          const isLoadingProjects = loadingProjects[courseId];
          const isLoadingStudents = loadingStudents[courseId];
          
          return (
            <div key={courseId} className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden hover:shadow-md transition-all">
              {/* Course Header */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex justify-between items-start flex-wrap gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <IconGlass size="md" tone="dark" className="bg-gradient-to-r from-blue-500/80 to-indigo-500/80 text-white">
                        <GraduationCap size={18} className="text-white" />
                      </IconGlass>
                      <div>
                        <h3 className="font-semibold text-gray-800 text-lg">{courseName}</h3>
                        <p className="text-sm text-gray-500">{courseCode}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {course.semester}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {course.credits} Credits</span>
                      <span className="flex items-center gap-1"><Users size={12} /> {course.studentCount || 0} Students</span>
                      <span className="flex items-center gap-1"><FileText size={12} /> {course.assignmentsCount || 0} Assignments</span>
                      {(course.pendingSubmissions || 0) > 0 && (
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <AlertCircle size={12} /> {course.pendingSubmissions} pending
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openEditModal(course)} 
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Edit Course"
                    >
                      <Edit size={16} className="text-gray-500" />
                    </button>
                    <button 
                      onClick={() => handleDeleteCourse(courseId, courseName)} 
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete Course"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Course Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 p-4 bg-gray-50">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Assignments</p>
                  <p className="text-lg font-bold text-gray-800">{course.assignmentsCount || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Submissions</p>
                  <p className="text-lg font-bold text-purple-600">{course.submissionsCount || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Pending</p>
                  <p className="text-lg font-bold text-amber-600">{course.pendingSubmissions || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Avg Grade</p>
                  <p className="text-lg font-bold text-yellow-600">{course.avgGrade || 0}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Students</p>
                  <p className="text-lg font-bold text-emerald-600">{course.studentCount || students.length || 0}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 flex flex-wrap gap-2 border-b border-gray-100">
                <button
                  onClick={() => navigate(`/courses/${courseId}/assignments`)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100"
                >
                  <FileText size={14} /> Manage Assignments
                </button>
                <button
                  onClick={() => navigate(`/submissions?course=${courseId}`)}
                  className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-sm hover:bg-amber-100 flex items-center gap-1"
                >
                  <Eye size={14} /> Submissions
                  {(course.pendingSubmissions || 0) > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-amber-200 text-amber-800 text-xs rounded-full">
                      {course.pendingSubmissions}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => navigate(`/analytics?course=${courseId}`)}
                  className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-sm hover:bg-purple-100"
                >
                  <BarChart3 size={14} /> Analytics
                </button>
              </div>

              {/* Assignments Section */}
              <div className="border-t border-gray-100">
                <button
                  onClick={() => toggleCourseExpand(courseId, 'assignments')}
                  className="w-full p-3 flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-blue-500" />
                    <span className="font-medium text-gray-700">Assignments ({assignments.length})</span>
                  </div>
                  {expandedCourse === courseId && expandedSection === 'assignments' ? (
                    <ChevronUp size={18} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={18} className="text-gray-400" />
                  )}
                </button>
                
                {expandedCourse === courseId && expandedSection === 'assignments' && (
                  <div className="p-4 bg-gray-50 border-t border-gray-100">
                    {assignments.length > 0 ? (
                      <div className="space-y-2">
                        {assignments.map((assignment) => (
                          <div key={assignment._id} className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-sm transition-all">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-gray-800">{assignment.title}</p>
                                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                                  <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                                  <span className={`px-2 py-0.5 rounded-full ${
                                    assignment.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {assignment.status || 'Open'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => navigate(`/assignments/${assignment._id}/submissions`)}
                                  className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
                                  title="View Submissions"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  onClick={() => navigate(`/assignments/${assignment._id}/criteria`)}
                                  className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500"
                                  title="Grading Criteria"
                                >
                                  <Star size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-white rounded-lg">
                        <FileText size={32} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-500">No assignments yet</p>
                        <button
                          onClick={() => navigate(`/courses/${courseId}/assignments`)}
                          className="mt-2 text-blue-500 text-sm hover:underline"
                        >
                          Create first assignment
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
{/* Students Section - Expandable */}
<div className="border-t border-gray-100">
  <button
    onClick={() => toggleCourseExpand(courseId, 'students')}
    className="w-full p-3 flex justify-between items-center hover:bg-gray-50 transition-colors"
  >
    <div className="flex items-center gap-2">
      <Users size={16} className="text-green-500" />
      <span className="font-medium text-gray-700">Students ({students.length})</span>
    </div>
    {expandedCourse === courseId && expandedSection === 'students' ? (
      <ChevronUp size={18} className="text-gray-400" />
    ) : (
      <ChevronDown size={18} className="text-gray-400" />
    )}
  </button>
  
  {expandedCourse === courseId && expandedSection === 'students' && (
    <div className="p-4 bg-gray-50 border-t border-gray-100">
      {isLoadingStudents ? (
        <div className="flex justify-center py-8">
          <Loader className="w-6 h-6 text-green-500 animate-spin" />
        </div>
      ) : students.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {students.map((student) => (
            <div key={student._id} className="bg-white rounded-lg p-3 border border-gray-200 flex items-center justify-between hover:shadow-sm transition-all">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {student.name?.charAt(0) || 'S'}
                </div>
                <div>
                  {/* ✅ FIXED: Use student.name, not the whole student object */}
                  <p className="font-medium text-gray-800 text-sm">{student.name}</p>
                  <p className="text-xs text-gray-500">{student.studentId || student.email}</p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/submissions?student=${student._id}`)}
                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
                title="View Projects"
              >
                <Eye size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-white rounded-lg">
          <Users size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500">No students enrolled yet</p>
          <button
            onClick={() => navigate(`/students/add?course=${courseId}`)}
            className="mt-2 text-blue-500 text-sm hover:underline"
          >
            Enroll existing student
          </button>
        </div>
      )}
    </div>
  )}
</div>
              
{/* Student Projects Section */}
<div className="border-t border-gray-100">
  <button
    onClick={() => toggleCourseExpand(courseId, 'projects')}
    className="w-full p-3 flex justify-between items-center hover:bg-gray-50 transition-colors"
  >
    <div className="flex items-center gap-2">
      <FolderKanban size={16} className="text-purple-500" />
      <span className="font-medium text-gray-700">Student Projects ({course.submissionsCount || 0})</span>
    </div>
    {expandedCourse === courseId && expandedSection === 'projects' ? (
      <ChevronUp size={18} className="text-gray-400" />
    ) : (
      <ChevronDown size={18} className="text-gray-400" />
    )}
  </button>
  
  {expandedCourse === courseId && expandedSection === 'projects' && (
    <div className="p-4 bg-gray-50 border-t border-gray-100">
      {isLoadingProjects ? (
        <div className="flex justify-center py-8">
          <Loader className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : projects.length > 0 ? (
        <div className="space-y-2">
          {projects.map((project) => {
            const statusBadge = getStatusBadge(project.status);
            return (
              <div key={project._id} className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-sm transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-800">{project.title}</p>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>Student: {getStudentName(project)}</span>
                      <span>Submitted: {new Date(project.submittedAt).toLocaleDateString("en-US")}</span>
                      {project.grade && (
                        <span className="text-purple-600 font-medium">Grade: {project.grade}%</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/submissions?project=${project._id}`)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
                      title="View Project"
                    >
                      <Eye size={14} />
                    </button>
                    {!project.grade && (
                      <button
                        onClick={() => navigate(`/submissions?project=${project._id}&grade=true`)}
                        className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500"
                        title="Grade"
                      >
                        <Star size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 bg-white rounded-lg">
          <FolderKanban size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500">No student projects yet</p>
          <p className="text-xs text-gray-400 mt-1">Projects will appear when students submit assignments</p>
        </div>
      )}
    </div>
  )}
</div>
            </div>
          );
        })}

        {filteredCourses.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl">
            <BookOpen size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No courses found</p>
            {searchTerm ? (
              <button onClick={() => setSearchTerm('')} className="mt-2 text-blue-500 text-sm hover:underline">
                Clear search
              </button>
            ) : (
              <button onClick={() => setShowCreateModal(true)} className="mt-2 text-blue-500 text-sm hover:underline">
                Create your first course
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Course Modal - Keep existing */}
      {showCreateModal && (
        // ... existing create modal code ...
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Create New Course</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Name *</label>
                <input
                  type="text"
                  value={formData.courseName}
                  onChange={(e) => setFormData(prev => ({ ...prev, courseName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  placeholder="e.g., Web Development"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Code *</label>
                <input
                  type="text"
                  value={formData.courseCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, courseCode: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  placeholder="e.g., CS401"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  >
                    <option value="CS">CS</option><option value="IT">IT</option><option value="CT">CT</option><option value="EC">EC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  >
                    <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                  <input
                    type="text"
                    value={formData.section}
                    onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                    placeholder="A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credits</label>
                  <select
                    value={formData.credits}
                    onChange={(e) => setFormData(prev => ({ ...prev, credits: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  >
                    <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  >
                    {SEMESTER_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                  <select
                    value={formData.academicYear}
                    onChange={(e) => setFormData(prev => ({ ...prev, academicYear: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  >
                    <option value="2023-2024">2023-2024</option>
                    <option value="2024-2025">2024-2025</option>
                    <option value="2025-2026">2025-2026</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label>
                <input
                  type="text"
                  value={formData.schedule}
                  onChange={(e) => setFormData(prev => ({ ...prev, schedule: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>
            </div>
            <div className="border-t border-gray-100 p-4 flex gap-3">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 border rounded-xl">Cancel</button>
              <button onClick={handleCreateCourse} disabled={submitting} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl">
                {submitting ? <Loader className="animate-spin" /> : <Plus size={16} />} Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Modal - Keep existing */}
      {showEditModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-100 p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Edit Course</h2>
              <button onClick={() => setShowEditModal(false)}><X size={20} /></button>
            </div>
            <div className="p-4 space-y-3">
              <input type="text" placeholder="Course Name" value={formData.courseName} onChange={(e) => setFormData(prev => ({ ...prev, courseName: e.target.value }))} className="w-full px-3 py-2 border rounded-xl" />
              <input type="text" placeholder="Course Code" value={formData.courseCode} disabled className="w-full px-3 py-2 border rounded-xl bg-gray-50" />
              <select value={formData.department} onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))} className="w-full px-3 py-2 border rounded-xl">
                <option value="CS">CS</option><option value="IT">IT</option><option value="CT">CT</option><option value="EC">EC</option>
              </select>
              <select value={formData.year} onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))} className="w-full px-3 py-2 border rounded-xl">
                <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
              </select>
              <input type="text" placeholder="Section" value={formData.section} onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value.toUpperCase() }))} className="w-full px-3 py-2 border rounded-xl" />
              <select value={formData.credits} onChange={(e) => setFormData(prev => ({ ...prev, credits: e.target.value }))} className="w-full px-3 py-2 border rounded-xl">
                <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option>
              </select>
              <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 border rounded-xl" rows={2} />
            </div>
            <div className="border-t border-gray-100 p-4 flex gap-3">
              <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 border rounded-xl">Cancel</button>
              <button onClick={handleUpdateCourse} disabled={submitting} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl">
                {submitting ? <Loader className="animate-spin" /> : <Save size={16} />} Update
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
};

export default CoursesPage;