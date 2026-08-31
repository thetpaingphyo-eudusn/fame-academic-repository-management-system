import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { courseAPI, studentAPI } from "../services/api";
import { getStudentDisplayName } from "../utils/projectHelpers";

import {
  UserPlus, BookOpen, Loader, AlertCircle, ArrowLeft,
  Search, Users, Check, GraduationCap, Mail, Info
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import IconGlass from "../components/IconGlass";

const AddStudentPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCourse = searchParams.get("course") || "";

  const [loadingCourses, setLoadingCourses] = useState(true);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState(preselectedCourse);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (preselectedCourse) setCourseId(preselectedCourse);
  }, [preselectedCourse]);

  useEffect(() => {
    if (!courseId) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => searchStudents(), 350);
    return () => clearTimeout(timer);
  }, [searchTerm, courseId]);

  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await courseAPI.getMyCourses();
      setCourses(res.data.data || []);
    } catch (err) {
      console.error("Failed to load courses:", err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const searchStudents = async () => {
    if (!courseId) return;
    setSearching(true);
    setError(null);
    try {
      const res = await studentAPI.searchAvailableStudents({
        search: searchTerm,
        courseId
      });
      setResults(res.data.data || []);
    } catch (err) {
      setResults([]);
      setError(err.response?.data?.message || "Failed to search students");
    } finally {
      setSearching(false);
    }
  };

  const handleEnroll = async () => {
    if (!courseId) {
      setError("Please select a course");
      return;
    }
    if (!selectedStudent) {
      setError("Please select a student to enroll");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await studentAPI.enrollInCourse(courseId, selectedStudent._id);
      setSuccess(`${getStudentDisplayName(selectedStudent)} enrolled successfully!`);
      setTimeout(() => navigate("/students"), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to enroll student");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCourses) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-3">
        <Loader className="w-9 h-9 text-violet-500 animate-spin" />
        <p className="text-sm text-slate-400">Loading courses…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/students")}
          className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200/80 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <PageHeader
          title="Enroll Student"
          subtitle="Add an existing student (created by admin) to your course"
          icon={UserPlus}
          iconColor="text-violet-500"
        />
      </div>

      {/* Info banner */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 flex gap-3 shadow-sm">
        <IconGlass size="sm" interactive className="text-blue-500 shrink-0">
          <Info size={18} />
        </IconGlass>
        <div className="text-sm text-blue-800 leading-relaxed">
          <p className="font-medium">Student accounts are managed by the administrator.</p>
          <p className="text-blue-700/80 mt-1">
            Search for an existing student by name, email, or student ID, then enroll them in one of your courses.
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-white shadow-sm shadow-slate-200/60 p-6 space-y-5">
        {error && (
          <div className="rounded-xl bg-red-50 p-4 flex items-center gap-3">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="rounded-xl bg-emerald-50 p-4 flex items-center gap-3">
            <Check size={18} className="text-emerald-500 shrink-0" />
            <p className="text-emerald-700 text-sm">{success}</p>
          </div>
        )}

        {/* Course select */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <BookOpen size={15} className="text-violet-500" />
            Select course <span className="text-red-400">*</span>
          </label>
          <select
            value={courseId}
            onChange={(e) => {
              setCourseId(e.target.value);
              setSelectedStudent(null);
            }}
            className="w-full px-4 py-3 rounded-xl bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-violet-200 outline-none transition-all"
          >
            <option value="">Choose a course…</option>
            {courses.map((course) => (
              <option key={course._id} value={course._id}>
                {course.courseName || course.name} ({course.courseCode || course.code})
              </option>
            ))}
          </select>
          {courses.length === 0 && (
            <p className="text-xs text-amber-600 mt-2">Create a course first before enrolling students.</p>
          )}
        </div>

        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <Search size={15} className="text-violet-500" />
            Search existing students
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={!courseId}
              placeholder={courseId ? "Name, email, or student ID…" : "Select a course first"}
              className="w-full pl-9 pr-3 py-3 rounded-xl bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-violet-200 outline-none transition-all disabled:opacity-50"
            />
          </div>
        </div>

        {/* Results */}
        <div className="space-y-2 min-h-[120px]">
          {!courseId ? (
            <p className="text-sm text-slate-400 text-center py-8">Select a course to search for students</p>
          ) : searching ? (
            <div className="flex justify-center py-8">
              <Loader className="w-7 h-7 text-violet-500 animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 rounded-xl bg-slate-50">
              <Users size={32} className="mx-auto text-slate-200 mb-2" />
              <p className="text-sm text-slate-500">
                {searchTerm ? "No matching students found" : "No available students — try searching or ask admin to create the account"}
              </p>
            </div>
          ) : (
            results.map((student) => {
              const selected = selectedStudent?._id === student._id;
              return (
                <button
                  key={student._id}
                  type="button"
                  onClick={() => setSelectedStudent(student)}
                  className={`w-full text-left rounded-2xl p-4 transition-all ${
                    selected
                      ? "bg-violet-50 ring-2 ring-violet-300 shadow-sm"
                      : "bg-slate-50 hover:bg-slate-100/80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                        selected ? "bg-violet-500 text-white" : "bg-white text-violet-600 shadow-sm"
                      }`}>
                        {getStudentDisplayName(student).charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">{getStudentDisplayName(student)}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap mt-0.5">
                          <span>{student.studentId}</span>
                          <span className="flex items-center gap-1">
                            <Mail size={10} /> {student.email}
                          </span>
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <GraduationCap size={10} />
                          {student.department} · Y{student.year} · Sec {student.section}
                        </p>
                      </div>
                    </div>
                    {selected && <Check size={18} className="text-violet-500 shrink-0" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate("/students")}
            className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200/80 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleEnroll}
            disabled={submitting || !courseId || !selectedStudent || courses.length === 0}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium shadow-lg shadow-violet-500/25 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader size={16} className="animate-spin" /> : <UserPlus size={16} />}
            Enroll in Course
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddStudentPage;
