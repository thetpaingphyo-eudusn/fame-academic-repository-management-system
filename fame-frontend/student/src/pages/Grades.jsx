import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { feedbackAPI } from "../services/api";

import {
  Award, BookOpen, Calendar, ChevronDown, ChevronUp, Eye,
  FileText, Loader, RefreshCw, Search, Sliders, Star, TrendingUp
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

const Grades = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    loadGrades();
  }, []);

  const loadGrades = async () => {
    setLoading(true);
    try {
      const res = await feedbackAPI.getMyFeedback();
      const withGrades = (res.data.data || []).filter((f) => f.grade != null);
      setGrades(withGrades);
    } catch (error) {
      console.error("Failed to load grades:", error);
      toast.error("Failed to load grades");
    } finally {
      setLoading(false);
    }
  };

  const filteredGrades = useMemo(() => {
    if (!searchTerm) return grades;
    const q = searchTerm.toLowerCase();
    return grades.filter(
      (g) =>
        g.project?.title?.toLowerCase().includes(q) ||
        g.project?.courseName?.toLowerCase().includes(q) ||
        g.project?.assignmentTitle?.toLowerCase().includes(q)
    );
  }, [grades, searchTerm]);

  const stats = useMemo(() => {
    if (grades.length === 0) {
      return { average: 0, highest: 0, lowest: 0, total: 0, withCriteria: 0 };
    }
    const scores = grades.map((g) => g.grade);
    return {
      average: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
      highest: Math.max(...scores),
      lowest: Math.min(...scores),
      total: grades.length,
      withCriteria: grades.filter((g) => g.criterionScores?.length > 0).length
    };
  }, [grades]);

  const courseBreakdown = useMemo(() => {
    const map = new Map();
    grades.forEach((g) => {
      const name = g.project?.courseName || "Unknown";
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(g.grade);
    });
    return [...map.entries()]
      .map(([course, scores]) => ({
        course,
        count: scores.length,
        average: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
      }))
      .sort((a, b) => b.average - a.average);
  }, [grades]);

  const getGradeColor = (grade) => {
    if (grade >= 80) return "text-emerald-600";
    if (grade >= 60) return "text-amber-600";
    return "text-rose-600";
  };

  const getGradeBg = (grade) => {
    if (grade >= 80) return "bg-emerald-50 border-emerald-100";
    if (grade >= 60) return "bg-amber-50 border-amber-100";
    return "bg-rose-50 border-rose-100";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-3">
        <Loader className="w-9 h-9 text-emerald-500 animate-spin" />
        <p className="text-sm text-gray-400">Loading your grades…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Grades"
        subtitle="Criteria-based grades across all your graded projects"
        icon={Award}
        iconColor="text-purple-500"
      >
        <button
          onClick={loadGrades}
          className="p-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={18} />
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Average" value={`${stats.average}%`} icon={Award} iconColor="purple" cardClass="cute-card cute-card-purple p-4" />
        <StatCard label="Highest" value={`${stats.highest}%`} icon={TrendingUp} iconColor="emerald" cardClass="cute-card cute-card-emerald p-4" />
        <StatCard label="Graded" value={stats.total} icon={FileText} iconColor="blue" cardClass="cute-card cute-card-blue p-4" />
        <StatCard label="With Criteria" value={stats.withCriteria} icon={Sliders} iconColor="teal" cardClass="cute-card cute-card-teal p-4" />
      </div>

      {courseBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-emerald-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <BookOpen size={18} className="text-emerald-500" />
            By course
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {courseBreakdown.map((row) => (
              <div key={row.course} className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-sm font-medium text-gray-800 truncate">{row.course}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">{row.count} graded</span>
                  <span className={`text-lg font-bold ${getGradeColor(row.average)}`}>{row.average}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Search by project, course, or assignment…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {filteredGrades.length > 0 ? (
        <div className="space-y-3">
          {filteredGrades.map((item) => {
            const project = item.project;
            const criteria = item.criterionScores || [];
            const hasCriteria = criteria.length > 0;
            const expanded = expandedId === item._id;

            return (
              <div
                key={item._id}
                className={`rounded-2xl border overflow-hidden ${getGradeBg(item.grade)}`}
              >
                <div className="p-5 bg-white/80">
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <FileText size={16} className="text-emerald-500 shrink-0" />
                        <h3 className="font-semibold text-gray-800 truncate">
                          {project?.title || "Untitled Project"}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <BookOpen size={12} /> {project?.courseName || "N/A"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Sliders size={12} /> {project?.assignmentTitle || "N/A"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> {formatDate(item.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-3xl font-bold ${getGradeColor(item.grade)}`}>{item.grade}%</p>
                      {hasCriteria && (
                        <p className="text-xs text-gray-500 mt-0.5">{criteria.length} criteria scored</p>
                      )}
                    </div>
                  </div>

                  {hasCriteria && (
                    <div className="mt-4">
                      <button
                        onClick={() => setExpandedId(expanded ? null : item._id)}
                        className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-800"
                      >
                        <Sliders size={14} />
                        Criteria breakdown
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {expanded && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {criteria.map((c) => (
                            <div
                              key={c.name}
                              className="rounded-xl bg-white border border-gray-100 px-3 py-2.5 flex justify-between items-center gap-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                                <p className="text-xs text-gray-400">Weight {c.weight}%</p>
                              </div>
                              <span className={`text-sm font-bold ${getGradeColor(c.score)}`}>
                                {c.score}/{c.maxScore || 100}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="px-5 py-3 border-t border-gray-100 bg-white/60 flex justify-end gap-2">
                  {project?._id && (
                    <>
                      <button
                        onClick={() => navigate(`/projects/${project._id}?tab=grading`)}
                        className="px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-600 text-sm hover:bg-emerald-50 flex items-center gap-1"
                      >
                        <Sliders size={14} /> Details
                      </button>
                      <button
                        onClick={() => navigate(`/projects/${project._id}`)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-sm hover:bg-emerald-600 flex items-center gap-1"
                      >
                        <Eye size={14} /> View project
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-emerald-100">
          <Star size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">No grades yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Grades appear here after your teacher grades your projects
          </p>
        </div>
      )}
    </div>
  );
};

export default Grades;
