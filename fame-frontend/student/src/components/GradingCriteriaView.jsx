import { Award, Sliders } from "lucide-react";

const scoreColor = (score, maxScore = 100) => {
  const pct = (score / maxScore) * 100;
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 60) return "text-amber-600";
  return "text-rose-600";
};

const GradingCriteriaView = ({
  criteria = [],
  passingGrade = 60,
  criterionScores = [],
  showScores = false
}) => {
  if (!criteria.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
        <Sliders size={28} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-600">Grading criteria not published yet</p>
        <p className="text-xs text-gray-400 mt-1">Your instructor will define how this assignment is graded.</p>
      </div>
    );
  }

  const scoreMap = new Map(
    criterionScores.map((c) => [c.name, c])
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          {criteria.length} criteria · weights total 100%
        </p>
        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          Pass: {passingGrade}%
        </span>
      </div>

      <div className="space-y-2">
        {criteria.map((criterion) => {
          const scored = scoreMap.get(criterion.name);
          const maxScore = criterion.maxScore || 100;

          return (
            <div
              key={criterion.id}
              className="rounded-xl border border-gray-100 bg-gray-50 p-4"
            >
              <div className="flex flex-wrap justify-between gap-2 items-start">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-800">{criterion.name}</p>
                  {criterion.description && (
                    <p className="text-sm text-gray-500 mt-1">{criterion.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs px-2 py-1 rounded-full bg-white border border-gray-200 text-gray-600">
                    Weight {criterion.weight}%
                  </span>
                  {showScores && scored && (
                    <span className={`text-sm font-bold ${scoreColor(scored.score, maxScore)}`}>
                      {scored.score}/{maxScore}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showScores && criterionScores.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-purple-50 border border-purple-100 px-4 py-3 text-sm text-purple-800">
          <Award size={16} className="shrink-0" />
          Final grade is calculated from these weighted criteria scores.
        </div>
      )}
    </div>
  );
};

export default GradingCriteriaView;
