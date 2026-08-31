import React, { useEffect, useState } from "react";
import { projectAPI } from "../services/api";
import {
  getAssignmentTitle,
  getCourseName,
  getStudentName,
  getStudentRollId
} from "../utils/projectHelpers";
import CriteriaGradingPanel from "./CriteriaGradingPanel";

import {
  X, FileText, User, BookOpen, Calendar, CheckCircle,
  XCircle, RotateCcw, Brain, Loader, Award, ClipboardList
} from "lucide-react";

const STATUS_STYLE = {
  pending: { bg: "bg-amber-100", text: "text-amber-700", label: "Awaiting Review" },
  submitted: { bg: "bg-blue-100", text: "text-blue-700", label: "Submitted" },
  graded: { bg: "bg-purple-100", text: "text-purple-700", label: "Graded" },
  revision: { bg: "bg-sky-100", text: "text-sky-700", label: "Revision Required" },
  approved: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Approved" },
  rejected: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" }
};

const ProjectDetailModal = ({
  project: initialProject,
  onClose,
  onRefresh,
  onAnalyzeHealth,
  onStatusChange
}) => {
  const [project, setProject] = useState(initialProject);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!initialProject?._id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await projectAPI.getProjectById(initialProject._id);
        setProject(res.data.data || initialProject);
      } catch {
        setProject(initialProject);
      } finally {
        setLoading(false);
      }
    })();
  }, [initialProject?._id]);

  const handleGradeSuccess = async () => {
    await onRefresh?.();
    try {
      const res = await projectAPI.getProjectById(project._id);
      setProject(res.data.data || project);
    } catch {
      /* keep current */
    }
  };

  if (!project) return null;

  const status = STATUS_STYLE[project.status] || STATUS_STYLE.pending;
  const latestFeedback = project.latestFeedback;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-3xl bg-white shadow-2xl shadow-violet-500/10 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-violet-500 to-purple-600 opacity-95" />
          <div className="relative px-6 py-5 flex justify-between items-start gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-sm shrink-0">
                <FileText size={22} className="text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white tracking-tight truncate">
                  {project.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                    {status.label}
                  </span>
                  {project.grade != null && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
                      {project.grade}% graded
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors shrink-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6 bg-gradient-to-b from-slate-50/80 to-white">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader className="w-9 h-9 text-violet-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Info cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-200/50">
                  <div className="flex items-center gap-2 text-violet-500 mb-1">
                    <User size={14} />
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Student</span>
                  </div>
                  <p className="font-semibold text-slate-800 text-sm">{getStudentName(project)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{getStudentRollId(project)}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-200/50">
                  <div className="flex items-center gap-2 text-violet-500 mb-1">
                    <BookOpen size={14} />
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Course</span>
                  </div>
                  <p className="font-semibold text-slate-800 text-sm">{getCourseName(project)}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-200/50">
                  <div className="flex items-center gap-2 text-violet-500 mb-1">
                    <ClipboardList size={14} />
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Assignment</span>
                  </div>
                  <p className="font-semibold text-slate-800 text-sm line-clamp-2">
                    {getAssignmentTitle(project) || project.assignmentTitle || "—"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-200/50">
                  <div className="flex items-center gap-2 text-violet-500 mb-1">
                    <Calendar size={14} />
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Submitted</span>
                  </div>
                  <p className="font-semibold text-slate-800 text-sm">
                    {project.submittedAt
                      ? new Date(project.submittedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onAnalyzeHealth?.(project)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-shadow flex items-center gap-2"
                >
                  <Brain size={15} /> AI Health Check
                </button>
                {project.status === "pending" && (
                  <>
                    <button
                      onClick={() => onStatusChange?.(project._id, "approved")}
                      className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700 text-sm font-medium hover:bg-emerald-200/80 transition-colors flex items-center gap-2"
                    >
                      <CheckCircle size={15} /> Approve
                    </button>
                    <button
                      onClick={() => {
                        const notes = prompt("Enter revision notes:");
                        if (notes) onStatusChange?.(project._id, "revision", notes);
                      }}
                      className="px-4 py-2 rounded-xl bg-sky-100 text-sky-700 text-sm font-medium hover:bg-sky-200/80 transition-colors flex items-center gap-2"
                    >
                      <RotateCcw size={15} /> Request Revision
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt("Enter rejection reason:");
                        if (reason) onStatusChange?.(project._id, "rejected", reason);
                      }}
                      className="px-4 py-2 rounded-xl bg-rose-100 text-rose-700 text-sm font-medium hover:bg-rose-200/80 transition-colors flex items-center gap-2"
                    >
                      <XCircle size={15} /> Reject
                    </button>
                  </>
                )}
              </div>

              {/* Previous grade breakdown */}
              {latestFeedback?.criterionScores?.length > 0 && (
                <div className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-200/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award size={16} className="text-violet-500" />
                      <h3 className="text-sm font-semibold text-slate-700">Previous scores</h3>
                    </div>
                    <span className="text-lg font-bold text-violet-600">{latestFeedback.grade}%</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {latestFeedback.criterionScores.map((c) => (
                      <div
                        key={c.name}
                        className="flex justify-between items-center px-3 py-2 rounded-xl bg-slate-50"
                      >
                        <span className="text-sm text-slate-600 truncate mr-2">{c.name}</span>
                        <span className="text-sm font-semibold text-slate-800 shrink-0">
                          {c.score}%
                          <span className="text-slate-400 font-normal ml-1">× {c.weight}%</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  {latestFeedback.feedbackText && (
                    <p className="text-sm text-slate-500 leading-relaxed pt-1">
                      {latestFeedback.feedbackText}
                    </p>
                  )}
                </div>
              )}

              {/* Criteria grading */}
              <div className="rounded-2xl bg-slate-50/80 p-5">
                <CriteriaGradingPanel
                  project={project}
                  existingFeedback={latestFeedback}
                  onSuccess={handleGradeSuccess}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailModal;
