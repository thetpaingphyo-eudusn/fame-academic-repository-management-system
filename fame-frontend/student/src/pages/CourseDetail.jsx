import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { courseAPI } from "../services/api";
import IconGlass from "../components/IconGlass";
import StatCard from "../components/StatCard";

import {
  ArrowLeft, BookOpen, Calendar, Clock, FileText, Eye,
  CheckCircle, XCircle, AlertCircle, Loader, GraduationCap,
  ChevronRight, Users, Upload, Sliders, Award
} from 'lucide-react';

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    setLoading(true);
    try {
      const [courseRes, assignmentsRes] = await Promise.all([
        courseAPI.getCourseById(courseId),
        courseAPI.getAssignmentsByCourse(courseId)
      ]);

      setCourse(courseRes.data.data?.course || null);
      setAssignments(assignmentsRes.data.data?.assignments || []);
      setSummary(assignmentsRes.data.data?.summary || null);
    } catch (error) {
      console.error('Failed to load course:', error);
      toast.error('Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSubmissionBadge = (status) => {
    const badges = {
      not_started: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Not Started', icon: <Clock size={12} /> },
      not_open: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Not Open', icon: <Clock size={12} /> },
      open: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Open', icon: <FileText size={12} /> },
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending', icon: <Clock size={12} /> },
      submitted: { bg: 'bg-sky-100', text: 'text-sky-700', label: 'Submitted', icon: <CheckCircle size={12} /> },
      graded: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Graded', icon: <CheckCircle size={12} /> },
      approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved', icon: <CheckCircle size={12} /> },
      rejected: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Rejected', icon: <XCircle size={12} /> },
      revision: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Revision', icon: <AlertCircle size={12} /> },
      missed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Missed', icon: <XCircle size={12} /> }
    };
    return badges[status] || badges.not_started;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <BookOpen size={48} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">Course not found</p>
        <button onClick={() => navigate('/my-courses')} className="mt-4 text-emerald-500 hover:underline">
          Back to My Courses
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/my-courses')}
        className="text-emerald-500 text-sm hover:underline flex items-center gap-1"
      >
        <ArrowLeft size={16} /> Back to My Courses
      </button>

      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex items-start gap-4">
          <IconGlass size="lg" tone="dark" className="bg-white/20 text-white">
            <GraduationCap size={24} />
          </IconGlass>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{course.courseName}</h1>
            <p className="text-emerald-100">{course.courseCode}</p>
            <p className="text-sm text-emerald-100 mt-2 line-clamp-2">{course.description}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Assignments" value={summary?.total || assignments.length} icon={FileText} iconColor="emerald" cardClass="cute-card cute-card-emerald p-4" />
        <StatCard label="Submitted" value={summary?.submitted || 0} icon={CheckCircle} iconColor="blue" cardClass="cute-card cute-card-blue p-4" />
        <StatCard label="Graded" value={summary?.graded || 0} icon={Award} iconColor="purple" cardClass="cute-card cute-card-purple p-4" />
        <StatCard label="Not Started" value={summary?.notStarted || 0} icon={Clock} iconColor="amber" cardClass="cute-card cute-card-amber p-4" />
      </div>

      <div className="bg-white rounded-2xl border border-emerald-100 p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-6">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-emerald-500" />
            <span>Instructor: {course.teacherId?.name || 'TBA'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-emerald-500" />
            <span>Semester: {course.semester || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-emerald-500" />
            <span>Department: {course.department} · Year {course.year}</span>
          </div>
        </div>

        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FileText size={18} className="text-emerald-500" />
          Course Assignments
        </h2>

        {assignments.length > 0 ? (
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const badge = getSubmissionBadge(assignment.submissionStatus);
              const hasProject = !!assignment.submission;

              return (
                <div
                  key={assignment._id}
                  className="p-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white hover:border-emerald-200 transition-colors"
                >
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-gray-800">{assignment.title}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${badge.bg} ${badge.text}`}>
                          {badge.icon}
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{assignment.description}</p>
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                        <span>Open: {formatDate(assignment.openDate)}</span>
                        <span>Due: {formatDate(assignment.dueDate)}</span>
                        {assignment.gradingCriteria?.hasCriteria && (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <Sliders size={12} />
                            {assignment.gradingCriteria.count} grading criteria
                          </span>
                        )}
                        {hasProject && assignment.submission.grade != null && (
                          <span className="text-purple-600 font-medium">Grade: {assignment.submission.grade}%</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/courses/${courseId}/assignments/${assignment._id}`)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm hover:bg-emerald-600 flex items-center gap-1"
                      >
                        <Eye size={14} /> View
                        <ChevronRight size={14} />
                      </button>
                      {!hasProject && ['open', 'not_started'].includes(assignment.submissionStatus) && (
                        <button
                          onClick={() => navigate(`/projects/upload?course=${courseId}&assignment=${assignment._id}`)}
                          className="px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-600 text-sm hover:bg-emerald-50 flex items-center gap-1"
                        >
                          <Upload size={14} /> Submit
                        </button>
                      )}
                      {hasProject && (
                        <button
                          onClick={() => navigate(`/projects/${assignment.submission._id}`)}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-100 flex items-center gap-1"
                        >
                          <FileText size={14} /> My Project
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            <FileText size={40} className="mx-auto text-gray-300 mb-2" />
            No assignments published for this course yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseDetail;
