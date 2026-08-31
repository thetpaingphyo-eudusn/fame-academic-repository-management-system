import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { courseAPI, dashboardAPI, projectAPI, studentAPI } from "../services/api";
import {
  averageGrade,
  getProjectOwnerId,
  getStudentName,
  matchesCourse
} from "../utils/projectHelpers";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

import {
  BarChart3, Users, FolderKanban, BookOpen, Award, Clock,
  CheckCircle, Download, RefreshCw, Loader, Activity, PieChart,
  Star, Zap, TrendingUp
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart as RePieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const GRADE_RANGES = [
  { name: "90–100%", min: 90, max: 100, color: "#10b981" },
  { name: "80–89%", min: 80, max: 89, color: "#6366f1" },
  { name: "70–79%", min: 70, max: 79, color: "#f59e0b" },
  { name: "60–69%", min: 60, max: 69, color: "#f97316" },
  { name: "Below 60%", min: 0, max: 59, color: "#ef4444" }
];

const STATUS_COLORS = {
  Pending: "#f59e0b",
  Approved: "#10b981",
  Rejected: "#ef4444",
  Revision: "#3b82f6",
  Graded: "#8b5cf6"
};

const tooltipStyle = {
  borderRadius: "12px",
  border: "none",
  boxShadow: "0 8px 24px rgba(15,23,42,0.12)"
};

const AnalyticsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [chartType, setChartType] = useState("area");

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    totalProjects: 0,
    pendingProjects: 0,
    approvedProjects: 0,
    rejectedProjects: 0,
    revisionProjects: 0,
    gradedProjects: 0,
    averageGrade: 0,
    completionRate: 0
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [courseStats, setCourseStats] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [gradeDistribution, setGradeDistribution] = useState([]);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1];
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [selectedYear]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [dashboardRes, coursesRes, projectsRes, studentsRes] = await Promise.all([
        dashboardAPI.getTeacherDashboard(),
        courseAPI.getMyCourses(),
        projectAPI.getMyProjects({ limit: 1000 }),
        studentAPI.getAllStudents()
      ]);

      const dash = dashboardRes.data.data || {};
      const courses = coursesRes.data.data || [];
      const projects = projectsRes.data.data || [];
      const enrolledStudents = studentsRes.data.data || [];

      const gradedProjects = projects.filter((p) => p.grade != null);
      const avgGrade =
        dash.averageGrade != null
          ? Math.round(dash.averageGrade)
          : averageGrade(projects);

      const completed = projects.filter(
        (p) => p.status === "approved" || p.status === "graded"
      ).length;
      const completionRate =
        projects.length > 0 ? Math.round((completed / projects.length) * 100) : 0;

      setStats({
        totalStudents: enrolledStudents.length,
        totalCourses: dash.courseCount ?? courses.length,
        totalProjects: dash.totalProjects ?? projects.length,
        pendingProjects:
          dash.pendingCount ?? projects.filter((p) => p.status === "pending").length,
        approvedProjects: projects.filter((p) => p.status === "approved").length,
        rejectedProjects: projects.filter((p) => p.status === "rejected").length,
        revisionProjects:
          dash.revisionCount ?? projects.filter((p) => p.status === "revision").length,
        gradedProjects: dash.gradedCount ?? gradedProjects.length,
        averageGrade: avgGrade,
        completionRate
      });

      setMonthlyData(
        MONTHS.map((name, idx) => ({
          name,
          submissions: projects.filter(
            (p) =>
              p.submittedAt &&
              new Date(p.submittedAt).getMonth() === idx &&
              new Date(p.submittedAt).getFullYear() === selectedYear
          ).length,
          graded: projects.filter(
            (p) =>
              p.grade != null &&
              p.submittedAt &&
              new Date(p.submittedAt).getMonth() === idx &&
              new Date(p.submittedAt).getFullYear() === selectedYear
          ).length
        }))
      );

      const courseStudentCounts = await Promise.all(
        courses.map(async (course) => {
          try {
            const res = await courseAPI.getStudentsByCourse(course._id);
            return { courseId: course._id, count: (res.data.data || []).length };
          } catch {
            return { courseId: course._id, count: 0 };
          }
        })
      );
      const studentCountMap = Object.fromEntries(
        courseStudentCounts.map((c) => [c.courseId, c.count])
      );

      setCourseStats(
        courses.map((course) => {
          const courseProjects = projects.filter((p) => matchesCourse(p, course._id));
          const courseGraded = courseProjects.filter((p) => p.grade != null);
          return {
            name: (course.courseName || course.name || "").slice(0, 18),
            fullName: course.courseName || course.name,
            code: course.courseCode || course.code,
            projects: courseProjects.length,
            graded: courseGraded.length,
            pending: courseProjects.filter((p) => p.status === "pending").length,
            avgGrade: averageGrade(courseProjects),
            students: studentCountMap[course._id] || 0
          };
        })
      );

      const studentMap = new Map();
      gradedProjects.forEach((p) => {
        const studentId = getProjectOwnerId(p);
        if (!studentId) return;
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, { name: getStudentName(p), total: 0, count: 0 });
        }
        const entry = studentMap.get(studentId);
        entry.total += p.grade;
        entry.count += 1;
      });
      setTopStudents(
        Array.from(studentMap.values())
          .map((s) => ({
            name: s.name,
            avgGrade: Math.round(s.total / s.count),
            projectsCount: s.count
          }))
          .sort((a, b) => b.avgGrade - a.avgGrade)
          .slice(0, 5)
      );

      setStatusDistribution(
        [
          { name: "Pending", value: projects.filter((p) => p.status === "pending").length },
          { name: "Approved", value: projects.filter((p) => p.status === "approved").length },
          { name: "Rejected", value: projects.filter((p) => p.status === "rejected").length },
          { name: "Revision", value: projects.filter((p) => p.status === "revision").length },
          { name: "Graded", value: projects.filter((p) => p.status === "graded").length }
        ].filter((s) => s.value > 0)
      );

      setGradeDistribution(
        GRADE_RANGES.map((range) => ({
          ...range,
          value: gradedProjects.filter(
            (p) => p.grade >= range.min && p.grade <= range.max
          ).length
        }))
      );
    } catch (error) {
      console.error("Failed to load analytics:", error);
      setMonthlyData(MONTHS.map((name) => ({ name, submissions: 0, graded: 0 })));
      setCourseStats([]);
      setTopStudents([]);
      setStatusDistribution([]);
      setGradeDistribution([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const handleExport = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            year: selectedYear,
            stats,
            monthlyData,
            courseStats,
            topStudents,
            statusDistribution,
            gradeDistribution
          },
          null,
          2
        )
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teacher-analytics-${selectedYear}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    { title: "My Courses", value: stats.totalCourses, icon: BookOpen, iconColor: "violet", cardClass: "cute-card cute-card-purple p-4" },
    { title: "Enrolled Students", value: stats.totalStudents, icon: Users, iconColor: "green", cardClass: "cute-card cute-card-green p-4" },
    { title: "Total Projects", value: stats.totalProjects, icon: FolderKanban, iconColor: "blue", cardClass: "cute-card cute-card-blue p-4" },
    { title: "Pending Review", value: stats.pendingProjects, icon: Clock, iconColor: "amber", cardClass: "cute-card cute-card-amber p-4", link: "/submissions?status=pending" },
    { title: "Graded", value: stats.gradedProjects, icon: CheckCircle, iconColor: "purple", cardClass: "cute-card cute-card-purple p-4" },
    { title: "Avg Grade", value: `${stats.averageGrade}%`, icon: Award, iconColor: "rose", cardClass: "cute-card cute-card-indigo p-4" }
  ];

  const renderMonthlyChart = () => {
    const common = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend />
      </>
    );
    if (chartType === "line") {
      return (
        <LineChart data={monthlyData}>
          {common}
          <Line type="monotone" dataKey="submissions" stroke="#6366f1" strokeWidth={2} name="Submissions" dot={false} />
          <Line type="monotone" dataKey="graded" stroke="#a855f7" strokeWidth={2} name="Graded" dot={false} />
        </LineChart>
      );
    }
    if (chartType === "bar") {
      return (
        <BarChart data={monthlyData}>
          {common}
          <Bar dataKey="submissions" fill="#6366f1" radius={[6, 6, 0, 0]} name="Submissions" />
          <Bar dataKey="graded" fill="#a855f7" radius={[6, 6, 0, 0]} name="Graded" />
        </BarChart>
      );
    }
    return (
      <AreaChart data={monthlyData}>
        <defs>
          <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
          </linearGradient>
        </defs>
        {common}
        <Area type="monotone" dataKey="submissions" stroke="#6366f1" fill="url(#subGrad)" name="Submissions" />
        <Area type="monotone" dataKey="graded" stroke="#a855f7" fill="url(#gradedGrad)" name="Graded" />
      </AreaChart>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-3">
        <Loader className="w-9 h-9 text-violet-500 animate-spin" />
        <p className="text-sm text-slate-400">Loading analytics…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Insights for your courses, students, and criteria-based grades"
        icon={BarChart3}
        iconColor="text-violet-500"
      >
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
          className="px-4 py-2.5 rounded-xl bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-violet-200 outline-none"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button
          onClick={handleExport}
          className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200/80 flex items-center gap-2"
        >
          <Download size={16} /> Export
        </button>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-medium shadow-md shadow-violet-500/25 flex items-center gap-2 disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <StatCard
            key={card.title}
            label={card.title}
            value={card.value}
            icon={card.icon}
            iconColor={card.iconColor}
            cardClass={card.cardClass}
            onClick={card.link ? () => navigate(card.link) : undefined}
          />
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/60">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-violet-500" />
              <h2 className="font-semibold text-slate-800">Monthly Activity ({selectedYear})</h2>
            </div>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {["area", "line", "bar"].map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize ${
                    chartType === type ? "bg-white shadow-sm text-violet-600" : "text-slate-500"
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

        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/60">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-violet-500" />
            <h2 className="font-semibold text-slate-800">Course Performance</h2>
          </div>
          {courseStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={courseStats} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={72} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => [value, name]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
                />
                <Legend />
                <Bar dataKey="projects" fill="#6366f1" radius={[0, 6, 6, 0]} name="Projects" />
                <Bar dataKey="graded" fill="#a855f7" radius={[0, 6, 6, 0]} name="Graded" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-slate-400 py-16 text-sm">No courses yet</p>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/60">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={18} className="text-violet-500" />
            <h2 className="font-semibold text-slate-800">Project Status</h2>
          </div>
          {statusDistribution.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <RePieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {statusDistribution.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
              <p className="text-center text-xs text-slate-400 mt-1">
                {stats.totalProjects} total projects
              </p>
            </>
          ) : (
            <p className="text-center text-slate-400 py-16 text-sm">No project data</p>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/60">
          <div className="flex items-center gap-2 mb-4">
            <Award size={18} className="text-violet-500" />
            <h2 className="font-semibold text-slate-800">Top Students</h2>
          </div>
          <div className="space-y-2">
            {topStudents.length > 0 ? (
              topStudents.map((student, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-violet-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{student.name}</p>
                      <p className="text-xs text-slate-400">{student.projectsCount} graded</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-violet-600 shrink-0">{student.avgGrade}%</span>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-400 py-8 text-sm">No graded projects yet</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/60">
          <div className="flex items-center gap-2 mb-4">
            <Star size={18} className="text-violet-500" />
            <h2 className="font-semibold text-slate-800">Grade Distribution</h2>
          </div>
          <div className="space-y-3">
            {gradeDistribution.map((grade) => (
              <div key={grade.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{grade.name}</span>
                  <span className="text-slate-500">{grade.value}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${
                        stats.gradedProjects > 0
                          ? (grade.value / stats.gradedProjects) * 100
                          : 0
                      }%`,
                      backgroundColor: grade.color
                    }}
                  />
                </div>
              </div>
            ))}
            {stats.gradedProjects === 0 && (
              <p className="text-center text-slate-400 text-sm pt-4">Grades appear after criteria-based grading</p>
            )}
          </div>
        </div>
      </div>

      {/* Course table + insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/60 overflow-x-auto">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-violet-500" />
            <h2 className="font-semibold text-slate-800">Course Breakdown</h2>
          </div>
          {courseStats.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                  <th className="pb-3 pr-4">Course</th>
                  <th className="pb-3 pr-4">Students</th>
                  <th className="pb-3 pr-4">Projects</th>
                  <th className="pb-3 pr-4">Pending</th>
                  <th className="pb-3 pr-4">Graded</th>
                  <th className="pb-3">Avg Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courseStats.map((c) => (
                  <tr key={c.code} className="hover:bg-slate-50/50">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-800">{c.fullName}</p>
                      <p className="text-xs text-slate-400">{c.code}</p>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{c.students}</td>
                    <td className="py-3 pr-4 text-slate-600">{c.projects}</td>
                    <td className="py-3 pr-4">
                      {c.pending > 0 ? (
                        <span className="text-amber-600 font-medium">{c.pending}</span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{c.graded}</td>
                    <td className="py-3">
                      {c.avgGrade > 0 ? (
                        <span className="font-semibold text-violet-600">{c.avgGrade}%</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-slate-400 text-sm py-8 text-center">No courses to analyze</p>
          )}
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 p-5 text-white shadow-lg shadow-violet-500/25">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} />
            <h2 className="font-semibold">Quick Insights</h2>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl bg-white/15 backdrop-blur-sm p-4">
              <p className="text-sm text-white/80">Completion Rate</p>
              <p className="text-3xl font-bold mt-1">{stats.completionRate}%</p>
              <div className="w-full h-1.5 bg-white/20 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-emerald-300 rounded-full"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
            </div>
            <div className="rounded-xl bg-white/15 backdrop-blur-sm p-4">
              <p className="text-sm text-white/80">Students per Course</p>
              <p className="text-3xl font-bold mt-1">
                {stats.totalCourses > 0
                  ? (stats.totalStudents / stats.totalCourses).toFixed(1)
                  : 0}
              </p>
            </div>
            <div className="rounded-xl bg-white/15 backdrop-blur-sm p-4">
              <p className="text-sm text-white/80">Projects per Student</p>
              <p className="text-3xl font-bold mt-1">
                {stats.totalStudents > 0
                  ? (stats.totalProjects / stats.totalStudents).toFixed(1)
                  : 0}
              </p>
            </div>
            {stats.pendingProjects > 0 && (
              <button
                onClick={() => navigate("/submissions?status=pending")}
                className="w-full py-2.5 rounded-xl bg-white text-violet-600 text-sm font-medium hover:bg-violet-50 transition-colors"
              >
                Review {stats.pendingProjects} pending →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
