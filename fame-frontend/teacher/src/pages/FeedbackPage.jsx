import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { feedbackAPI, projectAPI } from "../services/api";
import { getAssignmentTitle, getCourseName, getStudentName } from "../utils/projectHelpers";
import ProjectDetailModal from "../components/ProjectDetailModal";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

import {
  Award, Calendar, ChevronDown, ChevronUp, Eye, FileText,
  Loader, MessageSquare, RefreshCw, Search, Sliders, Star, User
} from "lucide-react";

const getFeedbackProject = (feedback) =>
  feedback?.projectId && typeof feedback.projectId === "object" ? feedback.projectId : null;

const getFeedbackProjectId = (feedback) => {
  const project = getFeedbackProject(feedback);
  if (project?._id) return project._id;
  if (typeof feedback?.projectId === "string") return feedback.projectId;
  return null;
};

const FeedbackPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [expandedId, setExpandedId] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await feedbackAPI.getMyFeedback();
      setFeedbacks(res.data.data || []);
    } catch (error) {
      console.error("Failed to load feedbacks:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFeedbacks = useMemo(() => {
    let list = [...feedbacks];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter((f) => {
        const project = getFeedbackProject(f);
        return (
          f.feedbackText?.toLowerCase().includes(q) ||
          project?.title?.toLowerCase().includes(q) ||
          getStudentName(project)?.toLowerCase().includes(q) ||
          getAssignmentTitle(project)?.toLowerCase().includes(q)
        );
      });
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
  }, [feedbacks, searchTerm, sortBy]);

  const stats = useMemo(() => {
    const graded = feedbacks.filter((f) => f.grade != null);
    const avg =
      graded.length > 0
        ? Math.round(graded.reduce((s, f) => s + f.grade, 0) / graded.length)
        : 0;
    const withCriteria = feedbacks.filter((f) => f.criterionScores?.length > 0).length;
    const thisMonth = feedbacks.filter((f) => {
      const d = new Date(f.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { total: feedbacks.length, avg, withCriteria, thisMonth };
  }, [feedbacks]);

  const openProject = async (feedback) => {
    const projectId = getFeedbackProjectId(feedback);
    if (!projectId) return;
    try {
      const res = await projectAPI.getProjectById(projectId);
      setSelectedProject(res.data.data);
      setShowProjectModal(true);
    } catch {
      navigate(`/submissions?project=${projectId}`);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-3">
        <Loader className="w-9 h-9 text-violet-500 animate-spin" />
        <p className="text-sm text-slate-400">Loading feedback…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Feedback"
        subtitle="Grades and feedback you've given to students"
        icon={MessageSquare}
        iconColor="text-violet-500"
      >
        <button
          onClick={loadFeedbacks}
          className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200/80 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={18} />
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Feedback" value={stats.total} icon={MessageSquare} iconColor="violet" cardClass="cute-card cute-card-purple p-4" />
        <StatCard label="This Month" value={stats.thisMonth} icon={Calendar} iconColor="blue" cardClass="cute-card cute-card-blue p-4" />
        <StatCard label="Avg Grade" value={`${stats.avg}%`} icon={Award} iconColor="purple" cardClass="cute-card cute-card-purple p-4" />
        <StatCard label="Criteria-based" value={stats.withCriteria} icon={Sliders} iconColor="green" cardClass="cute-card cute-card-green p-4" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by student, project, or feedback…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-violet-200 outline-none transition-all"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-slate-50 text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-violet-200 outline-none transition-all"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="grade-high">Highest grade</option>
          <option value="grade-low">Lowest grade</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredFeedbacks.map((feedback) => {
          const project = getFeedbackProject(feedback);
          const expanded = expandedId === feedback._id;
          const criteria = feedback.criterionScores || [];
          const hasCriteria = criteria.length > 0;

          return (
            <div
              key={feedback._id}
              className="rounded-2xl bg-white shadow-sm shadow-slate-200/60 overflow-hidden hover:shadow-md hover:shadow-violet-100/30 transition-shadow"
            >
              <div className="p-5">
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <FileText size={15} className="text-violet-500 shrink-0" />
                      <h3 className="font-semibold text-slate-800 truncate">
                        {project?.title || "Untitled Project"}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <User size={12} className="text-slate-400" />
                        {getStudentName(project)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Sliders size={12} className="text-slate-400" />
                        {getAssignmentTitle(project)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        {new Date(feedback.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white flex items-center gap-1.5 shadow-md shadow-violet-500/20">
                      <Star size={13} fill="white" />
                      <span className="text-sm font-bold">{feedback.grade}%</span>
                    </div>
                    <button
                      onClick={() => openProject(feedback)}
                      className="p-2 rounded-xl bg-violet-50 text-violet-500 hover:bg-violet-100 transition-colors"
                      title="View project"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </div>

                {/* Feedback text */}
                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <MessageSquare size={12} /> Feedback
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {feedback.feedbackText || "No feedback text"}
                  </p>
                </div>

                {/* Criteria scores */}
                {hasCriteria && (
                  <div className="mt-4">
                    <button
                      onClick={() => toggleExpand(feedback._id)}
                      className="flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-800 transition-colors"
                    >
                      <Sliders size={14} />
                      Criteria breakdown ({criteria.length})
                      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {expanded && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {criteria.map((c) => (
                          <div
                            key={c.name}
                            className="rounded-xl bg-violet-50/60 px-3 py-2.5 flex justify-between items-center gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">{c.name}</p>
                              <p className="text-xs text-slate-400">Weight {c.weight}%</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-violet-600">{c.score}/100</p>
                              <div className="w-16 h-1.5 rounded-full bg-violet-100 mt-1 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-500"
                                  style={{ width: `${c.score}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Legacy scores fallback */}
                {!hasCriteria && (feedback.codeQualityScore != null || feedback.documentationScore != null) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      { label: "Code Quality", score: feedback.codeQualityScore },
                      { label: "Documentation", score: feedback.documentationScore },
                      { label: "Library Usage", score: feedback.libraryUsageScore }
                    ]
                      .filter((s) => s.score != null)
                      .map((s) => (
                        <span
                          key={s.label}
                          className="px-2.5 py-1 rounded-full bg-slate-100 text-xs text-slate-600"
                        >
                          {s.label}: {s.score}/100
                        </span>
                      ))}
                  </div>
                )}

                {project && (
                  <p className="mt-3 text-xs text-slate-400">{getCourseName(project)}</p>
                )}
              </div>
            </div>
          );
        })}

        {filteredFeedbacks.length === 0 && (
          <div className="text-center py-16 rounded-2xl bg-white shadow-sm">
            <MessageSquare size={48} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">
              {searchTerm ? "No feedback matches your search" : "No feedback given yet"}
            </p>
            {!searchTerm && (
              <button
                onClick={() => navigate("/submissions")}
                className="mt-3 text-sm text-violet-500 font-medium hover:text-violet-700"
              >
                Go to Submissions to grade projects →
              </button>
            )}
          </div>
        )}
      </div>

      {showProjectModal && selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => {
            setShowProjectModal(false);
            setSelectedProject(null);
          }}
          onRefresh={loadFeedbacks}
          onAnalyzeHealth={() => navigate(`/submissions?project=${selectedProject._id}`)}
          onStatusChange={async (projectId, status, notes) => {
            try {
              if (status === "approved") await projectAPI.approveProject(projectId, notes);
              else if (status === "rejected") await projectAPI.rejectProject(projectId, notes);
              else if (status === "revision") await projectAPI.requestRevision(projectId, notes);
              await loadFeedbacks();
            } catch {
              alert("Failed to update project status.");
            }
          }}
        />
      )}
    </div>
  );
};

export default FeedbackPage;
