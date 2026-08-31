import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import IconGlass from "../components/IconGlass";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { projectAPI } from "../services/api";

import { 
  FolderKanban, Search, Filter, Eye, Star, Clock, 
  CheckCircle, XCircle, AlertCircle, Loader, RefreshCw,
  Calendar, FileText, Download, ChevronRight, Award,
  TrendingUp, BarChart3, PieChart, Activity, Sparkles,
  ThumbsUp, ThumbsDown, MessageSquare, Zap, Sliders
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart as RePieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const MyProjects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    graded: 0,
    approved: 0,
    revision: 0,
    rejected: 0,
    averageGrade: 0,
    completionRate: 0
  });
  const [gradeDistribution, setGradeDistribution] = useState([]);
  const [monthlyActivity, setMonthlyActivity] = useState([]);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, statusFilter]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await projectAPI.getMyProjects({ limit: 100 });
      const projectsData = res.data.data || [];
      setProjects(projectsData);
      calculateStats(projectsData);
      calculateGradeDistribution(projectsData);
      calculateMonthlyActivity(projectsData);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (projectsData) => {
    const graded = projectsData.filter(p => p.grade);
    const avgGrade = graded.length > 0 
      ? Math.round(graded.reduce((sum, p) => sum + p.grade, 0) / graded.length)
      : 0;
    const completed = projectsData.filter(p => p.status === 'approved' || p.status === 'graded').length;
    const completionRate = projectsData.length > 0 ? Math.round((completed / projectsData.length) * 100) : 0;
    
    setStats({
      total: projectsData.length,
      pending: projectsData.filter(p => p.status === 'pending').length,
      graded: graded.length,
      approved: projectsData.filter(p => p.status === 'approved').length,
      revision: projectsData.filter(p => p.status === 'revision').length,
      rejected: projectsData.filter(p => p.status === 'rejected').length,
      averageGrade: avgGrade,
      completionRate: completionRate
    });
  };

  const calculateGradeDistribution = (projectsData) => {
    const graded = projectsData.filter(p => p.grade);
    const distribution = [
      { range: '90-100%', count: graded.filter(p => p.grade >= 90).length, color: '#10b981' },
      { range: '80-89%', count: graded.filter(p => p.grade >= 80 && p.grade < 90).length, color: '#3b82f6' },
      { range: '70-79%', count: graded.filter(p => p.grade >= 70 && p.grade < 80).length, color: '#f59e0b' },
      { range: '60-69%', count: graded.filter(p => p.grade >= 60 && p.grade < 70).length, color: '#f97316' },
      { range: 'Below 60%', count: graded.filter(p => p.grade < 60).length, color: '#ef4444' }
    ];
    setGradeDistribution(distribution);
  };

  const calculateMonthlyActivity = (projectsData) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = months.map((month, idx) => ({
      name: month,
      submissions: projectsData.filter(p => p.submittedAt && new Date(p.submittedAt).getMonth() === idx).length,
      graded: projectsData.filter(p => p.grade && new Date(p.submittedAt).getMonth() === idx).length
    }));
    setMonthlyActivity(monthlyData);
  };

  const filterProjects = () => {
    let filtered = [...projects];
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.courseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.assignmentTitle?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    setFilteredProjects(filtered);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending Review', icon: <Clock size={12} /> },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Submitted', icon: <FileText size={12} /> },
      graded: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Graded', icon: <Star size={12} /> },
      approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved', icon: <CheckCircle size={12} /> },
      rejected: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Rejected', icon: <XCircle size={12} /> },
      revision: { bg: 'bg-sky-100', text: 'text-sky-700', label: 'Revision Needed', icon: <AlertCircle size={12} /> }
    };
    return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status, icon: null };
  };

  const handleViewProject = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const handleUploadProject = () => {
    navigate('/projects/upload');
  };

  const exportToCSV = () => {
    const headers = ['Project Title', 'Course', 'Status', 'Grade', 'Submitted Date', 'Feedback'];
    const rows = filteredProjects.map(p => [
      p.title,
      p.courseName || 'N/A',
      p.status,
      p.grade || 'Not Graded',
      new Date(p.submittedAt).toLocaleDateString(),
      p.feedback || ''
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-projects-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div>
          <FolderKanban className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-emerald-400 w-6 h-6 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Projects"
        subtitle="Track and manage all your project submissions"
        icon={FolderKanban}
      >
        <button
          onClick={loadProjects}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          title="Refresh"
        >
          <IconGlass interactive className="text-emerald-600"><RefreshCw size={17} /></IconGlass>
        </button>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-emerald-600 transition-all"
        >
          <Download size={16} /> Export CSV
        </button>
        <button
          onClick={handleUploadProject}
          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:from-emerald-600 hover:to-teal-600 transition-all"
        >
          <FileText size={16} /> Upload New Project
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={stats.total} icon={FolderKanban} iconColor="emerald" cardClass="cute-card cute-card-emerald p-4" />
        <StatCard label="Pending Review" value={stats.pending} icon={Clock} iconColor="amber" cardClass="cute-card cute-card-amber p-4" />
        <StatCard label="Graded" value={stats.graded} icon={Star} iconColor="purple" cardClass="cute-card cute-card-purple p-4" />
        <StatCard label="Avg Grade" value={`${stats.averageGrade}%`} note={`${stats.completionRate}% completion`} icon={Award} iconColor="teal" cardClass="cute-card cute-card-teal p-4" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending Review</option>
            <option value="submitted">Submitted</option>
            <option value="graded">Graded</option>
            <option value="approved">Approved</option>
            <option value="revision">Revision Needed</option>
            <option value="rejected">Rejected</option>
          </select>
          
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all ${
                viewMode === 'table' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500'
              }`}
            >
              <FileText size={14} /> Table
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all ${
                viewMode === 'grid' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500'
              }`}
            >
              <FolderKanban size={14} /> Cards
            </button>
          </div>
        </div>
        
        <div className="relative flex-1 max-w-md w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by title, description, or course..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
      </div>

      {/* Projects Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProjects.map((project) => {
                const statusBadge = getStatusBadge(project.status);
                return (
                  <tr key={project._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{project.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{project.description}</p>
                      {project.gradingCriteria?.hasCriteria && (
                        <span className="inline-flex items-center gap-1 mt-1 text-xs text-emerald-600">
                          <Sliders size={11} />
                          {project.gradingCriteria.count} criteria
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{project.assignmentTitle || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{project.courseName || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(project.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                        {statusBadge.icon}
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {project.grade ? (
                        <div>
                          <span className="text-sm font-semibold text-purple-600">{project.grade}%</span>
                          {project.criterionScoreCount > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {project.criterionScoreCount} criteria scored
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleViewProject(project._id)}
                        className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500 transition-colors"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <FolderKanban size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No projects found</p>
              <button onClick={handleUploadProject} className="mt-2 text-emerald-500 text-sm hover:underline">
                Upload your first project
              </button>
            </div>
          )}
        </div>
      )}

      {/* Projects Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const statusBadge = getStatusBadge(project.status);
            return (
              <div key={project._id} className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100 hover:shadow-md transition-all cursor-pointer group" onClick={() => handleViewProject(project._id)}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <IconGlass size="md" tone="dark" className="bg-gradient-to-r from-emerald-500/80 to-teal-500/80 text-white">
                      <FileText size={18} className="text-white" />
                    </IconGlass>
                    <div>
                      <h3 className="font-semibold text-gray-800 group-hover:text-emerald-600 transition-colors">{project.title}</h3>
                      <p className="text-xs text-gray-500">{project.assignmentTitle || 'No assignment'}</p>
                      <p className="text-xs text-gray-400">{project.courseName || 'N/A'}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                    {statusBadge.icon}
                    {statusBadge.label}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">{project.description}</p>

                {project.gradingCriteria?.hasCriteria && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mb-3">
                    <Sliders size={12} />
                    Graded on {project.gradingCriteria.count} criteria · pass {project.gradingCriteria.passingGrade}%
                  </p>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> {new Date(project.submittedAt).toLocaleDateString()}
                  </span>
                  {project.grade && (
                    <span className="flex items-center gap-1 text-purple-600">
                      <Star size={12} /> {project.grade}%
                      {project.criterionScoreCount > 0 && (
                        <span className="text-gray-400">({project.criterionScoreCount} criteria)</span>
                      )}
                    </span>
                  )}
                </div>
                
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewProject(project._id);
                    }}
                    className="flex-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-sm hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <Eye size={14} /> View Details
                  </button>
                </div>
              </div>
            );
          })}
          
          {filteredProjects.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl">
              <FolderKanban size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No projects found</p>
              <button onClick={handleUploadProject} className="mt-2 text-emerald-500 text-sm hover:underline">
                Upload your first project
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyProjects;  // ✅ Make sure this line exists at the end