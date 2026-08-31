import React, { useEffect, useState } from "react";
import api from "../services/api";
import {
  allCriteriaScored,
  buildCriterionScoresPayload,
  calculateWeightedGrade,
  parseGradingCriteria,
} from "../utils/gradingHelpers";
import { Loader, Save, Sliders, AlertCircle } from "lucide-react";

const toId = (value) => (typeof value === "object" && value?._id ? value._id : value);

const CriteriaGradingPanel = ({ project, existingFeedback, onSuccess, onCancel }) => {
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
        const res = await api.get(`/teacher/assignments/${assignmentId}/criteria`);
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
      await api.post(`/teacher/projects/${project._id}/grade`, {
        feedback: feedback.trim(),
        criterionScores: buildCriterionScoresPayload(criteria, scores),
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
        <Loader className="w-8 h-8 text-sky-500 animate-spin" />
        <p className="text-sm text-gray-400">Loading grading criteria…</p>
      </div>
    );
  }

  if (criteria.length === 0) {
    return (
      <div className="rounded-xl bg-amber-50 p-5 text-center border border-amber-100">
        <AlertCircle className="text-amber-600 mx-auto mb-2" size={28} />
        <p className="font-semibold text-amber-900">Grading criteria required</p>
        <p className="text-sm text-amber-700 mt-2">
          The teacher must define assignment grading criteria before this submission can be graded.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sliders size={16} className="text-sky-500" />
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Grade by criteria
        </h3>
      </div>

      <div className="space-y-3">
        {criteria.map((criterion) => {
          const score = scores[criterion.id] ?? 0;
          return (
            <div key={criterion.id} className="rounded-xl bg-gray-50 p-4 border border-gray-100">
              <div className="flex justify-between items-start gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800">{criterion.name}</p>
                  {criterion.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{criterion.description}</p>
                  )}
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-xs font-medium">
                  {criterion.weight}%
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 relative h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-sky-500 transition-all"
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
                    className="w-14 px-2 py-1 rounded-lg border border-gray-200 text-sm text-center font-semibold"
                    min="0"
                    max="100"
                  />
                  <span className="text-xs text-gray-400">/100</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-sky-500 p-4 text-white flex justify-between items-center">
        <div>
          <p className="text-sm font-medium text-white/90">Final grade</p>
          <p className="text-xs text-white/70">Weighted from criteria</p>
        </div>
        <span className="text-3xl font-bold">{totalGrade}%</span>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Feedback <span className="text-gray-400 font-normal">(min. 5 characters)</span>
        </label>
        <textarea
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none"
          placeholder="Explain the scores…"
        />
      </div>

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex-1 px-4 py-2 rounded-xl bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
          {project?.grade != null ? "Update Grade" : "Submit Grade"} · {totalGrade}%
        </button>
      </div>
    </div>
  );
};

export default CriteriaGradingPanel;
