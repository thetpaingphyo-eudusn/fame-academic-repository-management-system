import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import GradingCriteriaView from "../components/GradingCriteriaView";
import PageHeader from "../components/PageHeader";
import { courseAPI, feedbackAPI } from "../services/api";
import { getRequiredFileLabel } from "../utils/submissionRequirements";
import { parseGradingCriteria } from "../utils/gradingHelpers";

import {
  ArrowLeft, FileText, Calendar, Clock, CheckCircle, XCircle,
  AlertCircle, Loader, Upload, Eye, BookOpen, Sliders
} from 'lucide-react';

const AssignmentDetail = () => {
  const { courseId, assignmentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [passingGrade, setPassingGrade] = useState(60);
  const [criterionScores, setCriterionScores] = useState([]);

  useEffect(() => {
    loadAssignmentData();
  }, [courseId, assignmentId]);

  const loadAssignmentData = async () => {
    setLoading(true);
    try {
      const res = await courseAPI.getAssignmentsByCourse(courseId);
      const data = res.data.data;
      const found = (data?.assignments || []).find((a) => a._id === assignmentId);

      if (!found) {
        toast.error('Assignment not found');
        navigate(`/courses/${courseId}`);
        return;
      }

      setCourse(data.course);
      setAssignment(found);

      const [criteriaRes, feedbackRes] = await Promise.all([
        courseAPI.getAssignmentCriteria(assignmentId),
        found.submission?._id
          ? feedbackAPI.getProjectFeedback(found.submission._id).catch(() => null)
          : Promise.resolve(null)
      ]);

      const criteriaData = criteriaRes.data.data;
      setCriteria(parseGradingCriteria(criteriaData));
      setPassingGrade(criteriaData?.passingGrade ?? 60);

      const feedback = feedbackRes?.data?.data;
      setCriterionScores(feedback?.criterionScores || []);
    } catch (error) {
      console.error('Failed to load assignment:', error);
      toast.error('Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const map = {
      not_started: { cls: 'bg-gray-100 text-gray-700', label: 'Not Started' },
      not_open: { cls: 'bg-slate-100 text-slate-700', label: 'Not Open Yet' },
      open: { cls: 'bg-blue-100 text-blue-700', label: 'Open for Submission' },
      pending: { cls: 'bg-amber-100 text-amber-700', label: 'Pending Review' },
      submitted: { cls: 'bg-sky-100 text-sky-700', label: 'Submitted' },
      graded: { cls: 'bg-purple-100 text-purple-700', label: 'Graded' },
      approved: { cls: 'bg-emerald-100 text-emerald-700', label: 'Approved' },
      rejected: { cls: 'bg-rose-100 text-rose-700', label: 'Rejected' },
      revision: { cls: 'bg-orange-100 text-orange-700', label: 'Revision Required' },
      missed: { cls: 'bg-red-100 text-red-700', label: 'Missed Deadline' }
    };
    return map[status] || map.not_started;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!assignment) return null;

  const statusBadge = getStatusBadge(assignment.submissionStatus);
  const project = assignment.submission;
  const canSubmit = !project && ['open', 'not_started'].includes(assignment.submissionStatus);
  const canViewProject = !!project;

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(`/courses/${courseId}`)}
        className="text-emerald-500 text-sm hover:underline flex items-center gap-1"
      >
        <ArrowLeft size={16} /> Back to {course?.name || 'Course'}
      </button>

      <div className="bg-white rounded-2xl border border-emerald-100 p-6">
        <PageHeader
          title={assignment.title}
          subtitle={
            <>
              <span className="flex items-center gap-1">
                <BookOpen size={14} /> {course?.code} · {course?.name}
              </span>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${statusBadge.cls}`}>
                {statusBadge.label}
              </span>
            </>
          }
          icon={FileText}
        >
          {canSubmit && (
            <button
              onClick={() => navigate(`/projects/upload?course=${courseId}&assignment=${assignmentId}`)}
              className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm hover:bg-emerald-600 flex items-center gap-2"
            >
              <Upload size={16} /> Submit Project
            </button>
          )}
          {canViewProject && (
            <button
              onClick={() => navigate(`/projects/${project._id}`)}
              className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm hover:bg-blue-600 flex items-center gap-2"
            >
              <Eye size={16} /> View My Project
            </button>
          )}
        </PageHeader>

        <p className="text-gray-600 mt-4">{assignment.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400">Opens</p>
            <p className="text-sm font-medium text-gray-800">{formatDate(assignment.openDate)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400">Due Date</p>
            <p className="text-sm font-medium text-gray-800">{formatDate(assignment.dueDate)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400">Late Submission</p>
            <p className="text-sm font-medium text-gray-800">
              {assignment.allowLate ? `Allowed (${assignment.latePenalty}% penalty)` : 'Not allowed'}
            </p>
          </div>
        </div>

        {assignment.requiredFiles?.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-medium text-gray-700 mb-2">Required Files</p>
            <div className="flex flex-wrap gap-2">
              {assignment.requiredFiles.map((file) => (
                <span key={file} className="px-2 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {getRequiredFileLabel(file)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-emerald-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Sliders size={18} className="text-emerald-500" />
          Grading Criteria
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Your project will be graded against these criteria. Each criterion has a weight that contributes to your final score.
        </p>
        <GradingCriteriaView
          criteria={criteria}
          passingGrade={passingGrade}
          criterionScores={criterionScores}
          showScores={criterionScores.length > 0}
        />
      </div>

      <div className="bg-white rounded-2xl border border-emerald-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FileText size={18} className="text-emerald-500" />
          My Project for This Assignment
        </h2>

        {project ? (
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="font-medium text-gray-800">{project.title}</p>
                <p className="text-sm text-gray-500 mt-1">Status: {project.status}</p>
                <p className="text-sm text-gray-500">Submitted: {formatDate(project.submittedAt)}</p>
                {project.grade != null && (
                  <p className="text-sm text-purple-600 font-medium mt-1">Grade: {project.grade}%</p>
                )}
                {project.teacherFeedback && (
                  <p className="text-sm text-gray-600 mt-2 bg-white rounded-lg p-3 border border-gray-200">
                    Feedback: {project.teacherFeedback}
                  </p>
                )}
              </div>
              <button
                onClick={() => navigate(`/projects/${project._id}`)}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm hover:bg-emerald-600 h-fit flex items-center gap-2"
              >
                <Eye size={16} /> Open Project Detail
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 border border-dashed border-gray-300 rounded-xl">
            <AlertCircle size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-600">You have not submitted a project for this assignment yet.</p>
            {canSubmit && (
              <button
                onClick={() => navigate(`/projects/upload?course=${courseId}&assignment=${assignmentId}`)}
                className="mt-3 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 inline-flex items-center gap-2"
              >
                <Upload size={16} /> Upload Project Now
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignmentDetail;
