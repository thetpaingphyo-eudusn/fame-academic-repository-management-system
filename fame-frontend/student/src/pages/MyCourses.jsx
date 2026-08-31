import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import IconGlass from "../components/IconGlass";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { courseAPI } from "../services/api";

import { 
  BookOpen, Search, Filter, Calendar, Clock, Users, 
  Star, ChevronRight, Loader, RefreshCw, Eye,
  GraduationCap, Award, TrendingUp, FileText,
  CheckCircle, XCircle, AlertCircle
} from 'lucide-react';

const MyCourses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [courses, searchTerm, selectedDepartment, selectedYear]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await courseAPI.getMyCourses();
      const coursesData = res.data.data || [];

      const coursesWithStats = coursesData.map((course) => ({
        ...course,
        assignmentsCount: course.stats?.totalAssignments || 0,
        completedAssignments: course.stats?.submittedProjects || 0,
        projectsCount: course.stats?.submittedProjects || 0,
        averageGrade: course.stats?.averageGrade || 0,
        progress: course.stats?.completionRate || 0
      }));

      setCourses(coursesWithStats);
      setFilteredCourses(coursesWithStats);
    } catch (error) {
      console.error('Failed to load courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const filterCourses = () => {
    let filtered = [...courses];
    
    if (searchTerm) {
      filtered = filtered.filter(course => 
        course.courseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.courseCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedDepartment) {
      filtered = filtered.filter(course => course.department === selectedDepartment);
    }
    
    if (selectedYear) {
      filtered = filtered.filter(course => course.year === parseInt(selectedYear));
    }
    
    setFilteredCourses(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCourses();
    setTimeout(() => setRefreshing(false), 500);
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'bg-emerald-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const departments = [...new Set(courses.map(c => c.department))];
  const years = [...new Set(courses.map(c => c.year))];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div>
          <BookOpen className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-emerald-400 w-6 h-6 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Courses"
        subtitle="Track your enrolled courses and progress"
        icon={BookOpen}
      >
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition-all"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Courses" value={courses.length} icon={BookOpen} iconColor="emerald" cardClass="cute-card cute-card-emerald p-4" />
        <StatCard label="Total Assignments" value={courses.reduce((sum, c) => sum + c.assignmentsCount, 0)} icon={FileText} iconColor="blue" cardClass="cute-card cute-card-blue p-4" />
        <StatCard label="Completed" value={courses.reduce((sum, c) => sum + c.completedAssignments, 0)} icon={CheckCircle} iconColor="teal" cardClass="cute-card cute-card-teal p-4" />
        <StatCard
          label="Avg Grade"
          value={`${Math.round(courses.reduce((sum, c) => sum + c.averageGrade, 0) / (courses.length || 1))}%`}
          icon={Star}
          iconColor="purple"
          cardClass="cute-card cute-card-purple p-4"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by course name, code, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        
        <select
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">All Departments</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
        
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">All Years</option>
          {years.sort().map(year => (
            <option key={year} value={year}>Year {year}</option>
          ))}
        </select>
        
        {(searchTerm || selectedDepartment || selectedYear) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedDepartment('');
              setSelectedYear('');
            }}
            className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl text-sm flex items-center gap-1"
          >
            <Filter size={14} /> Clear
          </button>
        )}
      </div>

      {/* Courses Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCourses.map((course) => (
            <div key={course._id} className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden hover:shadow-md transition-all group">
              {/* Course Header */}
              <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <IconGlass size="md" tone="dark" className="bg-gradient-to-r from-emerald-500/80 to-teal-500/80 text-white">
                      <GraduationCap size={18} className="text-white" />
                    </IconGlass>
                    <div>
                      <h3 className="font-semibold text-gray-800 text-lg">{course.courseName}</h3>
                      <p className="text-sm text-gray-500">{course.courseCode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700">
                      {course.department}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Course Stats */}
              <div className="grid grid-cols-4 gap-2 p-4 bg-gray-50">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Assignments</p>
                  <p className="text-lg font-bold text-gray-800">{course.assignmentsCount}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Completed</p>
                  <p className="text-lg font-bold text-emerald-600">{course.completedAssignments}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Progress</p>
                  <p className="text-lg font-bold text-blue-600">{course.progress}%</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Avg Grade</p>
                  <p className="text-lg font-bold text-purple-600">{course.averageGrade}%</p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="px-5 pt-2 pb-1">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Course Progress</span>
                  <span>{course.progress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${getProgressColor(course.progress)}`}
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>
              
              {/* Course Info */}
              <div className="p-5 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar size={14} />
                  <span>Semester: {course.semester || 'Current'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock size={14} />
                  <span>Credits: {course.credits}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users size={14} />
                  <span>Instructor: {course.teacherId?.name || 'TBA'}</span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="p-4 border-t border-gray-100 flex gap-2">
                <button
                  onClick={() => navigate(`/courses/${course._id}`)}
                  className="flex-1 px-3 py-2 bg-emerald-500 text-white rounded-xl text-sm hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye size={14} /> View Assignments
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl">
          <BookOpen size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No courses found</p>
          <p className="text-sm text-gray-400 mt-1">You are not enrolled in any courses yet</p>
        </div>
      )}
    </div>
  );
};

export default MyCourses;