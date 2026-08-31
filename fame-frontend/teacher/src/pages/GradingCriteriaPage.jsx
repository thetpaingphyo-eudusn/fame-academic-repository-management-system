import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useConfirmDialog } from "../components/ConfirmDialog";
import PageHeader from "../components/PageHeader";
import IconGlass from "../components/IconGlass";
import StatCard from "../components/StatCard";
import { assignmentAPI } from "../services/api";
import { toId } from "../utils/projectHelpers";

import {
  Plus, Trash2, Save, X, Edit, Check, AlertCircle,
  Award, Zap, ChevronLeft, RefreshCw, Loader, ClipboardCheck, Eye
} from "lucide-react";

const TEMPLATES = {
  programming: [
    { name: "Code Quality", description: "Clean code, naming, comments, no duplication", weight: 30 },
    { name: "Documentation", description: "SRS, design doc, user manual completeness", weight: 20 },
    { name: "Functionality", description: "Features work, edge cases handled", weight: 25 },
    { name: "UI/UX Design", description: "Responsive, intuitive, accessible", weight: 10 },
    { name: "Architecture", description: "Scalable, maintainable structure", weight: 10 },
    { name: "Presentation", description: "Clear explanation, Q&A", weight: 5 }
  ],
  web: [
    { name: "Frontend Quality", description: "Components, state management", weight: 25 },
    { name: "Backend Quality", description: "API design, database schema", weight: 25 },
    { name: "Responsive Design", description: "Mobile, tablet, desktop support", weight: 15 },
    { name: "Performance", description: "Load time and optimization", weight: 15 },
    { name: "Security", description: "Auth, input validation", weight: 10 },
    { name: "Documentation", description: "API docs, setup instructions", weight: 10 }
  ],
  research: [
    { name: "Literature Review", description: "Comprehensive source review", weight: 20 },
    { name: "Methodology", description: "Research approach validity", weight: 20 },
    { name: "Analysis", description: "Data analysis quality", weight: 25 },
    { name: "Findings", description: "Results presentation", weight: 20 },
    { name: "References", description: "Citation quality and format", weight: 15 }
  ]
};

const parseCriteriaResponse = (criteriaData) => {
  if (!criteriaData) return { list: [], passingGrade: 60 };
  let criteriaArray = [];
  if (criteriaData.criteria && Array.isArray(criteriaData.criteria)) {
    criteriaArray = criteriaData.criteria;
  } else if (Array.isArray(criteriaData)) {
    criteriaArray = criteriaData;
  }
  return {
    list: criteriaArray.map((c, idx) => ({
      id: c._id || c.id || `criterion-${idx}-${Date.now()}`,
      name: c.name,
      description: c.description || "",
      weight: c.weight,
      maxScore: c.maxScore || 100
    })),
    passingGrade: criteriaData.passingGrade ?? 60
  };
};

const GradingCriteriaPage = () => {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [passingGrade, setPassingGrade] = useState(60);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    weight: 0,
    maxScore: 100
  });

  const totalWeight = useMemo(
    () => criteria.reduce((sum, c) => sum + (c.weight || 0), 0),
    [criteria]
  );

  const courseId = assignment ? toId(assignment.courseId) : "";

  useEffect(() => {
    loadData();
  }, [assignmentId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignmentRes, criteriaRes] = await Promise.all([
        assignmentAPI.getAssignmentById(assignmentId),
        assignmentAPI.getGradingCriteria(assignmentId)
      ]);
      setAssignment(assignmentRes.data.data);
      const parsed = parseCriteriaResponse(criteriaRes.data.data);
      setCriteria(parsed.list);
      setPassingGrade(parsed.passingGrade);
    } catch (err) {
      console.error("Failed to load grading criteria:", err);
      setError(err.response?.data?.message || "Failed to load grading criteria.");
      setCriteria([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", weight: 0, maxScore: 100 });
  };

  const handleAddCriterion = () => {
    if (!formData.name.trim() || formData.weight <= 0) {
      alert("Please enter a criterion name and weight greater than 0.");
      return;
    }
    setCriteria([
      ...criteria,
      {
        id: `new-${Date.now()}`,
        name: formData.name.trim(),
        description: formData.description,
        weight: formData.weight,
        maxScore: formData.maxScore
      }
    ]);
    setShowAddModal(false);
    resetForm();
  };

  const handleUpdateCriterion = () => {
    setCriteria(
      criteria.map((c) => (c.id === editingCriterion.id ? { ...c, ...formData } : c))
    );
    setEditingCriterion(null);
    resetForm();
  };

  const handleDeleteCriterion = async (id) => {
    if (await confirm({
      title: "Delete criterion?",
      message: "This grading criterion will be removed from the current rubric.",
      confirmLabel: "Delete criterion",
    })) {
      setCriteria(criteria.filter((c) => c.id !== id));
    }
  };

  const handleWeightChange = (id, newWeight) => {
    setCriteria(
      criteria.map((c) =>
        c.id === id ? { ...c, weight: Math.max(0, Math.min(100, newWeight)) } : c
      )
    );
  };

  const applyTemplate = async (templateName) => {
    const template = TEMPLATES[templateName];
    if (
      template &&
      await confirm({
        title: "Replace grading criteria?",
        message: `Apply the "${templateName}" template? This will replace all current criteria.`,
        confirmLabel: "Apply template",
      })
    ) {
      setCriteria(
        template.map((t, idx) => ({
          id: `tpl-${templateName}-${idx}`,
          name: t.name,
          description: t.description,
          weight: t.weight,
          maxScore: 100
        }))
      );
    }
  };

  const saveCriteria = async () => {
    if (totalWeight !== 100) {
      alert(`Total weight must be 100%. Currently: ${totalWeight}%`);
      return;
    }
    setSaving(true);
    try {
      await assignmentAPI.updateGradingCriteria(assignmentId, {
        criteria: criteria.map((c) => ({
          name: c.name,
          description: c.description || "",
          weight: c.weight,
          maxScore: c.maxScore || 100
        })),
        passingGrade
      });
      alert("Grading criteria saved successfully!");
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save criteria");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center px-4">
        <AlertCircle size={48} className="text-red-500 mb-3" />
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center gap-2"
        >
          <RefreshCw size={16} /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate(courseId ? `/courses/${courseId}/assignments` : -1)}
          className="text-blue-500 text-sm mb-2 hover:underline flex items-center gap-1"
        >
          <ChevronLeft size={16} /> Back to Assignments
        </button>
        <PageHeader
          title="Grading Criteria"
          subtitle={
            <>
              {assignment?.title} · Total weight: {totalWeight}%
              {totalWeight !== 100 && (
                <span className="text-rose-500 ml-2">Must total 100%</span>
              )}
            </>
          }
          icon={ClipboardCheck}
        >
          <button
            onClick={loadData}
            className="btn-secondary text-sm flex items-center gap-1.5 px-3 py-2"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <Link
            to={`/assignments/${assignmentId}/submissions`}
            className="btn-outline text-sm flex items-center gap-1.5 px-3 py-2"
          >
            <Eye size={14} /> Submissions
          </Link>
          <button
            onClick={saveCriteria}
            disabled={saving || totalWeight !== 100}
            className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-emerald-600 disabled:opacity-50 shadow-sm"
          >
            {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
            Save Criteria
          </button>
        </PageHeader>
      </div>

      {/* Summary + controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Weight"
          value={`${totalWeight}%`}
          note={totalWeight === 100 ? "Ready to save" : "Must equal 100%"}
          icon={Award}
          iconColor={totalWeight === 100 ? "green" : "amber"}
          cardClass={`cute-card p-4 ${totalWeight === 100 ? "cute-card-green" : "cute-card-amber"}`}
        />
        <StatCard
          label="Criteria Count"
          value={criteria.length}
          icon={ClipboardCheck}
          iconColor="blue"
          cardClass="cute-card cute-card-blue p-4"
        />
        <StatCard
          label="Passing Grade"
          value={`${passingGrade}%`}
          note="Minimum to pass"
          icon={Check}
          iconColor="purple"
          cardClass="cute-card cute-card-purple p-4"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="criteria-card cute-card-blue">
          <label className="form-label">Passing Grade</label>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="number"
              value={passingGrade}
              onChange={(e) => setPassingGrade(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
              className="form-input w-28"
              min="0"
              max="100"
            />
            <span className="text-sm text-gray-500">Minimum % required to pass</span>
          </div>
        </div>
        <div className="criteria-card cute-card-amber">
          <p className="form-label flex items-center gap-2 mb-3">
            <Zap size={16} className="text-amber-500" /> Quick Templates
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyTemplate("programming")}
              className="template-btn border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              Programming Project
            </button>
            <button
              type="button"
              onClick={() => applyTemplate("web")}
              className="template-btn border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            >
              Web Development
            </button>
            <button
              type="button"
              onClick={() => applyTemplate("research")}
              className="template-btn border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
            >
              Research Paper
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="template-btn border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center gap-1"
            >
              <Plus size={14} /> Custom
            </button>
          </div>
        </div>
      </div>

      {/* Criteria table */}
      <div className="cute-card overflow-hidden p-0">
        <div className="p-4 border-b border-gray-100 bg-gray-50/90 hidden md:grid grid-cols-12 gap-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <div className="col-span-4">Criterion</div>
          <div className="col-span-4">Description</div>
          <div className="col-span-2 text-center">Weight</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        <div className="divide-y divide-gray-100">
          {criteria.length > 0 ? (
            criteria.map((criterion, idx) => (
              <div key={criterion.id} className="p-4 hover:bg-gray-50/80 transition-colors">
                {editingCriterion?.id === criterion.id ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                    <div className="md:col-span-4">
                      <label className="form-label md:sr-only">Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                        className="form-input"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="form-label md:sr-only">Description</label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                        className="form-input"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="form-label md:sr-only">Weight</label>
                      <input
                        type="number"
                        value={formData.weight}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, weight: parseInt(e.target.value, 10) || 0 }))
                        }
                        className="form-input text-center"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-1 justify-end">
                      <button type="button" onClick={handleUpdateCriterion} className="p-2 rounded-xl hover:bg-green-100 text-green-600">
                        <Check size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCriterion(null)}
                        className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-4 flex items-center gap-2 min-w-0">
                      <IconGlass size="sm" interactive className="text-blue-600 shrink-0">
                        <span className="text-xs font-bold">{idx + 1}</span>
                      </IconGlass>
                      <span className="font-medium text-gray-800 truncate">{criterion.name}</span>
                    </div>
                    <div className="md:col-span-4 text-sm text-gray-500 line-clamp-2">
                      {criterion.description || "No description"}
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                          style={{ width: `${criterion.weight}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          value={criterion.weight}
                          onChange={(e) => handleWeightChange(criterion.id, parseInt(e.target.value, 10))}
                          className="form-range flex-1"
                          min="0"
                          max="100"
                        />
                        <input
                          type="number"
                          value={criterion.weight}
                          onChange={(e) =>
                            handleWeightChange(criterion.id, parseInt(e.target.value, 10) || 0)
                          }
                          className="form-input w-16 text-center font-medium py-1.5"
                          min="0"
                          max="100"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    </div>
                    <div className="md:col-span-2 flex gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCriterion(criterion);
                          setFormData({
                            name: criterion.name,
                            description: criterion.description || "",
                            weight: criterion.weight,
                            maxScore: criterion.maxScore || 100
                          });
                        }}
                        className="p-2 rounded-xl hover:bg-blue-100 text-blue-500"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCriterion(criterion.id)}
                        className="p-2 rounded-xl hover:bg-red-100 text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <Award size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No grading criteria defined yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Use a template or add custom criteria — weights must total 100%
              </p>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="mt-3 btn-primary text-sm inline-flex items-center gap-1"
              >
                <Plus size={14} /> Add your first criterion
              </button>
            </div>
          )}
        </div>

        {criteria.length > 0 && (
          <div className="p-4 border-t bg-gray-50 flex justify-between items-center flex-wrap gap-2">
            <div>
              <span className="text-sm font-medium text-gray-700">Total Weight: </span>
              <span className={`text-lg font-bold ${totalWeight === 100 ? "text-emerald-600" : "text-rose-600"}`}>
                {totalWeight}%
              </span>
            </div>
            {totalWeight === 100 ? (
              <span className="flex items-center gap-1 text-emerald-600 text-sm">
                <Check size={14} /> Ready to save and use when grading
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 text-sm">
                <AlertCircle size={14} /> Adjust weights to reach 100%
              </span>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-4 text-sm text-blue-800 flex items-start gap-3">
        <IconGlass size="sm" interactive className="text-blue-600 shrink-0">
          <ClipboardCheck size={16} />
        </IconGlass>
        <p>
          These criteria are used on the <strong>Submissions</strong> page when you grade projects for this assignment.
          Save here first, then grade student work with weighted scores.
        </p>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-panel max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <IconGlass size="md" interactive className="text-blue-500">
                  <Plus size={20} />
                </IconGlass>
                <h2 className="text-lg font-bold text-gray-800">Add Criterion</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div>
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="form-input"
                  placeholder="e.g., Code Quality"
                />
              </div>
              <div>
                <label className="form-label">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="form-textarea"
                  placeholder="What students are evaluated on…"
                />
              </div>
              <div>
                <label className="form-label">Weight (%) *</label>
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData((p) => ({ ...p, weight: parseInt(e.target.value, 10) || 0 }))}
                  className="form-input"
                  min="0"
                  max="100"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={handleAddCriterion} className="flex-1 btn-primary">
                Add Criterion
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
};

export default GradingCriteriaPage;
