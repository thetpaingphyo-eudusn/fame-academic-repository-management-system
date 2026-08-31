import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import IconGlass from "../components/IconGlass";
import { courseAPI, dashboardAPI, projectAPI, studentAPI } from "../services/api";
import { getCourseName, getStudentName, matchesCourse } from "../utils/projectHelpers";

import {
  Star, FolderKanban, Clock, CheckCircle, RotateCcw, Award, BookOpen,
  Sparkles, Users, Eye, BarChart3, PieChart as PieChartIcon, Activity,
  RefreshCw, FileText, GraduationCap, Trophy, AlertCircle, ChevronRight,
  ClipboardCheck, TrendingUp, ArrowRight
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";

const STATUS_LABELS = {
  pending: "Awaiting Review",
  approved: "Approved",
  revision: "Revision Requested",
  graded: "Graded",
  rejected: "Rejected"
};

const STATUS_BADGE = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  revision: "bg-sky-100 text-sky-700",
  graded: "bg-purple-100 text-purple-700",
  rejected: "bg-red-100 text-red-700"
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    pendingProjects: 0,
    approvedProjects: 0,
    revisionProjects: 0,
    gradedProjects: 0,
    rejectedProjects: 0,
    totalCourses: 0,
    totalStudents: 0,
    averageGrade: 0,
    completionRate: 0
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [gradeDistribution, setGradeDistribution] = useState([]);
  const [chartType, setChartType] = useState("area");
  const [projects, setProjects] = useState([]);
  const [courseOverview, setCourseOverview] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, projectsRes, studentsRes, coursesRes] = await Promise.all([
        dashboardAPI.getTeacherDashboard(),
        projectAPI.getMyProjects({ limit: 200 }),
        studentAPI.getAllStudents(),
        courseAPI.getMyCourses()
      ]);

      const dash = dashboardRes.data.data || {};
      const projectsData = projectsRes.data.data || [];
      const coursesData = coursesRes.data.data || [];

      setProjects(projectsData);

      const gradedProjectsList = projectsData.filter(
        (p) => p.grade !== null && p.grade !== undefined
      );
      const avgGrade =
        dash.averageGrade != null
          ? Math.round(dash.averageGrade)
          : gradedProjectsList.length > 0
            ? Math.round(
                gradedProjectsList.reduce((sum, p) => sum + p.grade, 0) /
                  gradedProjectsList.length
              )
            : 0;

      const completedProjects = projectsData.filter(
        (p) => p.status === "approved" || p.status === "graded"
      ).length;
      const completionRate =
        projectsData.length > 0
          ? Math.round((completedProjects / projectsData.length) * 100)
          : 0;

      setStats({
        totalProjects: dash.totalProjects ?? projectsData.length,
        pendingProjects:
          dash.pendingCount ??
          projectsData.filter((p) => p.status === "pending").length,
        approvedProjects: projectsData.filter((p) => p.status === "approved").length,
        revisionProjects:
          dash.revisionCount ??
          projectsData.filter((p) => p.status === "revision").length,
        gradedProjects: dash.gradedCount ?? gradedProjectsList.length,
        rejectedProjects: projectsData.filter((p) => p.status === "rejected").length,
        totalCourses: dash.courseCount ?? coursesData.length,
        totalStudents: studentsRes.data.data?.length ?? 0,
        averageGrade: avgGrade,
        completionRate
      });

      const overview = coursesData.map((course) => {
        const courseProjects = projectsData.filter((p) => matchesCourse(p, course._id));
        const pending = courseProjects.filter((p) => p.status === "pending").length;
        const graded = courseProjects.filter((p) => p.grade != null);
        const courseAvg =
          graded.length > 0
            ? Math.round(graded.reduce((s, p) => s + p.grade, 0) / graded.length)
            : null;
        return {
          _id: course._id,
          name: course.courseName || course.name,
          code: course.courseCode || course.code,
          totalProjects: courseProjects.length,
          pending,
          avgGrade: courseAvg
        };
      });
      setCourseOverview(overview);

      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];
      setMonthlyData(
        months.map((month, idx) => ({
          name: month,
          submissions: projectsData.filter(
            (p) => p.submittedAt && new Date(p.submittedAt).getMonth() === idx
          ).length
        }))
      );

      setStatusData(
        [
          { name: "Pending", value: projectsData.filter((p) => p.status === "pending").length, color: "#f59e0b" },
          { name: "Approved", value: projectsData.filter((p) => p.status === "approved").length, color: "#10b981" },
          { name: "Revision", value: projectsData.filter((p) => p.status === "revision").length, color: "#3b82f6" },
          { name: "Graded", value: projectsData.filter((p) => p.status === "graded").length, color: "#8b5cf6" },
          { name: "Rejected", value: projectsData.filter((p) => p.status === "rejected").length, color: "#ef4444" }
        ].filter((s) => s.value > 0)
      );

      const grades = {
        "90-100%": gradedProjectsList.filter((p) => p.grade >= 90).length,
        "80-89%": gradedProjectsList.filter((p) => p.grade >= 80 && p.grade < 90).length,
        "70-79%": gradedProjectsList.filter((p) => p.grade >= 70 && p.grade < 80).length,
        "60-69%": gradedProjectsList.filter((p) => p.grade >= 60 && p.grade < 70).length,
        "Below 60%": gradedProjectsList.filter((p) => p.grade < 60).length
      };
      setGradeDistribution(
        Object.entries(grades).map(([range, count]) => ({ range, count }))
      );

      const sorted = [...projectsData].sort(
        (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
      );
      const source = dash.recentSubmissions?.length ? dash.recentSubmissions : sorted;

      setRecentActivity(
        source.slice(0, 5).map((p) => ({
          id: p._id,
          title: p.title,
          status: p.status,
          date: p.submittedAt,
          studentName: getStudentName(p),
          courseName: getCourseName(p)
        }))
      );

      setPendingReviews(
        sorted
          .filter((p) => p.status === "pending" || p.status === "revision")
          .slice(0, 5)
      );
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock size={12} className="text-amber-500" />;
      case "approved":
        return <CheckCircle size={12} className="text-emerald-500" />;
      case "revision":
        return <RotateCcw size={12} className="text-sky-500" />;
      case "graded":
        return <Star size={12} className="text-purple-500" />;
      default:
        return <FileText size={12} className="text-gray-400" />;
    }
  };

  const cardColors = [
    { bg: 'from-[#DBEAFE] to-[#BFDBFE]', border: 'border-[#BFDBFE]', text: 'text-[#1E40AF]', iconColor: 'text-[#2563EB]' },
    { bg: 'from-[#FEF3C7] to-[#FDE68A]', border: 'border-[#FDE68A]', text: 'text-[#B45309]', iconColor: 'text-[#D97706]' },
    { bg: 'from-[#D1FAE5] to-[#A7F3D0]', border: 'border-[#A7F3D0]', text: 'text-[#047857]', iconColor: 'text-[#059669]' },
    { bg: 'from-[#EDE9FE] to-[#DDD6FE]', border: 'border-[#DDD6FE]', text: 'text-[#5B21B6]', iconColor: 'text-[#7C3AED]' },
  ];

  const statCards = [
    { title: "Total Submissions", value: stats.totalProjects, icon: FolderKanban, path: "/submissions" },
    { title: "Awaiting Review", value: stats.pendingProjects, icon: Clock, path: "/submissions?status=pending" },
    { title: "My Courses", value: stats.totalCourses, icon: BookOpen, path: "/courses" },
    { title: "Average Grade", value: `${stats.averageGrade}%`, icon: Star, path: "/analytics" },
  ];

  const quickActions = [
    { label: "Review Submissions", desc: "Grade & approve student work", icon: ClipboardCheck, path: "/submissions", color: "bg-blue-50 text-blue-600 border-blue-100" },
    { label: "My Students", desc: "View enrolled students", icon: Users, path: "/students", color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    { label: "Grade Analytics", desc: "Performance breakdown", icon: BarChart3, path: "/analytics", color: "bg-purple-50 text-purple-600 border-purple-100" },
    { label: "All Grades", desc: "Export & review grades", icon: Award, path: "/grades", color: "bg-amber-50 text-amber-600 border-amber-100" }
  ];

  const renderMonthlyChart = () => {
    const chartProps = {
      data: monthlyData,
      children: (
        <>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
          <Legend />
        </>
      )
    };

    switch (chartType) {
      case "line":
        return (
          <LineChart {...chartProps}>
            {chartProps.children}
            <Line type="monotone" dataKey="submissions" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 4 }} name="Submissions" />
          </LineChart>
        );
      case "bar":
        return (
          <BarChart {...chartProps}>
            {chartProps.children}
            <Bar dataKey="submissions" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Submissions" />
          </BarChart>
        );
      default:
        return (
          <AreaChart {...chartProps}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            {chartProps.children}
            <Area type="monotone" dataKey="submissions" stroke="#3b82f6" fill="url(#areaGradient)" name="Submissions" />
          </AreaChart>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400 w-6 h-6 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-[#EFF6FF] to-[#DBEAFE] rounded-2xl p-6 border border-[#BFDBFE] relative">
        <div className="flex items-center gap-3 mb-2">
          <IconGlass size="md" tone="dark" className="bg-gradient-to-r from-blue-500/80 to-indigo-500/80 text-white">
            <GraduationCap size={20} />
          </IconGlass>
          <div>
            <h1 className="text-xl font-semibold text-[#1E3A8A]">
              Welcome back, {user?.name?.split(" ")[0] || "Teacher"}!
            </h1>
            <p className="text-[#3B82F6] text-sm mt-1">
              Your teaching overview — courses, students, and submissions you manage
              {user?.department ? ` · ${user.department}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <div className="flex items-center gap-2 bg-white/60 rounded-full px-3 py-1 text-[#1E40AF]">
            <Trophy size={14} />
            <span className="text-sm">Completion rate: {stats.completionRate}%</span>
          </div>
          <div className="flex items-center gap-2 bg-white/60 rounded-full px-3 py-1 text-[#1E40AF]">
            <Star size={14} />
            <span className="text-sm">Average grade: {stats.averageGrade}%</span>
          </div>
          <div className="flex items-center gap-2 bg-white/60 rounded-full px-3 py-1 text-[#1E40AF]">
            <BookOpen size={14} />
            <span className="text-sm">{stats.totalCourses} course{stats.totalCourses !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="absolute top-4 right-4 px-3 py-1.5 bg-white/70 border border-[#BFDBFE] rounded-xl text-sm font-medium text-[#1E40AF] hover:bg-white flex items-center gap-2 transition-all"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Pending review alert */}
      {stats.pendingProjects > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-amber-900">
                {stats.pendingProjects} submission{stats.pendingProjects !== 1 ? "s" : ""} awaiting your review
              </p>
              <p className="text-sm text-amber-700 mt-0.5">
                Assess and grade student projects assigned to your courses.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/submissions?status=pending")}
            className="shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
          >
            Review Now <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.path}
            to={action.path}
            className={`flex items-center gap-3 p-4 rounded-xl border ${action.color} hover:shadow-md transition-all group`}
          >
            <IconGlass size="md" interactive>
              <action.icon size={20} />
            </IconGlass>
            <div className="min-w-0">
              <p className="font-semibold text-sm">{action.label}</p>
              <p className="text-xs opacity-70 truncate">{action.desc}</p>
            </div>
            <ChevronRight size={16} className="ml-auto opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
          </Link>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, index) => {
          const colors = cardColors[index % cardColors.length];
          return (
            <Link
              key={index}
              to={card.path}
              className={`bg-gradient-to-br ${colors.bg} rounded-2xl p-5 border ${colors.border} shadow-sm hover:shadow-md transition-all duration-300 block`}
            >
              <div className="flex justify-between items-start mb-3">
                <IconGlass size="md" interactive className={colors.iconColor}>
                  <card.icon size={20} />
                </IconGlass>
                <TrendingUp size={14} className="text-green-500" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800">{card.value}</h3>
              <p className={`text-sm mt-1 ${colors.text}`}>{card.title}</p>
            </Link>
          );
        })}
      </div>

      {/* My Courses — teacher self-assessment by course */}
      {courseOverview.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-indigo-500" />
              <h2 className="font-semibold text-gray-800">My Courses Overview</h2>
            </div>
            <Link to="/courses" className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1">
              Manage courses <ChevronRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submissions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Grade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {courseOverview.map((course) => (
                  <tr key={course._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{course.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{course.code || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{course.totalProjects}</td>
                    <td className="px-4 py-3">
                      {course.pending > 0 ? (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 font-medium">
                          {course.pending}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {course.avgGrade != null ? `${course.avgGrade}%` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/courses/${course._id}/assignments`}
                        className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                      >
                        View assignments
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-blue-500" />
              <h2 className="font-semibold text-gray-800">Monthly Submissions</h2>
            </div>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
              {["area", "line", "bar"].map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                    chartType === type ? "bg-blue-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            {renderMonthlyChart()}
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon size={18} className="text-purple-500" />
            <h2 className="font-semibold text-gray-800">Submission Status Breakdown</h2>
          </div>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-2 opacity-50" />
                <p>No submission data yet</p>
              </div>
            </div>
          )}
          <p className="mt-3 text-center text-sm text-gray-500">
            Total: {stats.totalProjects} submission{stats.totalProjects !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Assessment panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-green-500" />
            <h2 className="font-semibold text-gray-800">Grade Distribution</h2>
          </div>
          <div className="space-y-3">
            {gradeDistribution.map((item, idx) => {
              const percentage =
                stats.gradedProjects > 0 ? (item.count / stats.gradedProjects) * 100 : 0;
              return (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.range}</span>
                    <span className="text-gray-600">{item.count} project{item.count !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        idx === 0 ? "bg-emerald-500" :
                        idx === 1 ? "bg-green-500" :
                        idx === 2 ? "bg-blue-500" :
                        idx === 3 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {stats.gradedProjects === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No graded submissions yet</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={18} className="text-orange-500" />
              <h2 className="font-semibold text-gray-800">Needs Your Review</h2>
            </div>
            <Link to="/submissions" className="text-xs text-blue-500 hover:text-blue-600">View all</Link>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {pendingReviews.map((project) => (
              <button
                key={project._id}
                onClick={() => navigate(`/submissions?project=${project._id}`)}
                className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                {getStatusIcon(project.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 line-clamp-1">{project.title}</p>
                  <p className="text-xs text-gray-500">{getStudentName(project)} · {getCourseName(project)}</p>
                </div>
                <Eye size={14} className="text-blue-400 shrink-0 mt-1" />
              </button>
            ))}
            {pendingReviews.length === 0 && (
              <div className="text-center py-6">
                <CheckCircle size={32} className="mx-auto text-emerald-400 mb-2" />
                <p className="text-sm text-gray-400">All caught up — no pending reviews</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-yellow-500" />
            <h2 className="font-semibold text-gray-800">Teaching Summary</h2>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">Completion rate</span>
                <span className="text-sm font-medium text-gray-700">{stats.completionRate}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.completionRate}%` }} />
              </div>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Average grade</span>
              <div className="flex items-center gap-2">
                <Star size={14} className="text-yellow-500" />
                <span className="text-lg font-bold text-gray-800">{stats.averageGrade}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Students per course</span>
              <span className="text-lg font-bold text-gray-800">
                {stats.totalCourses ? Math.round(stats.totalStudents / stats.totalCourses) : 0}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">Awaiting review</span>
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-500" />
                <span className="text-lg font-bold text-amber-600">{stats.pendingProjects}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-blue-500" />
          <h2 className="font-semibold text-gray-800">Recent Activity</h2>
        </div>
        <div className="space-y-2">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
              {getStatusIcon(activity.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 line-clamp-1">{activity.title}</p>
                <p className="text-xs text-gray-400">
                  {activity.studentName} · {STATUS_LABELS[activity.status] || activity.status}
                </p>
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {activity.date ? new Date(activity.date).toLocaleDateString("en-US") : "—"}
              </span>
            </div>
          ))}
          {recentActivity.length === 0 && (
            <p className="text-center text-gray-400 py-4">No recent activity</p>
          )}
        </div>
      </div>

      {/* Recent Submissions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FolderKanban size={18} className="text-blue-500" />
            <h2 className="font-semibold text-gray-800">Recent Submissions</h2>
          </div>
          <Link to="/submissions" className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1">
            View all <ChevronRight size={14} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.slice(0, 5).map((project) => (
                <tr key={project._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 text-sm line-clamp-1">
                      {project.title?.slice(0, 40)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users size={12} className="text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-600">{getStudentName(project)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{getCourseName(project)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${STATUS_BADGE[project.status] || "bg-gray-100 text-gray-600"}`}>
                      {getStatusIcon(project.status)}
                      {STATUS_LABELS[project.status] || project.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {project.submittedAt
                      ? new Date(project.submittedAt).toLocaleDateString("en-US")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/submissions?project=${project._id}`}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-blue-500 inline-flex items-center gap-1 text-sm"
                    >
                      <Eye size={14} /> Assess
                    </Link>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                    <FileText size={32} className="mx-auto mb-2 opacity-50" />
                    No submissions in your courses yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
