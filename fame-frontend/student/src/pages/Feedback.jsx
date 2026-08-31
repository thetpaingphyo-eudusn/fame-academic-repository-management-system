import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { feedbackAPI } from "../services/api";

import {
  MessageSquare, Star, Calendar, BookOpen, FileText, Eye,
  Award, Search, RefreshCw, Loader, AlertCircle,
  ChevronDown, ChevronUp, Sliders, CheckCircle, XCircle, Clock, User
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

const Feedback = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await feedbackAPI.getMyFeedback();
      setFeedbacks(res.data.data || []);
    } catch (error) {
      console.error("Failed to load feedback:", error);
      toast.error("Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };

  const filteredFeedbacks = useMemo(() => {
    let list = [...feedbacks];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (f) =>
          f.project?.title?.toLowerCase().includes(q) ||
          f.project?.courseName?.toLowerCase().includes(q) ||
          f.project?.assignmentTitle?.toLowerCase().includes(q) ||
          f.feedbackText?.toLowerCase().includes(q) ||
          f.teacherName?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((f) => f.project?.status === statusFilter);
    }

    if (sortBy === "newest") {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === "oldest") {
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === "grade-high") {
      list.sort((a, b) => (b.grade || 0) - (a.grade || 0));
    } else if (sortBy === "grade-low") {
      list.sort((a, b) => (a.grade || 0) - (b.grade || 0));
    }

    return list;
  }, [feedbacks, searchTerm, statusFilter, sortBy]);

  const stats = useMemo(() => {
    const graded = feedbacks.filter((f) => f.grade != null);
    const avg =
      graded.length > 0
        ? Math.round(graded.reduce((s, f) => s + f.grade, 0) / graded.length)
        : 0;
    const withCriteria = feedbacks.filter((f) => f.criterionScores?.length > 0).length;
    const revision = feedbacks.filter((f) => f.project?.status === "revision").length;
    return { total: feedbacks.length, avg, withCriteria, revision };
  }, [feedbacks]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const getGradeColor = (grade) => {
    if (grade >= 80) return "text-emerald-600";
    if (grade >= 60) return "text-amber-600";
    return "text-rose-600";
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending", icon: <Clock size={12} /> },
      graded: { bg: "bg-purple-100", text: "text-purple-700", label: "Graded", icon: <Star size={12} /> },
      approved: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Approved", icon: <CheckCircle size={12} /> },
      revision: { bg: "bg-sky-100", text: "text-sky-700", label: "Revision", icon: <AlertCircle size={12} /> },
      rejected: { bg: "bg-rose-100", text: "text-rose-700", label: "Rejected", icon: <XCircle size={12} /> }
    };
    return badges[status] || { bg: "bg-gray-100", text: "text-gray-600", label: status, icon: null };
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-3">
        <Loader className="w-9 h-9 text-emerald-500 animate-spin" />
        <p className="text-sm text-gray-400">Loading feedback…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Feedback"
        subtitle="Grades and criteria-based feedback from your teachers"
        icon={MessageSquare}
      >
        <button
          onClick={loadFeedbacks}
          className="p-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={18} />
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Feedback" value={stats.total} icon={MessageSquare} iconColor="emerald" cardClass="cute-card cute-card-emerald p-4" />
        <StatCard label="Avg Grade" value={`${stats.avg}%`} icon={Award} iconColor="purple" cardClass="cute-card cute-card-purple p-4" />
        <StatCard label="Criteria-based" value={stats.withCriteria} icon={Sliders} iconColor="blue" cardClass="cute-card cute-card-blue p-4" />
        <StatCard label="Revision" value={stats.revision} icon={AlertCircle} iconColor="sky" cardClass="cute-card cute-card-indigo p-4" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by project, course, assignment…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="all">All status</option>
          <option value="graded">Graded</option>
          <option value="approved">Approved</option>
          <option value="revision">Revision</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="grade-high">Highest grade</option>
          <option value="grade-low">Lowest grade</option>
        </select>
      </div>

      {filteredFeedbacks.length > 0 ? (
        <div className="space-y-3">
          {filteredFeedbacks.map((feedback) => {
            const project = feedback.project;
            const statusBadge = getStatusBadge(project?.status);
            const criteria = feedback.criterionScores || [];
            const hasCriteria = criteria.length > 0;
            const expanded = expandedId === feedback._id;

            return (
              <div
                key={feedback._id}
                className="rounded-2xl bg-white border border-emerald-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <FileText size={15} className="text-emerald-500 shrink-0" />
                        <h3 className="font-semibold text-gray-800 truncate">
                          {project?.title || "Untitled Project"}
                        </h3>
                        {project?.status && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
                            {statusBadge.icon}
                            {statusBadge.label}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                        {feedback.teacherName && (
                          <span className="flex items-center gap-1">
                            <User size={12} /> {feedback.teacherName}
                          </span>
                        )}
                        {project?.courseName && (
                          <span className="flex items-center gap-1">
                            <BookOpen size={12} /> {project.courseName}
                          </span>
                        )}
                        {project?.assignmentTitle && (
                          <span className="flex items-center gap-1">
                            <Sliders size={12} /> {project.assignmentTitle}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> {formatDate(feedback.createdAt)}
                        </span>
                      </div>
                    </div>

                    {feedback.grade != null && (
                      <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 text-white flex items-center gap-1.5 shadow-md shadow-purple-500/20 shrink-0">
                        <Star size={13} fill="white" />
                        <span className="text-sm font-bold">{feedback.grade}%</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 p-4">
                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                      <MessageSquare size={12} /> Teacher feedback
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {feedback.feedbackText || "No detailed feedback provided"}
                    </p>
                  </div>

                  {feedback.revisionRequested && feedback.revisionNotes && (
                    <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 p-4">
                      <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-1.5">
                        Revision notes
                      </p>
                      <p className="text-sm text-amber-900">{feedback.revisionNotes}</p>
                    </div>
                  )}

                  {hasCriteria && (
                    <div className="mt-4">
                      <button
                        onClick={() => toggleExpand(feedback._id)}
                        className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-800"
                      >
                        <Sliders size={14} />
                        Criteria breakdown ({criteria.length})
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {expanded && (
                        <div className="mt-3 space-y-2">
                          {criteria.map((c) => (
                            <div
                              key={c.name}
                              className="rounded-xl bg-emerald-50/70 border border-emerald-100 px-4 py-3 flex justify-between items-center gap-3"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800">{c.name}</p>
                                <p className="text-xs text-gray-400">Weight {c.weight}%</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className={`text-sm font-bold ${getGradeColor(c.score)}`}>
                                  {c.score}/{c.maxScore || 100}
                                </p>
                                <p className="text-xs text-gray-400">
                                  contributes {Math.round((c.score * c.weight) / 100)} pts
                                </p>
                              </div>
                            </div>
                          ))}
                          <p className="text-xs text-gray-500 pt-1">
                            Final grade {feedback.grade}% is calculated from these weighted criteria scores.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {!hasCriteria &&
                    (feedback.codeQualityScore ||
                      feedback.documentationScore ||
                      feedback.libraryUsageScore) && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {feedback.codeQualityScore != null && (
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">Code Quality</p>
                            <p className="text-lg font-semibold text-purple-600">
                              {feedback.codeQualityScore}%
                            </p>
                          </div>
                        )}
                        {feedback.documentationScore != null && (
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">Documentation</p>
                            <p className="text-lg font-semibold text-blue-600">
                              {feedback.documentationScore}%
                            </p>
                          </div>
                        )}
                        {feedback.libraryUsageScore != null && (
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500">Library Usage</p>
                            <p className="text-lg font-semibold text-emerald-600">
                              {feedback.libraryUsageScore}%
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                </div>

                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
                  {project?._id && (
                    <>
                      <button
                        onClick={() => navigate(`/projects/${project._id}?tab=grading`)}
                        className="px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-600 text-sm hover:bg-emerald-50 flex items-center gap-1"
                      >
                        <Sliders size={14} /> Grading details
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
          <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">No feedback yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Feedback appears here after your teacher grades your projects
          </p>
        </div>
      )}
    </div>
  );
};

export default Feedback;
