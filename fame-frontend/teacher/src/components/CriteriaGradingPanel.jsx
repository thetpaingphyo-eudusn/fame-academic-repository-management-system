import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { assignmentAPI, projectAPI } from "../services/api";
import { toId } from "../utils/projectHelpers";
import {
  allCriteriaScored,
  buildCriterionScoresPayload,
  calculateWeightedGrade,
  parseGradingCriteria
} from "../utils/gradingHelpers";

import { Loader, Save, Sliders, AlertCircle, Sparkles } from "lucide-react";

/**
 * Inline criteria-based grading form. Used inside detail views and modals.
 */
const CriteriaGradingPanel = ({
  project,
  existingFeedback,
  onSuccess,
  onCancel
}) => {
  const [loadingCriteria, setLoadingCriteria] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [criteria, setCriteria] = useState([]);
  const [scores, setScores] = useState({});
  const [feedback, setFeedback] = useState(
    existingFeedback?.feedbackText || project?.teacherFeedback || ""
  );

  const assignmentId = project ? toId(project.assignmentId) : "";
  const totalGrade = calculateWeightedGrade(criteria, scores);
  const canSubmit =
    criteria.length > 0 &&
    allCriteriaScored(criteria, scores) &&
    feedback.trim().length >= 5 &&
    !submitting;

  useEffect(() => {
    setFeedback(existingFeedback?.feedbackText || project?.teacherFeedback || "");
  }, [project, existingFeedback]);

  useEffect(() => {
    if (!project || !assignmentId) {
      setLoadingCriteria(false);
      return;
    }
    (async () => {
      setLoadingCriteria(true);
      try {
        const res = await assignmentAPI.getGradingCriteria(assignmentId);
        const list = parseGradingCriteria(res.data.data);
        setCriteria(list);

        const saved = existingFeedback?.criterionScores || [];
        const initial = {};
        list.forEach((c) => {
          const match = saved.find((s) => s.name === c.name);
          initial[c.id] = match?.score ?? 0;
        });
        setScores(initial);
      } catch {
        setCriteria([]);
      } finally {
        setLoadingCriteria(false);
      }
    })();
  }, [project, assignmentId, existingFeedback]);

  const handleScoreChange = (criterionId, value) => {
    const score = Math.min(100, Math.max(0, parseInt(value, 10) || 0));
    setScores((prev) => ({ ...prev, [criterionId]: score }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await projectAPI.gradeProject(project._id, {
        feedback: feedback.trim(),
        criterionScores: buildCriterionScoresPayload(criteria, scores)
      });
      onSuccess?.();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit grade.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCriteria) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <Loader className="w-8 h-8 text-violet-500 animate-spin" />
        <p className="text-sm text-slate-400">Loading grading criteria…</p>
      </div>
    );
  }

  if (criteria.length === 0) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 text-center shadow-sm shadow-amber-100/80">
        <div className="inline-flex p-3 rounded-2xl bg-amber-100/80 mb-3">
          <AlertCircle className="text-amber-600" size={28} />
        </div>
        <p className="font-semibold text-amber-900">Grading criteria required</p>
        <p className="text-sm text-amber-700/80 mt-2 max-w-sm mx-auto leading-relaxed">
          Define criteria for this assignment first. The final grade is calculated
          automatically from weighted scores.
        </p>
        {assignmentId && (
          <Link
            to={`/assignments/${assignmentId}/criteria`}
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
          >
            <Sparkles size={15} />
            Set Up Grading Criteria
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sliders size={16} className="text-violet-500" />
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Grade by criteria
        </h3>
      </div>

      <div className="space-y-3">
        {criteria.map((criterion) => {
          const score = scores[criterion.id] ?? 0;
          return (
            <div
              key={criterion.id}
              className="rounded-2xl bg-white p-4 shadow-sm shadow-slate-200/50"
            >
              <div className="flex justify-between items-start gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{criterion.name}</p>
                  {criterion.description && (
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {criterion.description}
                    </p>
                  )}
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 text-xs font-medium">
                  {criterion.weight}%
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 relative h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-400 to-purple-500 transition-all duration-150"
                    style={{ width: `${score}%` }}
                  />
                  <input
                    type="range"
                    value={score}
                    onChange={(e) => handleScoreChange(criterion.id, e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    min="0"
                    max="100"
                  />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    value={score}
                    onChange={(e) => handleScoreChange(criterion.id, e.target.value)}
                    className="w-14 px-2 py-1.5 rounded-xl bg-slate-50 text-sm text-center font-semibold text-slate-700 focus:bg-violet-50 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
                    min="0"
                    max="100"
                  />
                  <span className="text-xs text-slate-400">/100</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-5 shadow-lg shadow-violet-500/25">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-white/80">Final grade</p>
            <p className="text-xs text-white/60 mt-0.5">Auto-calculated from criteria weights</p>
          </div>
          <span className="text-4xl font-bold text-white tabular-nums">{totalGrade}%</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-2">
          Feedback
          <span className="text-slate-400 font-normal ml-1">(min. 5 characters)</span>
        </label>
        <textarea
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl bg-slate-50 text-slate-700 text-sm placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-violet-200 outline-none transition-all resize-none"
          placeholder="Explain the scores and what the student did well or could improve…"
        />
      </div>

      <div className="flex gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-2xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200/80 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-1 px-4 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium shadow-lg shadow-violet-500/30 hover:shadow-violet-500/45 disabled:opacity-40 disabled:shadow-none transition-all flex items-center justify-center gap-2"
        >
          {submitting ? (
            <Loader size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {project?.grade != null ? "Update Grade" : "Submit Grade"} · {totalGrade}%
        </button>
      </div>
    </div>
  );
};

export default CriteriaGradingPanel;
