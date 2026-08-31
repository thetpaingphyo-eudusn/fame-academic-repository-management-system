import React, { useEffect, useState } from "react";
import api from "../services/api";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

import {
  BarChart3,
  Users,
  FolderKanban,
  BookOpen,
  Award,
  Clock,
  CheckCircle,
  Calendar,
  Download,
  RefreshCw,
  Loader2,
  Activity,
  PieChart,
  GraduationCap,
  Building2,
  Zap,
  AlertCircle,
  TrendingUp,
  XCircle,
  RotateCcw,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const EMPTY_MONTHLY = MONTHS.map((name) => ({ name, projects: 0 }));

const EMPTY_DEPARTMENTS = [
  { name: "CS", projects: 0, students: 0 },
  { name: "IT", projects: 0, students: 0 },
  { name: "CT", projects: 0, students: 0 },
  { name: "EC", projects: 0, students: 0 },
];

const EMPTY_STATUS = [
  { name: "Pending", value: 0, color: "#f59e0b" },
  { name: "Approved", value: 0, color: "#10b981" },
  { name: "Rejected", value: 0, color: "#ef4444" },
  { name: "Revision", value: 0, color: "#3b82f6" },
  { name: "Graded", value: 0, color: "#8b5cf6" },
];

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

const displayNum = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  return value;
};

const AnalyticsPage = () => {
  const currentYear = new Date().getFullYear();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalProjects: 0,
    pendingProjects: 0,
    approvedProjects: 0,
    rejectedProjects: 0,
    revisionProjects: 0,
    gradedProjects: 0,
    averageGrade: 0,
  });
  const [monthlyData, setMonthlyData] = useState(EMPTY_MONTHLY);
  const [departmentStats, setDepartmentStats] = useState(EMPTY_DEPARTMENTS);
  const [topStudents, setTopStudents] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState(EMPTY_STATUS);
  const [teacherPerformance, setTeacherPerformance] = useState([]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [chartType, setChartType] = useState("area");
  const [statusChartType, setStatusChartType] = useState("donut");
  const [perfDepartment, setPerfDepartment] = useState("");
  const [perfCourseId, setPerfCourseId] = useState("");
  const [performanceData, setPerformanceData] = useState([]);
  const [courseOptions, setCourseOptions] = useState([]);

  // Drill-down: departments → courses (same dept) → assignments (same course)
  const perfLevel = perfCourseId ? "assignment" : perfDepartment ? "course" : "department";

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  useEffect(() => {
    loadAnalytics();
  }, [selectedYear]);

  useEffect(() => {
    loadPerformance();
  }, [perfDepartment, perfCourseId]);

  useEffect(() => {
    api.get("/admin/courses", { params: { limit: 200, page: 1 } }).then((res) => {
      setCourseOptions(res.data.data || []);
    }).catch(() => setCourseOptions([]));
  }, []);

  useEffect(() => {
    if (!notification) return undefined;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  const showNotice = (type, message) => setNotification({ type, message });

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [statsRes, monthlyRes, deptRes, studentsRes, statusRes, teachersRes] =
        await Promise.all([
          api.get("/admin/dashboard/stats"),
          api.get(`/admin/analytics/monthly?year=${selectedYear}`),
          api.get("/admin/analytics/departments"),
          api.get("/admin/analytics/top-students?limit=5"),
          api.get("/admin/analytics/status"),
          api.get("/admin/analytics/teacher-performance"),
        ]);

      const statsData = statsRes.data.data || {};
      setStats({
        totalStudents: displayNum(statsData.totalStudents),
        totalTeachers: displayNum(statsData.totalTeachers),
        totalProjects: displayNum(statsData.totalProjects),
        pendingProjects: displayNum(statsData.pendingProjects),
        approvedProjects: displayNum(statsData.approvedProjects),
        rejectedProjects: displayNum(statsData.rejectedProjects),
        revisionProjects: displayNum(statsData.revisionProjects),
        gradedProjects: displayNum(statsData.gradedProjects),
        averageGrade: displayNum(statsData.averageGrade),
      });

      setMonthlyData(monthlyRes.data.data?.length ? monthlyRes.data.data : EMPTY_MONTHLY);
      setDepartmentStats(deptRes.data.data?.length ? deptRes.data.data : EMPTY_DEPARTMENTS);
      setTopStudents(studentsRes.data.data || []);
      setStatusDistribution(statusRes.data.data?.length ? statusRes.data.data : EMPTY_STATUS);
      setTeacherPerformance(teachersRes.data.data || []);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      showNotice("error", "Failed to load analytics data");
      setMonthlyData(EMPTY_MONTHLY);
      setDepartmentStats(EMPTY_DEPARTMENTS);
      setStatusDistribution(EMPTY_STATUS);
      setTopStudents([]);
      setTeacherPerformance([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPerformance = async () => {
    try {
      const params = new URLSearchParams({ groupBy: perfLevel });
      if (perfDepartment) params.append("department", perfDepartment);
      if (perfCourseId) params.append("courseId", perfCourseId);
      const res = await api.get(`/admin/analytics/performance?${params.toString()}`);
      // Keep peer-group order alphabetical — do not rank across dissimilar items
      const rows = (res.data.data || []).slice().sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""))
      );
      setPerformanceData(rows);
    } catch {
      setPerformanceData([]);
    }
  };

  const coursesInSelectedDept = courseOptions.filter(
    (c) => !perfDepartment || c.department === perfDepartment
  );

  const perfLevelLabel =
    perfLevel === "assignment"
      ? "Assignments in selected course"
      : perfLevel === "course"
        ? `Courses in ${perfDepartment}`
        : "Departments (peer comparison)";

  const perfEmptyHint =
    perfLevel === "assignment"
      ? "No graded submissions for assignments in this course."
      : perfLevel === "course"
        ? "No graded submissions for courses in this department."
        : "No graded submissions by department yet.";

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAnalytics(), loadPerformance()]);
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleExport = () => {
    const exportData = {
      stats,
      monthlyData,
      departmentStats,
      topStudents,
      statusDistribution,
      teacherPerformance,
      year: selectedYear,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fame-analytics-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice("success", "Analytics exported successfully");
  };

  const completionRate =
    stats.totalProjects > 0
      ? Math.round(((stats.approvedProjects + stats.gradedProjects) / stats.totalProjects) * 100)
      : 0;

  const statCards = [
    { title: "Students", value: stats.totalStudents, icon: Users, iconColor: "blue", card: "cute-card cute-card-blue" },
    { title: "Teachers", value: stats.totalTeachers, icon: BookOpen, iconColor: "green", card: "cute-card cute-card-green" },
    { title: "Projects", value: stats.totalProjects, icon: FolderKanban, iconColor: "purple", card: "cute-card cute-card-purple" },
    { title: "Pending", value: stats.pendingProjects, icon: Clock, iconColor: "amber", card: "cute-card" },
    { title: "Approved", value: stats.approvedProjects, icon: CheckCircle, iconColor: "green", card: "cute-card cute-card-green" },
    { title: "Avg Grade", value: stats.averageGrade ? `${stats.averageGrade}%` : "—", icon: Award, iconColor: "indigo", card: "cute-card" },
  ];

  const renderMonthlyChart = () => {
    const common = {
      data: monthlyData,
      children: (
        <>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
          />
          <Legend />
        </>
      ),
    };

    if (chartType === "line") {
      return (
        <LineChart {...common}>
          {common.children}
          <Line
            type="monotone"
            dataKey="projects"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ fill: "#6366f1", r: 3 }}
            name="Projects"
          />
        </LineChart>
      );
    }
    if (chartType === "bar") {
      return (
        <BarChart {...common}>
          {common.children}
          <Bar dataKey="projects" fill="#6366f1" radius={[6, 6, 0, 0]} name="Projects" />
        </BarChart>
      );
    }
    return (
      <AreaChart {...common}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        {common.children}
        <Area
          type="monotone"
          dataKey="projects"
          stroke="#6366f1"
          fill="url(#areaGradient)"
          name="Projects"
        />
      </AreaChart>
    );
  };

  const renderStatusChart = () => {
    const filtered = statusDistribution.filter((s) => s.value > 0);
    const data = filtered.length ? filtered : statusDistribution;

    if (statusChartType === "radial") {
      return (
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
          <PolarRadiusAxis />
          <Radar name="Projects" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.5} />
          <Tooltip />
        </RadarChart>
      );
    }

    const innerRadius = statusChartType === "donut" ? 55 : 0;
    return (
      <RePieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={90}
          dataKey="value"
          label={({ name, value }) => (value > 0 ? `${name}: ${value}` : "")}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={entry.color || COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
        />
        <Legend />
      </RePieChart>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-3">
        <Loader2 size={36} className="text-indigo-500 animate-spin" />
        <span className="text-gray-400 text-sm">Loading analytics...</span>
      </div>
    );
  }

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
        </div>
      )}

      <PageHeader
        icon={BarChart3}
        iconColor="text-indigo-600"
        title="Analytics"
        subtitle="Insights across projects, departments, students, and teachers"
      >
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
          className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 flex items-center gap-2"
        >
          <Download size={16} /> Export
        </button>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card) => (
          <StatCard
            key={card.title}
            label={card.title}
            value={card.value}
            icon={card.icon}
            iconColor={card.iconColor}
            cardClass={card.card}
          />
        ))}
      </div>

      {/* Status summary chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Rejected", value: stats.rejectedProjects, icon: XCircle, color: "text-red-600 bg-red-50" },
          { label: "Revision", value: stats.revisionProjects, icon: RotateCcw, color: "text-blue-600 bg-blue-50" },
          { label: "Graded", value: stats.gradedProjects, icon: Award, color: "text-purple-600 bg-purple-50" },
        ].map((item) => (
          <div
            key={item.label}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${item.color}`}
          >
            <item.icon size={12} />
            {item.label}: {item.value}
          </div>
        ))}
      </div>

      {/* Performance drill-down: same-type peers only */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-indigo-100">
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-500" />
              <h2 className="font-semibold text-gray-800 text-sm">Grade Overview</h2>
            </div>
            <p className="text-xs text-gray-400">
              Compares only the same type (dept vs dept, course vs course, assignment vs assignment)
            </p>
          </div>

          {/* Breadcrumb drill-down */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setPerfDepartment("");
                setPerfCourseId("");
              }}
              className={`px-3 py-1.5 rounded-xl font-medium ${
                perfLevel === "department"
                  ? "bg-indigo-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All departments
            </button>
            {perfDepartment && (
              <>
                <span className="text-gray-300">/</span>
                <button
                  type="button"
                  onClick={() => setPerfCourseId("")}
                  className={`px-3 py-1.5 rounded-xl font-medium ${
                    perfLevel === "course"
                      ? "bg-indigo-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {perfDepartment} courses
                </button>
              </>
            )}
            {perfCourseId && (
              <>
                <span className="text-gray-300">/</span>
                <span className="px-3 py-1.5 rounded-xl font-medium bg-indigo-500 text-white">
                  Assignments
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {perfLevel !== "department" && (
              <select
                value={perfDepartment}
                onChange={(e) => {
                  setPerfDepartment(e.target.value);
                  setPerfCourseId("");
                }}
                className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs"
              >
                <option value="">Select department…</option>
                {EMPTY_DEPARTMENTS.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
            {perfLevel !== "department" && (
              <select
                value={perfCourseId}
                onChange={(e) => setPerfCourseId(e.target.value)}
                disabled={!perfDepartment}
                className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs max-w-[240px] disabled:opacity-50"
              >
                <option value="">All courses in {perfDepartment || "dept"}</option>
                {coursesInSelectedDept.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.courseCode} — {c.courseName}
                  </option>
                ))}
              </select>
            )}
            {perfLevel === "department" && (
              <p className="text-xs text-gray-500 self-center">
                Click a department below to view its courses.
              </p>
            )}
          </div>
          <p className="text-xs font-medium text-indigo-600">{perfLevelLabel}</p>
        </div>

        {performanceData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">{perfEmptyHint}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">
                    {perfLevel === "department" ? "Department" : perfLevel === "course" ? "Course" : "Assignment"}
                  </th>
                  <th className="pb-2 font-medium text-right">Graded submissions</th>
                  <th className="pb-2 font-medium text-right">Average grade</th>
                  {(perfLevel === "department" || perfLevel === "course") && (
                    <th className="pb-2 font-medium text-right w-28">Drill down</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {performanceData.map((row) => (
                  <tr key={row.id || row.name} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 text-gray-800 font-medium">{row.name}</td>
                    <td className="py-2.5 text-right text-gray-600">{row.submissions ?? 0}</td>
                    <td className="py-2.5 text-right">
                      <span className="inline-flex items-center justify-end gap-2">
                        <span className="text-indigo-600 font-semibold">{row.averageGrade ?? 0}%</span>
                        <span className="hidden sm:inline-block w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <span
                            className="block h-full bg-indigo-400 rounded-full"
                            style={{ width: `${Math.min(100, row.averageGrade || 0)}%` }}
                          />
                        </span>
                      </span>
                    </td>
                    {perfLevel === "department" && (
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setPerfDepartment(row.name);
                            setPerfCourseId("");
                          }}
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          Courses →
                        </button>
                      </td>
                    )}
                    {perfLevel === "course" && (
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setPerfCourseId(String(row.id))}
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          Assignments →
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-indigo-100">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-indigo-500" />
              <h2 className="font-semibold text-gray-800 text-sm">Monthly Submissions ({selectedYear})</h2>
            </div>
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              {["area", "line", "bar"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setChartType(type)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize ${
                    chartType === type ? "bg-indigo-500 text-white" : "text-gray-500"
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

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-indigo-100">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={16} className="text-indigo-500" />
            <h2 className="font-semibold text-gray-800 text-sm">Department Overview</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-2 text-center">Projects by department</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={departmentStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={36} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  />
                  <Bar dataKey="projects" fill="#6366f1" radius={[0, 6, 6, 0]} name="Projects" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2 text-center">Students by department</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={departmentStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={36} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  />
                  <Bar dataKey="students" fill="#10b981" radius={[0, 6, 6, 0]} name="Students" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-indigo-100">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <PieChart size={16} className="text-indigo-500" />
              <h2 className="font-semibold text-gray-800 text-sm">Project Status</h2>
            </div>
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              {["pie", "donut", "radial"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setStatusChartType(type)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium capitalize ${
                    statusChartType === type ? "bg-indigo-500 text-white" : "text-gray-500"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            {renderStatusChart()}
          </ResponsiveContainer>
          <p className="text-center text-xs text-gray-400 mt-2">
            Total: {stats.totalProjects} projects
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-indigo-100">
          <div className="flex items-center gap-2 mb-4">
            <Award size={16} className="text-amber-500" />
            <h2 className="font-semibold text-gray-800 text-sm">Top Students</h2>
          </div>
          <div className="space-y-2">
            {topStudents.length > 0 ? (
              topStudents.map((student, idx) => (
                <div
                  key={student._id || idx}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-indigo-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">
                        {student.name || "Unknown Student"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {student.department || "N/A"} · Y{student.year ?? "—"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-indigo-600 text-sm">{student.averageGrade ?? 0}%</p>
                    <p className="text-[10px] text-gray-400">{student.projectsCount ?? 0} projects</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 text-sm py-8">No graded students yet</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-indigo-100">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap size={16} className="text-indigo-500" />
            <h2 className="font-semibold text-gray-800 text-sm">Teacher Performance</h2>
          </div>
          <div className="space-y-2">
            {teacherPerformance.length > 0 ? (
              teacherPerformance.map((teacher, idx) => (
                <div
                  key={teacher._id || idx}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-indigo-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">
                        {teacher.name || "Unknown Teacher"}
                      </p>
                      <p className="text-xs text-gray-400">{teacher.department || "N/A"}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-indigo-600 text-sm">
                      {teacher.projectsGraded ?? 0} graded
                    </p>
                    <p className="text-[10px] text-gray-400">avg {teacher.avgGrade ?? 0}%</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 text-sm py-8">No teacher data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} />
          <h2 className="font-semibold">Quick Insights</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-xs opacity-80">Completion Rate</p>
            <p className="text-2xl font-bold mt-1">{completionRate}%</p>
            <div className="w-full h-1.5 bg-white/20 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-green-300 rounded-full" style={{ width: `${completionRate}%` }} />
            </div>
            <p className="text-[10px] opacity-70 mt-1">Approved + graded / total</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-xs opacity-80">Student : Teacher Ratio</p>
            <p className="text-2xl font-bold mt-1">
              {stats.totalTeachers > 0
                ? `${(stats.totalStudents / stats.totalTeachers).toFixed(1)} : 1`
                : "—"}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-xs opacity-80 flex items-center gap-1">
              <TrendingUp size={12} /> Projects per Student
            </p>
            <p className="text-2xl font-bold mt-1">
              {stats.totalStudents > 0
                ? (stats.totalProjects / stats.totalStudents).toFixed(1)
                : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
