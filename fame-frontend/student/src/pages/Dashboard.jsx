import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import IconGlass from "../components/IconGlass";
import { courseAPI, projectAPI } from "../services/api";

import { 
  BookOpen, FolderKanban, Star, TrendingUp, Calendar, 
  Clock, CheckCircle, Award, Sparkles, Users, FileText,
  MessageSquare, Bell, Activity, PieChart, BarChart3,
  ChevronRight, Eye, Download, Zap, Target, Trophy, Upload
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart as RePieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalProjects: 0,
    averageGrade: 0,
    pendingProjects: 0,
    gradedProjects: 0,
    approvedProjects: 0,
    revisionProjects: 0,
    completionRate: 0
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const [gradeDistribution, setGradeDistribution] = useState([]);
  const [monthlyActivity, setMonthlyActivity] = useState([]);
  const [topCourses, setTopCourses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [coursesRes, projectsRes] = await Promise.all([
        courseAPI.getMyCourses(),
        projectAPI.getMyProjects({ limit: 100 })
      ]);
      
      const courses = coursesRes.data.data || [];
      const projects = projectsRes.data.data || [];
      
      // Calculate stats
      const gradedProjects = projects.filter(p => p.grade);
      const avgGrade = gradedProjects.length > 0 
        ? Math.round(gradedProjects.reduce((sum, p) => sum + p.grade, 0) / gradedProjects.length)
        : 0;
      const completedProjects = projects.filter(p => p.status === 'approved' || p.status === 'graded').length;
      const completionRate = projects.length > 0 ? Math.round((completedProjects / projects.length) * 100) : 0;
      
      setStats({
        totalCourses: courses.length,
        totalProjects: projects.length,
        averageGrade: avgGrade,
        pendingProjects: projects.filter(p => p.status === 'pending').length,
        gradedProjects: gradedProjects.length,
        approvedProjects: projects.filter(p => p.status === 'approved').length,
        revisionProjects: projects.filter(p => p.status === 'revision').length,
        completionRate: completionRate
      });
      
      setRecentProjects(projects.slice(0, 5));
      
      // Grade distribution
      const gradeRanges = [
        { range: '90-100%', count: projects.filter(p => p.grade >= 90).length, color: '#10b981' },
        { range: '80-89%', count: projects.filter(p => p.grade >= 80 && p.grade < 90).length, color: '#3b82f6' },
        { range: '70-79%', count: projects.filter(p => p.grade >= 70 && p.grade < 80).length, color: '#f59e0b' },
        { range: '60-69%', count: projects.filter(p => p.grade >= 60 && p.grade < 70).length, color: '#f97316' },
        { range: 'Below 60%', count: projects.filter(p => p.grade < 60).length, color: '#ef4444' }
      ];
      setGradeDistribution(gradeRanges);
      
      // Monthly activity
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyData = months.map((month, idx) => ({
        name: month,
        submissions: projects.filter(p => p.submittedAt && new Date(p.submittedAt).getMonth() === idx).length,
        graded: projects.filter(p => p.grade && new Date(p.submittedAt).getMonth() === idx).length
      }));
      setMonthlyActivity(monthlyData);
      
      // Top courses by performance
      const courseStats = await Promise.all(courses.map(async (course) => {
        const assignmentsRes = await courseAPI.getAssignmentsByCourse(course._id);
        const assignments = assignmentsRes.data.data || [];
        return {
          name: course.courseName,
          code: course.courseCode,
          assignmentCount: assignments.length
        };
      }));
      setTopCourses(courseStats.slice(0, 3));
      
      // Get upcoming assignments
      let allAssignments = [];
      for (const course of courses.slice(0, 5)) {
        try {
          const assignmentsRes = await courseAPI.getAssignmentsByCourse(course._id);
          const assignments = assignmentsRes.data.data || [];
          const upcoming = assignments.filter(a => new Date(a.dueDate) > new Date())
            .map(a => ({ ...a, courseName: course.courseName }))
            .slice(0, 3);
          allAssignments = [...allAssignments, ...upcoming];
        } catch (e) {}
      }
      setUpcomingAssignments(allAssignments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 5));
      
      // Notifications
      const newNotifs = [];
      if (stats.pendingProjects > 0) {
        newNotifs.push({ id: 1, title: 'Projects Pending', message: `You have ${stats.pendingProjects} project(s) pending review`, time: 'Just now', type: 'warning' });
      }
      if (upcomingAssignments.length > 0) {
        newNotifs.push({ id: 2, title: 'Upcoming Deadlines', message: `${upcomingAssignments.length} assignment(s) due soon`, time: 'Just now', type: 'info' });
      }
      if (stats.revisionProjects > 0) {
        newNotifs.push({ id: 3, title: 'Revisions Needed', message: `${stats.revisionProjects} project(s) need revision`, time: 'Just now', type: 'error' });
      }
      setNotifications(newNotifs);
      
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProject = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const handleUploadProject = () => {
    navigate('/projects/upload');
  };

  const cardColors = [
    { bg: 'from-[#D1FAE5] to-[#A7F3D0]', border: 'border-[#A7F3D0]', text: 'text-[#047857]', iconColor: 'text-[#059669]' },
    { bg: 'from-[#DBEAFE] to-[#BFDBFE]', border: 'border-[#BFDBFE]', text: 'text-[#1E40AF]', iconColor: 'text-[#2563EB]' },
    { bg: 'from-[#FEF3C7] to-[#FDE68A]', border: 'border-[#FDE68A]', text: 'text-[#B45309]', iconColor: 'text-[#D97706]' },
    { bg: 'from-[#EDE9FE] to-[#DDD6FE]', border: 'border-[#DDD6FE]', text: 'text-[#5B21B6]', iconColor: 'text-[#7C3AED]' },
  ];

  const statCards = [
    { title: 'Enrolled Courses', value: stats.totalCourses, icon: BookOpen },
    { title: 'Projects Submitted', value: stats.totalProjects, icon: FolderKanban },
    { title: 'Average Grade', value: `${stats.averageGrade}%`, icon: Star },
    { title: 'Completion Rate', value: `${stats.completionRate}%`, icon: Target },
  ];

  const quickActions = [
    { label: 'My Courses', desc: `${stats.totalCourses} enrolled`, icon: BookOpen, path: '/my-courses', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { label: 'Upload Project', desc: 'Submit new work', icon: Upload, path: '/projects/upload', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { label: 'My Projects', desc: `${stats.totalProjects} total`, icon: FolderKanban, path: '/my-projects', color: 'bg-purple-50 text-purple-600 border-purple-100' },
    { label: 'Feedback', desc: 'View reviews', icon: MessageSquare, path: '/feedback', color: 'bg-amber-50 text-amber-600 border-amber-100' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div>
          <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-emerald-400 w-6 h-6 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#ECFDF5] to-[#D1FAE5] rounded-2xl p-6 border border-[#A7F3D0] relative">
        <div className="flex items-center gap-3 mb-2">
          <IconGlass size="md" tone="dark" className="bg-gradient-to-r from-emerald-500/80 to-teal-500/80 text-white">
            <Trophy size={20} />
          </IconGlass>
          <div>
            <h1 className="text-xl font-semibold text-[#065F46]">Welcome back, {user?.name?.split(' ')[0] || 'Student'}!</h1>
            <p className="text-[#059669] text-sm mt-1">Track your academic journey and showcase your work</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <div className="flex items-center gap-2 bg-white/60 rounded-full px-3 py-1 text-[#047857]">
            <Zap size={14} />
            <span className="text-sm">Completion: {stats.completionRate}%</span>
          </div>
          <div className="flex items-center gap-2 bg-white/60 rounded-full px-3 py-1 text-[#047857]">
            <Star size={14} />
            <span className="text-sm">Avg Grade: {stats.averageGrade}%</span>
          </div>
          <div className="flex items-center gap-2 bg-white/60 rounded-full px-3 py-1 text-[#047857]">
            <FolderKanban size={14} />
            <span className="text-sm">{stats.totalProjects} Projects</span>
          </div>
        </div>
        <button
          onClick={handleUploadProject}
          className="absolute top-4 right-4 px-3 py-1.5 bg-white/70 border border-[#A7F3D0] rounded-xl text-sm font-medium text-[#047857] hover:bg-white transition-all flex items-center gap-2"
        >
          <FileText size={14} /> Upload Project
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, index) => {
          const colors = cardColors[index % cardColors.length];
          return (
            <div key={index} className={`bg-gradient-to-br ${colors.bg} rounded-2xl p-5 border ${colors.border} shadow-sm hover:shadow-md transition-all duration-300`}>
              <div className="flex justify-between items-start mb-3">
                <IconGlass size="md" interactive className={colors.iconColor}>
                  <card.icon size={20} />
                </IconGlass>
                <TrendingUp size={14} className="text-green-500" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800">{card.value}</h3>
              <p className={`text-sm mt-1 ${colors.text}`}>{card.title}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Distribution */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={18} className="text-purple-500" />
            <h2 className="font-semibold text-gray-800">Grade Distribution</h2>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <RePieChart>
              <Pie
                data={gradeDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="count"
                label={({ range, percent }) => `${range} (${(percent * 100).toFixed(0)}%)`}
              >
                {gradeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Legend />
            </RePieChart>
          </ResponsiveContainer>
          <div className="mt-3 text-center text-sm text-gray-500">
            Based on {stats.gradedProjects} graded projects
          </div>
        </div>

        {/* Monthly Activity */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-emerald-500" />
            <h2 className="font-semibold text-gray-800">Monthly Activity</h2>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyActivity}>
              <defs>
                <linearGradient id="submissionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Legend />
              <Area type="monotone" dataKey="submissions" stroke="#10b981" fill="url(#submissionGradient)" name="Submissions" />
              <Area type="monotone" dataKey="graded" stroke="#8b5cf6" fill="none" name="Graded" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Notifications Section */}
      {notifications.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} className="text-amber-500" />
            <h2 className="font-semibold text-gray-800">Notifications</h2>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{notifications.length} new</span>
          </div>
          <div className="space-y-2">
            {notifications.map(notif => (
              <div key={notif.id} className={`p-3 rounded-xl flex items-start gap-3 ${
                notif.type === 'warning' ? 'bg-amber-50 border border-amber-100' :
                notif.type === 'error' ? 'bg-rose-50 border border-rose-100' :
                'bg-blue-50 border border-blue-100'
              }`}>
                <div className={`w-2 h-2 mt-2 rounded-full ${
                  notif.type === 'warning' ? 'bg-amber-500' :
                  notif.type === 'error' ? 'bg-rose-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{notif.title}</p>
                  <p className="text-xs text-gray-500">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Projects & Upcoming Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <FolderKanban size={18} className="text-emerald-500" />
              <h2 className="font-semibold text-gray-800">Recent Projects</h2>
            </div>
            <button onClick={() => navigate('/my-projects')} className="text-xs text-emerald-500 hover:underline flex items-center gap-1">
              View All <ChevronRight size={12} />
            </button>
          </div>
          {recentProjects.length > 0 ? (
            <div className="space-y-3">
              {recentProjects.map((project) => (
                <div key={project._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all cursor-pointer group" onClick={() => handleViewProject(project._id)}>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 group-hover:text-emerald-600 transition-colors">{project.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-gray-500">Submitted: {new Date(project.submittedAt).toLocaleDateString()}</p>
                      {project.grade && <span className="text-xs text-purple-600">Grade: {project.grade}%</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {project.grade ? (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        {project.grade}%
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                        Pending
                      </span>
                    )}
                    <Eye size={16} className="text-gray-400 group-hover:text-emerald-500 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FolderKanban size={48} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">No projects submitted yet</p>
              <button onClick={handleUploadProject} className="mt-2 text-emerald-500 text-sm hover:underline">
                Upload your first project
              </button>
            </div>
          )}
        </div>

        {/* Upcoming Assignments */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-emerald-500" />
              <h2 className="font-semibold text-gray-800">Upcoming Deadlines</h2>
            </div>
            <button onClick={() => navigate('/my-courses')} className="text-xs text-emerald-500 hover:underline flex items-center gap-1">
              View All Courses <ChevronRight size={12} />
            </button>
          </div>
          {upcomingAssignments.length > 0 ? (
            <div className="space-y-3">
              {upcomingAssignments.map((assignment, idx) => {
                const daysLeft = Math.ceil((new Date(assignment.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
                const isUrgent = daysLeft <= 3;
                return (
                  <div key={idx} className={`flex justify-between items-center p-3 rounded-xl transition-all ${
                    isUrgent ? 'bg-rose-50 border border-rose-100' : 'bg-gray-50'
                  }`}>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{assignment.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{assignment.courseName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={12} className="text-amber-500" />
                        <p className={`text-xs ${isUrgent ? 'text-rose-600 font-medium' : 'text-gray-500'}`}>
                          Due: {new Date(assignment.dueDate).toLocaleDateString()}
                          {daysLeft > 0 && ` (${daysLeft} days left)`}
                        </p>
                      </div>
                    </div>
                    {isUrgent && (
                      <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-medium animate-pulse">
                        Urgent
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar size={48} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">No upcoming assignments</p>
              <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className={`flex items-center gap-3 p-4 rounded-xl border ${action.color} hover:shadow-md transition-all group text-left w-full`}
          >
            <IconGlass size="md" interactive>
              <action.icon size={20} />
            </IconGlass>
            <div className="min-w-0">
              <p className="font-semibold text-sm">{action.label}</p>
              <p className="text-xs opacity-70 truncate">{action.desc}</p>
            </div>
            <ChevronRight size={16} className="ml-auto opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;