import React, { useEffect, useState } from "react";
import { Award, BookOpen, Calendar, ChevronDown, ChevronUp, Clock, Download, Eye, FileText, Filter, Loader, RefreshCw, Search, Star, TrendingUp, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { courseAPI, projectAPI } from "../services/api";
import { getCourseName, getStudentName, getStudentRollId, matchesCourse, toId } from "../utils/projectHelpers";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

const GradesPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [students, setStudents] = useState([]);
  const [expandedProject, setExpandedProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [stats, setStats] = useState({
    averageGrade: 0,
    highestGrade: 0,
    lowestGrade: 100,
    totalGraded: 0,
    totalProjects: 0,
    totalStudents: 0,
    totalCourses: 0,
    passingRate: 0,
    excellentRate: 0
  });

  const [gradeDistribution, setGradeDistribution] = useState([
    { range: '90-100%', count: 0, color: '#10b981' },
    { range: '80-89%', count: 0, color: '#3b82f6' },
    { range: '70-79%', count: 0, color: '#f59e0b' },
    { range: '60-69%', count: 0, color: '#f97316' },
    { range: 'Below 60%', count: 0, color: '#ef4444' }
  ]);

  const [coursePerformance, setCoursePerformance] = useState([]);
  const [monthlyGrades, setMonthlyGrades] = useState([]);
  const [topStudents, setTopStudents] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectsRes, coursesRes] = await Promise.all([
        projectAPI.getMyProjects({ limit: 1000 }),
        courseAPI.getMyCourses()
      ]);
      
      const projectsData = projectsRes.data.data || [];
      const coursesData = coursesRes.data.data || [];
      
      setProjects(projectsData);
      setCourses(coursesData);
      
      calculateStats(projectsData);
      calculateGradeDistribution(projectsData);
      calculateCoursePerformance(projectsData, coursesData);
      calculateMonthlyGrades(projectsData);
      calculateTopStudents(projectsData);
      
      // Get unique students
      const uniqueStudents = [...new Map(projectsData.map(p => [p.studentId?._id || p.studentId, {
        _id: p.studentId?._id || p.studentId,
        name: getStudentName(p),
        studentId: p.studentId?.studentId
      }])).values()].filter(s => s._id);
      setStudents(uniqueStudents);
      
    } catch (error) {
      console.error('Failed to load grades data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (projectsData) => {
    const gradedProjects = projectsData.filter(p => p.grade);
    const totalGrades = gradedProjects.reduce((sum, p) => sum + p.grade, 0);
    const avgGrade = gradedProjects.length > 0 ? Math.round(totalGrades / gradedProjects.length) : 0;
    const highestGrade = gradedProjects.length > 0 ? Math.max(...gradedProjects.map(p => p.grade)) : 0;
    const lowestGrade = gradedProjects.length > 0 ? Math.min(...gradedProjects.map(p => p.grade)) : 100;
    const passingCount = gradedProjects.filter(p => p.grade >= 60).length;
    const excellentCount = gradedProjects.filter(p => p.grade >= 80).length;
    
    setStats({
      averageGrade: avgGrade,
      highestGrade: highestGrade,
      lowestGrade: lowestGrade,
      totalGraded: gradedProjects.length,
      totalProjects: projectsData.length,
      totalStudents: [...new Set(projectsData.map(p => p.studentId?._id || p.studentId))].length,
      totalCourses: [...new Set(projectsData.map(p => p.courseId?._id || p.courseId))].length,
      passingRate: gradedProjects.length > 0 ? Math.round((passingCount / gradedProjects.length) * 100) : 0,
      excellentRate: gradedProjects.length > 0 ? Math.round((excellentCount / gradedProjects.length) * 100) : 0
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

  const calculateCoursePerformance = (projectsData, coursesData) => {
    const performance = coursesData.map(course => {
      const courseProjects = projectsData.filter(p => matchesCourse(p, course._id));
      const graded = courseProjects.filter(p => p.grade);
      const avgGrade = graded.length > 0 
        ? Math.round(graded.reduce((sum, p) => sum + p.grade, 0) / graded.length)
        : 0;
      return {
        name: course.courseName || course.name,
        code: course.courseCode || course.code,
        avgGrade: avgGrade,
        totalProjects: courseProjects.length,
        gradedCount: graded.length
      };
    }).filter(c => c.totalProjects > 0).sort((a, b) => b.avgGrade - a.avgGrade);
    
    setCoursePerformance(performance);
  };

  const calculateMonthlyGrades = (projectsData) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = months.map((month, idx) => {
      const monthProjects = projectsData.filter(p => p.submittedAt && new Date(p.submittedAt).getMonth() === idx && p.grade);
      const avgGrade = monthProjects.length > 0 
        ? Math.round(monthProjects.reduce((sum, p) => sum + p.grade, 0) / monthProjects.length)
        : 0;
      return { name: month, avgGrade, count: monthProjects.length };
    });
    setMonthlyGrades(monthlyData);
  };

  const calculateTopStudents = (projectsData) => {
    const studentGrades = new Map();
    projectsData.forEach(p => {
      if (p.grade) {
        const studentId = toId(p.studentId);
        if (!studentId) return;
        if (!studentGrades.has(studentId)) {
          studentGrades.set(studentId, { name: getStudentName(p), grades: [], total: 0, count: 0 });
        }
        const student = studentGrades.get(studentId);
        student.grades.push(p.grade);
        student.total += p.grade;
        student.count += 1;
      }
    });
    
    const topList = Array.from(studentGrades.values()).map(s => ({
      name: s.name,
      avgGrade: Math.round(s.total / s.count),
      projectCount: s.count
    })).sort((a, b) => b.avgGrade - a.avgGrade).slice(0, 5);
    
    setTopStudents(topList);
  };

  const filteredProjects = projects.filter(p => {
    if (selectedCourse && !matchesCourse(p, selectedCourse)) return false;
    if (selectedStudent && toId(p.studentId) !== selectedStudent) return false;
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (searchTerm && !p.title?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !getStudentName(p).toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return p.grade;
  }).sort((a, b) => b.grade - a.grade);

  const exportToCSV = () => {
    const headers = ['Project Title', 'Student Name', 'Student ID', 'Course', 'Grade', 'Status', 'Submitted Date'];
    const rows = filteredProjects.map(p => [
      p.title,
      getStudentName(p),
      getStudentRollId(p),
      getCourseName(p),
      p.grade,
      p.status,
      new Date(p.submittedAt).toLocaleDateString()
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grades_report_${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadGradeReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: stats,
      gradeDistribution,
      coursePerformance,
      topStudents,
      gradedProjects: filteredProjects.map(p => ({
        title: p.title,
        studentName: getStudentName(p),
        grade: p.grade,
        status: p.status,
        submittedAt: p.submittedAt
      }))
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grade_report_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grades Overview"
        subtitle="Comprehensive grade analytics and performance tracking"
        icon={Award}
      >
        <button
          onClick={loadData}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={18} />
        </button>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-emerald-600 transition-all"
        >
          <Download size={16} /> Export CSV
        </button>
        <button
          onClick={downloadGradeReport}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-blue-600 transition-all"
        >
          <FileText size={16} /> Full Report
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Avg Grade" value={`${stats.averageGrade}%`} icon={Award} iconColor="purple" cardClass="cute-card cute-card-purple p-4" />
        <StatCard label="Total Graded" value={stats.totalGraded} icon={Star} iconColor="blue" cardClass="cute-card cute-card-blue p-4" />
        <StatCard label="Passing Rate" value={`${stats.passingRate}%`} icon={TrendingUp} iconColor="green" cardClass="cute-card cute-card-green p-4" />
        <StatCard label="Students" value={stats.totalStudents} icon={Users} iconColor="indigo" cardClass="cute-card cute-card-indigo p-4" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Distribution Pie Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon size={18} className="text-purple-500" />
            <h2 className="font-semibold text-gray-800">Grade Distribution</h2>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={gradeDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="count"
                label={({ range, percent }) => `${range} (${(percent * 100).toFixed(0)}%)`}
              >
                {gradeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Grade Trend */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-blue-500" />
            <h2 className="font-semibold text-gray-800">Monthly Grade Trend</h2>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyGrades}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avgGrade" stroke="#8b5cf6" strokeWidth={2} name="Avg Grade %" />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} name="Submissions" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Course Performance Table */}
      {coursePerformance.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-blue-500" />
            <h2 className="font-semibold text-gray-800">Course Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Course</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Code</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Projects</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Graded</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Avg Grade</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coursePerformance.map((course, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-800">{course.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{course.code}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 text-center">{course.totalProjects}</td>
                    <td className="px-4 py-2 text-sm text-gray-600 text-center">{course.gradedCount}</td>
                    <td className="px-4 py-2 text-sm font-semibold text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${course.avgGrade >= 80 ? 'bg-emerald-100 text-emerald-700' : course.avgGrade >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                        {course.avgGrade}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Students */}
      {topStudents.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100">
          <div className="flex items-center gap-2 mb-4">
            <Award size={18} className="text-yellow-500" />
            <h2 className="font-semibold text-gray-800">Top Performing Students</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {topStudents.map((student, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{student.name}</p>
                    <p className="text-xs text-gray-500">{student.projectCount} projects</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-purple-600">{student.avgGrade}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Graded Projects Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Star size={18} className="text-yellow-500" />
            <h2 className="font-semibold text-gray-800">Graded Projects ({filteredProjects.length})</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm w-48"
              />
            </div>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">All Courses</option>
              {courses.map(course => (
                <option key={course._id} value={course._id}>{course.courseName || course.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="graded">Graded</option>
              <option value="approved">Approved</option>
              <option value="revision">Revision</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Course</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Grade</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProjects.slice(0, 10).map((project) => (
                <tr key={project._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-800">{project.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{getStudentName(project)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{getCourseName(project)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-bold text-purple-600">{project.grade}%</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      project.status === 'graded' ? 'bg-purple-100 text-purple-700' :
                      project.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                    {new Date(project.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => navigate(`/submissions?project=${project._id}`)}
                      className="p-1 rounded-lg hover:bg-blue-50 text-blue-500"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredProjects.length === 0 && (
          <div className="text-center py-8">
            <Star size={48} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500">No graded projects yet</p>
            <p className="text-xs text-gray-400 mt-1">Grade projects to see them here</p>
          </div>
        )}
      </div>
    </div>
  );
};

// PieChartIcon component (since lucide-react doesn't have PieChart as icon)
const PieChartIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
);

export default GradesPage;