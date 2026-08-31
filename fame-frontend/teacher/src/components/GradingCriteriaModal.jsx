import React from "react";
import { getStudentName } from "../utils/projectHelpers";
import CriteriaGradingPanel from "./CriteriaGradingPanel";
import { Calculator, X } from "lucide-react";

/**
 * Modal wrapper for criteria-based grading (used from table quick actions).
 */
const GradingCriteriaModal = ({ project, onClose, onSuccess }) => {
  if (!project) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl shadow-purple-500/10 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 opacity-95" />
          <div className="relative px-6 py-5 flex justify-between items-start gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-sm shrink-0">
                <Calculator size={22} className="text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white tracking-tight">
                  Grade by Criteria
                </h2>
                <p className="text-sm text-white/75 mt-0.5 truncate">{project.title}</p>
                <p className="text-xs text-white/60 mt-0.5">{getStudentName(project)}</p>
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

        <div className="overflow-y-auto flex-1 p-6 bg-gradient-to-b from-slate-50/80 to-white">
          <CriteriaGradingPanel
            project={project}
            existingFeedback={project.latestFeedback}
            onSuccess={() => {
              onSuccess?.();
              onClose();
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default GradingCriteriaModal;
