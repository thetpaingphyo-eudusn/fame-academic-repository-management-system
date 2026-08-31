export const parseGradingCriteria = (criteriaData) => {
  if (!criteriaData) return [];
  let criteriaArray = [];
  if (criteriaData.criteria && Array.isArray(criteriaData.criteria)) {
    criteriaArray = criteriaData.criteria;
  } else if (Array.isArray(criteriaData)) {
    criteriaArray = criteriaData;
  }
  return criteriaArray.map((c, idx) => ({
    id: c._id || c.id || `criterion-${idx}`,
    name: c.name,
    description: c.description || "",
    weight: c.weight,
    maxScore: c.maxScore || 100,
  }));
};

export const calculateWeightedGrade = (criteria, scores) => {
  let total = 0;
  criteria.forEach((c) => {
    const score = Number(scores[c.id] ?? 0);
    total += (score * c.weight) / 100;
  });
  return Math.round(total);
};

export const buildCriterionScoresPayload = (criteria, scores) =>
  criteria.map((c) => ({
    name: c.name,
    weight: c.weight,
    score: Number(scores[c.id] ?? 0),
    maxScore: c.maxScore || 100,
  }));

export const allCriteriaScored = (criteria, scores) =>
  criteria.every((c) => {
    const v = scores[c.id];
    return v !== undefined && v !== null && v !== "" && !Number.isNaN(Number(v));
  });
