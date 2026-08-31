import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { aiAPI, assignmentAPI, courseAPI, projectAPI } from "../services/api";
import {
  getAssignmentTitle,
  getCourseName,
  getStudentName,
  getStudentRollId,
  getCourseId,
  getProjectOwnerId,
  toId
} from "../utils/projectHelpers";
import { exportSubmissions } from "../utils/exportSubmissions";
import ProjectDetailModal from "../components/ProjectDetailModal";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

import { 
  Clock, Search, Filter, X, Eye, CheckCircle, XCircle, RotateCcw, 
  Star, Calendar, User, BookOpen, Code, AlertTriangle, FileText,
  ChevronDown, ChevronUp, Download, RefreshCw, Loader,
  FileSpreadsheet, FileType,
  Award, MessageSquare, Zap, Shield, Mail, Copy, Check,
  FolderKanban, GraduationCap, BarChart3, TrendingUp,
  PieChart, Activity, Target, ThumbsUp, AlertOctagon, Sparkles,
  Brain, Microscope, Cpu, Heart, ShieldCheck
} from 'lucide-react';

const SubmissionsPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  // State Management
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('submissions');
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    status: '',
    department: '',
    year: '',
    courseId: '',
    assignmentId: '',
    search: ''
  });
  
  const [sortBy, setSortBy] = useState('submittedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('table');
  
  // AI Health Analysis
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [showAiAnalysisModal, setShowAiAnalysisModal] = useState(false);
  const [selectedProjectForAi, setSelectedProjectForAi] = useState(null);
  
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [studentFilterId, setStudentFilterId] = useState("");
  
  // Stats
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    pending: 0,
    graded: 0,
    approved: 0,
    revision: 0,
    rejected: 0,
    averageGrade: 0,
    completionRate: 0
  });

  // Helper Functions — imported from utils/projectHelpers.js

  // Load Data
  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    const status = searchParams.get("status");
    const projectId = searchParams.get("project");
    const courseId = searchParams.get("course");
    const studentId = searchParams.get("student");
    const assignmentId = searchParams.get("assignment");
    if (status) {
      setFilters((prev) => ({ ...prev, status }));
    }
    if (courseId) {
      setFilters((prev) => ({ ...prev, courseId }));
    }
    if (assignmentId) {
      setFilters((prev) => ({ ...prev, assignmentId }));
    }
    const search = searchParams.get("search");
    if (search) {
      setFilters((prev) => ({ ...prev, search }));
    }
    if (studentId) {
      setFilters((prev) => ({ ...prev, search: "" }));
      setStudentFilterId(studentId);
    }
    if (projectId && projects.length > 0) {
      const match = projects.find((p) => p._id === projectId);
      if (match) {
        setSelectedProject(match);
        setShowModal(true);
      }
    }
  }, [searchParams, projects]);

  useEffect(() => {
    const projectId = searchParams.get("project");
    if (!projectId || loading) return;

    const match = projects.find((p) => p._id === projectId);
    if (match) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await projectAPI.getProjectById(projectId);
        const project = res.data?.data;
        if (!cancelled && project) {
          setSelectedProject(project);
          setShowModal(true);
        }
      } catch (err) {
        console.error("Failed to load project from URL:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, projects, loading]);

  useEffect(() => {
    filterAndSortProjects();
  }, [projects, filters, sortBy, sortOrder, studentFilterId]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const coursesRes = await courseAPI.getMyCourses();
      setCourses(coursesRes.data.data || []);
      
      const projectsRes = await projectAPI.getMyProjects({ limit: 500 });
      const projectsData = projectsRes.data.data || [];
      setProjects(projectsData);
      
      calculateStats(projectsData);
      
      try {
        const assignmentsRes = await assignmentAPI.getMyAssignments();
        setAssignments(assignmentsRes.data.data || []);
      } catch (err) {
        console.log('Assignments API not ready');
        setAssignments([]);
      }
      
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // AI Health Analysis
  const analyzeProjectHealth = async (project) => {
    setSelectedProjectForAi(project);
    setAiAnalyzing(true);
    setShowAiAnalysisModal(true);
    setAiAnalysis(null);
    
    try {
      const healthRes = await projectAPI.getProjectHealth(project._id);
      const deps = healthRes.data.data?.dependencies || project.dependencies || [];

      if (!deps.length) {
        setAiAnalysis({
          healthScore: healthRes.data.data?.healthScore ?? null,
          recommendations: [
            {
              type: 'info',
              message: 'No dependency file found for this project.',
              action: 'Ask the student to upload package.json or requirements.txt.',
            },
          ],
        });
        return;
      }

      const response = await aiAPI.analyzeDependencies(deps);
      setAiAnalysis(response.data.data);
    } catch (error) {
      console.error('AI Analysis failed:', error);
      setAiAnalysis({
        healthScore: null,
        recommendations: [
          {
            type: 'error',
            message: error.response?.data?.message || 'Health check failed. Try again later.',
            action: '',
          },
        ],
      });
    } finally {
      setAiAnalyzing(false);
    }
  };

  const calculateStats = (projectsData) => {
    const graded = projectsData.filter(p => p.grade);
    const avgGrade = graded.length > 0 
      ? Math.round(graded.reduce((sum, p) => sum + (p.grade || 0), 0) / graded.length)
      : 0;
    const completed = projectsData.filter(p => p.status === 'approved' || p.status === 'graded').length;
    const completionRate = projectsData.length > 0 ? Math.round((completed / projectsData.length) * 100) : 0;
    
    setStats({
      totalSubmissions: projectsData.length,
      pending: projectsData.filter(p => p.status === 'pending').length,
      graded: graded.length,
      approved: projectsData.filter(p => p.status === 'approved').length,
      revision: projectsData.filter(p => p.status === 'revision').length,
      rejected: projectsData.filter(p => p.status === 'rejected').length,
      averageGrade: avgGrade,
      completionRate: completionRate
    });
  };

  const filterAndSortProjects = () => {
    let filtered = [...projects];

    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }
    if (filters.department) {
      filtered = filtered.filter(p => p.department === filters.department);
    }
    if (filters.year) {
      filtered = filtered.filter(p => p.year === parseInt(filters.year));
    }
    if (filters.courseId) {
      filtered = filtered.filter((p) => getCourseId(p) === toId(filters.courseId));
    }
    if (filters.assignmentId) {
      filtered = filtered.filter((p) => toId(p.assignmentId) === toId(filters.assignmentId));
    }
    if (studentFilterId) {
      filtered = filtered.filter((p) => getProjectOwnerId(p) === studentFilterId);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.title?.toLowerCase().includes(searchLower) ||
        getStudentName(p).toLowerCase().includes(searchLower) ||
        getCourseName(p).toLowerCase().includes(searchLower)
      );
    }

    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortBy === 'submittedAt') {
        aVal = new Date(a.submittedAt).getTime();
        bVal = new Date(b.submittedAt).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredProjects(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: "", department: "", year: "", courseId: "", assignmentId: "", search: ""
    });
    setStudentFilterId("");
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleBulkSelect = (projectId) => {
    setSelectedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProjects.length === filteredProjects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(filteredProjects.map(p => p._id));
    }
  };

  const getExportData = () => {
    if (selectedProjects.length > 0) {
      return filteredProjects.filter((p) => selectedProjects.includes(p._id));
    }
    return filteredProjects;
  };

  const handleExport = async (format) => {
    const data = getExportData();
    if (!data.length) {
      alert("No submissions to export. Adjust filters or select rows first.");
      return;
    }

    setExporting(true);
    setShowExportMenu(false);
    try {
      const ok = exportSubmissions(format, data, {
        filenamePrefix: "submissions",
        title: "Project Submissions Report",
        teacherName: user?.name || "Teacher"
      });
      if (!ok) alert("Export failed. Please try again.");
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending Review' },
      approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved' },
      rejected: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Rejected' },
      revision: { bg: 'bg-sky-100', text: 'text-sky-700', label: 'Revision Needed' },
      graded: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Graded' }
    };
    return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending': return <Clock size={14} />;
      case 'approved': return <CheckCircle size={14} />;
      case 'rejected': return <XCircle size={14} />;
      case 'revision': return <RotateCcw size={14} />;
      case 'graded': return <Star size={14} />;
      default: return null;
    }
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'bg-emerald-100 text-emerald-600';
    if (score >= 60) return 'bg-amber-100 text-amber-600';
    return 'bg-rose-100 text-rose-600';
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openProjectDetail = (project) => {
    setSelectedProject(project);
    setShowModal(true);
  };

  const handleStatusChange = async (projectId, newStatus, notes = '') => {
    try {
      switch(newStatus) {
        case 'approved':
          await projectAPI.approveProject(projectId, notes);
          break;
        case 'rejected':
          await projectAPI.rejectProject(projectId, notes);
          break;
        case 'revision':
          await projectAPI.requestRevision(projectId, notes);
          break;
        default:
          return;
      }
      await loadAllData();
      setShowModal(false);
      alert(`Project ${newStatus === 'approved' ? 'approved' : newStatus === 'rejected' ? 'rejected' : 'revision requested'} successfully!`);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update project status.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
          <Loader className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-400 w-6 h-6 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Submissions"
        subtitle="Review, analyze with AI, and grade student projects"
        icon={FolderKanban}
      >
        <button
          onClick={loadAllData}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition-all"
        >
          <RefreshCw size={16} /> Refresh
        </button>
        <div className="relative">
          <button
            onClick={() => setShowExportMenu((v) => !v)}
            disabled={exporting || filteredProjects.length === 0}
            className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2 transition-all"
          >
            {exporting ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
            Export
            <ChevronDown size={14} />
          </button>
          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                <p className="px-3 py-2 text-xs text-gray-400 border-b border-gray-100">
                  {selectedProjects.length > 0
                    ? `${selectedProjects.length} selected`
                    : `${filteredProjects.length} filtered`}
                </p>
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <FileText size={16} className="text-emerald-600" />
                  Export as CSV
                </button>
                <button
                  onClick={() => handleExport("excel")}
                  className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <FileSpreadsheet size={16} className="text-green-600" />
                  Export as Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <FileType size={16} className="text-red-600" />
                  Export as PDF
                </button>
              </div>
            </>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={stats.totalSubmissions} icon={FolderKanban} iconColor="blue" cardClass="cute-card cute-card-blue p-4" />
        <StatCard label="Pending Review" value={stats.pending} note="To review" icon={Clock} iconColor="amber" cardClass="cute-card cute-card-amber p-4" />
        <StatCard label="Graded" value={stats.graded} note="Completed" icon={CheckCircle} iconColor="purple" cardClass="cute-card cute-card-purple p-4" />
        <StatCard label="Avg Grade" value={`${stats.averageGrade}%`} note={`${stats.completionRate}% completion`} icon={Award} iconColor="yellow" cardClass="cute-card cute-card-amber p-4" />
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by title, student name, or course..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm"
          >
            <option value="">All Status</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="revision">Revision Needed</option>
            <option value="graded">Graded</option>
          </select>

          <select
            value={filters.courseId}
            onChange={(e) => handleFilterChange('courseId', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm"
          >
            <option value="">All Courses</option>
            {courses.map(course => (
              <option key={course._id} value={course._id}>{course.courseName || course.name}</option>
            ))}
          </select>

          <select
            value={filters.assignmentId}
            onChange={(e) => handleFilterChange('assignmentId', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm"
          >
            <option value="">All Assignments</option>
            {assignments.map(assignment => (
              <option key={assignment._id} value={assignment._id}>{assignment.title}</option>
            ))}
          </select>

          {(filters.status || filters.courseId || filters.assignmentId || filters.search || studentFilterId) && (
            <button onClick={clearFilters} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl text-sm flex items-center gap-1">
              <X size={14} /> Clear
            </button>
          )}
        </div>

        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {['table', 'compact'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-md text-xs capitalize transition-all ${
                  viewMode === mode ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                }`}
              >
                {mode === 'table' ? 'Table View' : 'Compact View'}
              </button>
            ))}
            </div>
            <span className="text-xs text-gray-500">
              Showing {filteredProjects.length} of {projects.length} submissions
            </span>
          </div>
          
          {selectedProjects.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{selectedProjects.length} selected</span>
              <button className="px-2 py-1 bg-purple-100 text-purple-600 rounded-lg text-xs">Grade Selected</button>
            </div>
          )}
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" onChange={handleSelectAll} className="rounded border-gray-300" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('submittedAt')}>
                  Date <SortIcon field="submittedAt" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('grade')}>
                  Grade <SortIcon field="grade" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProjects.map((project) => {
                const statusStyle = getStatusBadge(project.status);
                return (
                  <tr key={project._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedProjects.includes(project._id)}
                        onChange={() => handleBulkSelect(project._id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 text-sm line-clamp-1">{project.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {getStudentName(project).charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{getStudentName(project)}</p>
                          <p className="text-xs text-gray-400">{getStudentRollId(project)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{getAssignmentTitle(project)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(project.submittedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {project.grade ? (
                        <div className="text-center">
                          <span className="text-base font-bold text-purple-600">{project.grade}%</span>
                          <div className="w-full h-1 bg-gray-100 rounded-full mt-1">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${project.grade}%` }} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                        {getStatusIcon(project.status)}
                        {statusStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => analyzeProjectHealth(project)}
                          className="p-1.5 rounded-lg hover:bg-green-50 text-green-500"
                          title="AI Health Check"
                        >
                          <Brain size={16} />
                        </button>
                        <button
                          onClick={() => openProjectDetail(project)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openProjectDetail(project)}
                          className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500"
                          title="Grade with Criteria"
                        >
                          <Star size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <Filter size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No projects found</p>
            <button onClick={clearFilters} className="mt-2 text-blue-500 text-sm hover:underline">Clear filters</button>
          </div>
        )}
      </div>

      {/* AI Health Analysis Modal */}
      {showAiAnalysisModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAiAnalysisModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Brain size={20} className="text-green-500" />
                <h2 className="text-lg font-bold text-gray-800">AI Health Analysis</h2>
              </div>
              <button onClick={() => setShowAiAnalysisModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="font-medium text-gray-800">{selectedProjectForAi?.title}</p>
                <p className="text-sm text-gray-500">Student: {getStudentName(selectedProjectForAi)}</p>
              </div>

              {aiAnalyzing ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                  <p className="text-gray-500">AI is analyzing project dependencies...</p>
                  <p className="text-xs text-gray-400 mt-2">Checking for deprecated libraries and security issues</p>
                </div>
              ) : aiAnalysis ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getHealthScoreColor(aiAnalysis.healthScore)} mb-2`}>
                      <span className="text-2xl font-bold">{aiAnalysis.healthScore}%</span>
                    </div>
                    <p className="text-sm text-gray-600">Code Health Score</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-amber-500" />
                      AI Recommendations
                    </h3>
                    <div className="space-y-3">
                      {aiAnalysis.recommendations?.map((rec, idx) => (
                        <div key={idx} className={`p-3 rounded-xl border ${
                          rec.type === 'critical' ? 'bg-red-50 border-red-200' :
                          rec.type === 'high' ? 'bg-orange-50 border-orange-200' :
                          rec.type === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                          rec.type === 'low' ? 'bg-blue-50 border-blue-200' :
                          'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-start gap-2">
                            <AlertTriangle size={16} className={
                              rec.type === 'critical' ? 'text-red-500' :
                              rec.type === 'high' ? 'text-orange-500' :
                              rec.type === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                            } />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800">{rec.message}</p>
                              {rec.action && (
                                <p className="text-xs text-gray-500 mt-1 font-mono">💡 {rec.action}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {showModal && selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => {
            setShowModal(false);
            setSelectedProject(null);
          }}
          onRefresh={loadAllData}
          onAnalyzeHealth={(p) => {
            setShowModal(false);
            analyzeProjectHealth(p);
          }}
          onStatusChange={async (id, status, notes) => {
            await handleStatusChange(id, status, notes);
            await loadAllData();
            try {
              const res = await projectAPI.getProjectById(id);
              setSelectedProject(res.data.data);
            } catch {
              setShowModal(false);
            }
          }}
        />
      )}
    </div>
  );
};

export default SubmissionsPage;