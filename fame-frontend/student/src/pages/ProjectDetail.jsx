import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { feedbackAPI, projectAPI } from "../services/api";
import FameThinking from "../components/FameThinking";
import IconGlass from "../components/IconGlass";
import StatCard from "../components/StatCard";
import { FAME, sourceLabel } from "../utils/fameBrand";
import GradingCriteriaView from "../components/GradingCriteriaView";
import { parseGradingCriteria } from "../utils/gradingHelpers";
import {
  appendSubmissionFiles,
  createEmptySubmissionFiles,
  getRequiredFileSpecs,
  validateSubmissionFiles,
} from "../utils/submissionRequirements";

import { 
  ArrowLeft, FileText, Calendar, Clock, User, BookOpen,
  Star, Download, Eye, MessageSquare, CheckCircle, XCircle,
  AlertCircle, RotateCcw, Award, TrendingUp, Zap,
  Code, File, FolderOpen, ExternalLink,
  Send, X, Loader, GraduationCap, Sliders
} from 'lucide-react';

const ProjectDetail = () => {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [versions, setVersions] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [passingGrade, setPassingGrade] = useState(60);
  const [activeTab, setActiveTab] = useState('overview');
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [resubmitData, setResubmitData] = useState({
    title: '',
    description: '',
    files: createEmptySubmissionFiles()
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [savedAnalyses, setSavedAnalyses] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const backendBaseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '') || '';

  const resolveFileUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return `${backendBaseUrl}${url}`;
    return `${backendBaseUrl}/${url}`;
  };

  const openFile = (url, action = 'download') => {
    const resolvedUrl = resolveFileUrl(url);
    if (!resolvedUrl) {
      toast.error('File not available');
      return;
    }
    window.open(resolvedUrl, action === 'preview' ? '_blank' : '_blank');
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (['overview', 'grading', 'feedback', 'ai', 'versions'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [projectRes, versionsRes, feedbackRes, analysesRes] = await Promise.all([
        projectAPI.getProjectById(projectId),
        projectAPI.getProjectVersions(projectId),
        feedbackAPI.getProjectFeedback(projectId),
        projectAPI.getProjectAiAnalyses(projectId)
      ]);
      
      const data = projectRes.data.data;
      const versionsData = versionsRes.data.data || [];
      const analysesData = analysesRes.data.data || [];

      setProject(data?.project || data);
      setAssignment(data?.assignment || null);
      setVersions(versionsData);
      setFeedback(feedbackRes.data.data);
      setSavedAnalyses(analysesData);
      setCriteria(parseGradingCriteria(data?.gradingCriteria));
      setPassingGrade(data?.gradingCriteria?.passingGrade ?? 60);

      const defaultVersion = versionsData.find(v => v.isLatest) || versionsData[0];
      if (defaultVersion) {
        setSelectedVersionId(defaultVersion._id);
      }
    } catch (error) {
      console.error('Failed to load project data:', error);
      console.error('Error details:', error.response?.data);
      setError(error.response?.data?.message || 'Failed to load project details');
      toast.error('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await projectAPI.downloadProject(projectId);
      const { codeZipUrl, srsPdfUrl, designPdfUrl, manualPdfUrl } = res.data.data;
      
      if (codeZipUrl) openFile(codeZipUrl);
      if (srsPdfUrl) openFile(srsPdfUrl, 'preview');
      if (designPdfUrl) openFile(designPdfUrl, 'preview');
      if (manualPdfUrl) openFile(manualPdfUrl, 'preview');
      
      toast.success('Download started');
    } catch (error) {
      console.error('Failed to download:', error);
      toast.error('Failed to download files');
    }
  };

  const resubmitFileSpecs = getRequiredFileSpecs(assignment?.requiredFiles);

  const handleResubmit = async () => {
    if (!resubmitData.title || !resubmitData.description) {
      toast.error('Please fill title and description');
      return;
    }

    const missingFiles = validateSubmissionFiles(assignment?.requiredFiles, resubmitData.files);
    if (missingFiles.length > 0) {
      toast.error(`Please upload required files: ${missingFiles.join(', ')}`);
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await projectAPI.createProject({
        title: resubmitData.title,
        description: resubmitData.description,
        assignmentId: project.assignmentId,
        department: user?.department,
        year: user?.year,
        section: user?.section
      });
      
      const newProjectId = response.data.data._id;
      const formData = new FormData();
      appendSubmissionFiles(formData, resubmitData.files);
      await projectAPI.uploadProjectFiles(newProjectId, formData);
      
      toast.success('Resubmission successful!');
      setShowResubmitModal(false);
      navigate(`/projects/${newProjectId}`);
    } catch (error) {
      console.error('Failed to resubmit:', error);
      toast.error('Failed to resubmit project');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending Review', icon: <Clock size={14} /> },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Submitted', icon: <FileText size={14} /> },
      graded: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Graded', icon: <Star size={14} /> },
      approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved', icon: <CheckCircle size={14} /> },
      rejected: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Rejected', icon: <XCircle size={14} /> },
      revision: { bg: 'bg-sky-100', text: 'text-sky-700', label: 'Revision Required', icon: <RotateCcw size={14} /> }
    };
    return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status, icon: null };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRiskBadgeStyle = (type = 'info') => {
    const map = {
      critical: 'bg-red-100 text-red-700 border-red-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      medium: 'bg-amber-100 text-amber-700 border-amber-200',
      low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      up_to_date: 'bg-blue-100 text-blue-700 border-blue-200',
      info: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return map[type] || map.info;
  };

  // Must be BEFORE any early return — Rules of Hooks
  useEffect(() => {
    if (!selectedVersionId && versions.length > 0) {
      const latest = versions.find(v => v.isLatest) || versions[0];
      setSelectedVersionId(latest._id);
    }
  }, [versions, selectedVersionId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"></div>
          <FileText className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-emerald-400 w-6 h-6 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={48} className="mx-auto text-red-500 mb-3" />
        <p className="text-red-600">{error}</p>
        <button onClick={() => navigate('/my-projects')} className="mt-4 text-emerald-500 hover:underline">
          Back to My Projects
        </button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <FileText size={48} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-500">Project not found</p>
        <button onClick={() => navigate('/my-projects')} className="mt-4 text-emerald-500 hover:underline">
          Back to My Projects
        </button>
      </div>
    );
  }

  const statusBadge = getStatusBadge(project.status);
  const canResubmit = project.status === 'revision' || project.status === 'rejected';
  const latestVersion = versions.find(v => v.isLatest) || versions[0] || null;
  const selectedVersion = versions.find(v => v._id === selectedVersionId) || latestVersion;
  const selectedAnalysis = savedAnalyses.find(a => a.versionId === selectedVersion?._id) || null;
  const aiSummary = selectedAnalysis?.summary || null;
  const aiRecommendations = selectedAnalysis?.recommendations || [];
  const aiDependencies = selectedAnalysis?.dependencies || [];

  const runAiDependencyAnalysis = async () => {
    if (!selectedVersion?._id) {
      toast.error('No project version selected');
      return;
    }

    if (!selectedVersion.dependencies?.length) {
      toast.error('Upload package.json or requirements.txt with this version first');
      return;
    }

    setAiAnalyzing(true);
    try {
      const res = await projectAPI.analyzeProjectVersion(projectId, selectedVersion._id);
      const saved = res.data.data;

      setSavedAnalyses((prev) => {
        const filtered = prev.filter((item) => item.versionId !== saved.versionId);
        return [saved, ...filtered].sort((a, b) => b.versionNumber - a.versionNumber);
      });

      toast.success(`${FAME} analysis saved for this version`);
      setActiveTab('ai');
    } catch (aiError) {
      console.error('AI dependency analysis failed:', aiError);
      toast.error(aiError.response?.data?.message || `${FAME} analysis failed`);
    } finally {
      setAiAnalyzing(false);
    }
  };

  const latestFiles = latestVersion ? [
    {
      key: 'code',
      label: 'Source Code',
      hint: 'Download ZIP file',
      icon: <Code size={18} className="text-blue-600" />,
      iconBg: 'bg-blue-100',
      url: latestVersion.codeZipUrl,
      actions: [{ label: 'Download', icon: <Download size={16} />, type: 'download' }]
    },
    {
      key: 'srs',
      label: 'SRS Document',
      hint: 'Preview or download PDF',
      icon: <File size={18} className="text-red-600" />,
      iconBg: 'bg-red-100',
      url: latestVersion.srsPdfUrl,
      actions: [
        { label: 'Preview', icon: <Eye size={16} />, type: 'preview' },
        { label: 'Download', icon: <Download size={16} />, type: 'download' }
      ]
    },
    {
      key: 'design',
      label: 'Design Document',
      hint: 'Preview or download PDF',
      icon: <File size={18} className="text-purple-600" />,
      iconBg: 'bg-purple-100',
      url: latestVersion.designPdfUrl,
      actions: [
        { label: 'Preview', icon: <Eye size={16} />, type: 'preview' },
        { label: 'Download', icon: <Download size={16} />, type: 'download' }
      ]
    },
    {
      key: 'manual',
      label: 'Manual Document',
      hint: 'Preview or download PDF',
      icon: <File size={18} className="text-emerald-600" />,
      iconBg: 'bg-emerald-100',
      url: latestVersion.manualPdfUrl,
      actions: [
        { label: 'Preview', icon: <Eye size={16} />, type: 'preview' },
        { label: 'Download', icon: <Download size={16} />, type: 'download' }
      ]
    }
  ].filter(file => !!file.url) : [];
  
  // Safely get course name
  const courseName = project.courseName || project.courseId?.courseName || 'N/A';
  const courseCode = project.courseCode || project.courseId?.courseCode || '';
  const courseId = project.courseId?._id || project.courseId;
  const assignmentId = project.assignmentId?._id || project.assignmentId;
  const assignmentTitle = project.assignmentTitle || project.assignmentId?.title || 'N/A';
  const criterionScores = feedback?.criterionScores || [];
  const hasCriteriaScores = criterionScores.length > 0;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button 
        onClick={() => navigate('/my-projects')} 
        className="text-emerald-500 text-sm mb-2 hover:underline flex items-center gap-1"
      >
        <ArrowLeft size={16} /> Back to My Projects
      </button>

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <IconGlass size="md" tone="dark" className="text-white">
                <FileText size={20} className="text-white" />
              </IconGlass>
              <div>
                <h1 className="text-2xl font-bold">{project.title}</h1>
                <p className="text-emerald-100 text-sm">Project ID: {project._id?.slice(-8)}</p>
              </div>
            </div>
            <p className="text-emerald-100 mt-2 line-clamp-2">{project.description}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${statusBadge.bg} ${statusBadge.text}`}>
              {statusBadge.icon}
              {statusBadge.label}
            </span>
            {project.grade && (
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                <p className="text-2xl font-bold">{project.grade}%</p>
                <p className="text-xs text-emerald-100">Grade</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Submitted" value={formatDate(project.submittedAt)} icon={Calendar} iconColor="emerald" cardClass="cute-card cute-card-emerald p-4" />
        <StatCard label="Course" value={courseName} note={courseCode || undefined} icon={BookOpen} iconColor="blue" cardClass="cute-card cute-card-blue p-4" />
        <StatCard label="Version" value={`v${project.currentVersion || 1}`} icon={FileText} iconColor="teal" cardClass="cute-card cute-card-teal p-4" />
        <StatCard label="Last Updated" value={formatDate(project.updatedAt)} icon={Clock} iconColor="purple" cardClass="cute-card cute-card-purple p-4" />
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {[
            { id: 'overview', label: 'Overview', icon: <FileText size={16} /> },
            { id: 'grading', label: 'Grading', icon: <Sliders size={16} /> },
            { id: 'feedback', label: 'Feedback', icon: <MessageSquare size={16} /> },
            { id: 'ai', label: 'AI Analysis', icon: <Zap size={16} /> },
            { id: 'versions', label: 'Versions', icon: <Clock size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            {/* Grade Display */}
            {project.grade && (
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-purple-700">Your Grade</span>
                  <span className="text-2xl font-bold text-purple-700">{project.grade}%</span>
                </div>
                <div className="w-full h-2 bg-purple-200 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${project.grade}%` }} />
                </div>
                {hasCriteriaScores && (
                  <button
                    onClick={() => setActiveTab('grading')}
                    className="mt-3 text-sm text-purple-700 hover:text-purple-900 flex items-center gap-1"
                  >
                    <Sliders size={14} /> View criteria breakdown
                  </button>
                )}
              </div>
            )}

            {criteria.length > 0 && !project.grade && (
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <p className="text-sm text-emerald-800 flex items-center gap-2">
                  <Sliders size={16} />
                  This project will be graded on {criteria.length} criteria
                </p>
                <button
                  onClick={() => setActiveTab('grading')}
                  className="mt-2 text-sm text-emerald-600 hover:underline"
                >
                  View grading rubric
                </button>
              </div>
            )}

            {/* Project Details */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FileText size={16} className="text-emerald-500" />
                Project Details
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400">Title</p>
                  <p className="text-gray-800">{project.title}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Description</p>
                  <p className="text-gray-600">{project.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Course</p>
                    <p className="text-gray-800">{courseName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Assignment</p>
                    {courseId && assignmentId ? (
                      <button
                        onClick={() => navigate(`/courses/${courseId}/assignments/${assignmentId}`)}
                        className="text-emerald-600 hover:underline text-left"
                      >
                        {assignmentTitle}
                      </button>
                    ) : (
                      <p className="text-gray-800">{assignmentTitle}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Department</p>
                    <p className="text-gray-800">{project.department || 'CS'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Year / Section</p>
                    <p className="text-gray-800">Year {project.year}, Section {project.section}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Semester</p>
                    <p className="text-gray-800">{project.semester || 'Current'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Files Section */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FolderOpen size={16} className="text-emerald-500" />
                Project Files
              </h3>
              {latestFiles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {latestFiles.map(file => (
                    <div key={file.key} className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${file.iconBg} rounded-lg flex items-center justify-center`}>
                            {file.icon}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{file.label}</p>
                            <p className="text-xs text-gray-500">{file.hint}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {file.actions.map(action => (
                            <button
                              key={action.label}
                              onClick={() => openFile(file.url, action.type)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-emerald-600 hover:border-emerald-300 transition-colors text-xs"
                              title={`${action.label} ${file.label}`}
                            >
                              {action.icon}
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 bg-gray-50 rounded-xl p-4">
                  No uploaded files found for this project version.
                </div>
              )}
            </div>

            {/* Resubmit Button */}
            {canResubmit && (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-start gap-3">
                  <RotateCcw size={20} className="text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-800">Revision Required</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Your teacher has requested changes. Please review the feedback and resubmit your project.
                    </p>
                    <button
                      onClick={() => setShowResubmitModal(true)}
                      className="mt-3 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 transition-colors flex items-center gap-2"
                    >
                      <RotateCcw size={14} /> Resubmit Project
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Grading Tab */}
        {activeTab === 'grading' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Sliders size={16} className="text-emerald-500" />
                How This Project Is Graded
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Your teacher grades this project using weighted criteria. Each criterion contributes to your final score.
              </p>
              <GradingCriteriaView
                criteria={criteria}
                passingGrade={passingGrade}
                criterionScores={criterionScores}
                showScores={hasCriteriaScores}
              />
            </div>

            {hasCriteriaScores && (
              <div className="rounded-xl bg-purple-50 border border-purple-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-purple-800">Final weighted grade</p>
                    <p className="text-xs text-purple-600 mt-0.5">Calculated from your criteria scores</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-700">{feedback?.grade ?? project.grade}%</p>
                </div>
              </div>
            )}

            {!criteria.length && !hasCriteriaScores && (
              <p className="text-sm text-gray-500">
                Grading criteria will appear here once your instructor publishes them for this assignment.
              </p>
            )}
          </div>
        )}

        {/* Feedback Tab */}
        {activeTab === 'feedback' && (
          <div className="p-6">
            {feedback ? (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare size={18} className="text-blue-600" />
                    <h3 className="font-semibold text-gray-800">Teacher Feedback</h3>
                  </div>
                  <p className="text-gray-700">{feedback.feedbackText || 'No feedback provided'}</p>
                  <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Star size={14} className="text-yellow-500" />
                      Grade: {feedback.grade}%
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {formatDate(feedback.createdAt)}
                    </span>
                  </div>
                </div>

                {hasCriteriaScores && (
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Sliders size={16} className="text-emerald-500" />
                      Criteria Breakdown
                    </h3>
                    <div className="space-y-2">
                      {criterionScores.map((c) => (
                        <div
                          key={c.name}
                          className="flex justify-between items-center gap-3 rounded-lg bg-white px-3 py-2 border border-emerald-100"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                            <p className="text-xs text-gray-400">Weight {c.weight}%</p>
                          </div>
                          <span className="text-sm font-bold text-purple-600 shrink-0">
                            {c.score}/{c.maxScore || 100}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(feedback.codeQualityScore || feedback.documentationScore || feedback.libraryUsageScore) && !hasCriteriaScores && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-800 mb-3">Detailed Scores</h3>
                    <div className="space-y-3">
                      {feedback.codeQualityScore && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Code Quality</span>
                            <span className="text-purple-600 font-medium">{feedback.codeQualityScore}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${feedback.codeQualityScore}%` }} />
                          </div>
                        </div>
                      )}
                      {feedback.documentationScore && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Documentation</span>
                            <span className="text-blue-600 font-medium">{feedback.documentationScore}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${feedback.documentationScore}%` }} />
                          </div>
                        </div>
                      )}
                      {feedback.libraryUsageScore && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Library Usage</span>
                            <span className="text-emerald-600 font-medium">{feedback.libraryUsageScore}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${feedback.libraryUsageScore}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No feedback available yet</p>
                <p className="text-sm text-gray-400 mt-1">Check back after your project is graded</p>
              </div>
            )}
          </div>
        )}

        {/* AI Analysis Tab */}
        {activeTab === 'ai' && (
          <div className="p-6 space-y-5">
            <div className="flex flex-wrap justify-between items-start gap-3">
              <div>
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Zap size={16} className="text-emerald-500" />
                  Saved {FAME} AI Analyses
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Each upload version can have its own saved AI suggestions and dependency report.
                </p>
              </div>
              <button
                onClick={runAiDependencyAnalysis}
                disabled={aiAnalyzing || !selectedVersion}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm hover:bg-emerald-600 disabled:opacity-60 flex items-center gap-2"
              >
                {aiAnalyzing ? <Loader size={14} className="animate-spin" /> : <Zap size={14} />}
                {aiAnalyzing ? `${FAME} is analyzing...` : `Run & Save ${FAME} Analysis`}
              </button>
            </div>

            {aiAnalyzing && <FameThinking className="py-2" />}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1 space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Upload Versions</h4>
                {versions.length > 0 ? (
                  versions.map((version) => {
                    const saved = savedAnalyses.find((a) => a.versionId === version._id);
                    const isSelected = selectedVersionId === version._id;
                    return (
                      <button
                        key={version._id}
                        onClick={() => setSelectedVersionId(version._id)}
                        className={`w-full text-left p-3 rounded-xl border transition-colors ${
                          isSelected
                            ? 'border-emerald-400 bg-emerald-50'
                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-gray-800">Version {version.versionNumber}</p>
                          {version.isLatest && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Latest</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(version.submittedAt)}</p>
                        <p className="text-xs mt-1">
                          {saved
                            ? `Saved score: ${saved.healthScore ?? 'N/A'}%`
                            : 'No saved analysis yet'}
                        </p>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500">No uploaded versions yet.</p>
                )}
              </div>

              <div className="lg:col-span-2">
                {!selectedAnalysis ? (
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center">
                    <Zap size={42} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-600">No saved {FAME} analysis for this version.</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Select a version and click <span className="font-medium">Run & Save {FAME} Analysis</span>.
                    </p>
                  </div>
                ) : selectedAnalysis.error ? (
                  <div className="bg-rose-50 rounded-xl border border-rose-200 p-4">
                    <p className="font-medium text-rose-700">{FAME} analysis failed for this version</p>
                    <p className="text-sm text-rose-600 mt-1">{selectedAnalysis.error}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      <span>Source: {sourceLabel(selectedAnalysis.source || 'gemini')}</span>
                      <span>Analyzed: {formatDate(selectedAnalysis.analyzedAt)}</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                        <p className="text-xs text-emerald-700">Health Score</p>
                        <p className="text-xl font-bold text-emerald-800">{Math.round(selectedAnalysis.healthScore || 0)}%</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                        <p className="text-xs text-blue-700">Dependencies</p>
                        <p className="text-xl font-bold text-blue-800">{aiSummary?.total ?? aiDependencies.length}</p>
                      </div>
                      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                        <p className="text-xs text-rose-700">Critical/High</p>
                        <p className="text-xl font-bold text-rose-800">{(aiSummary?.critical || 0) + (aiSummary?.high || 0)}</p>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <p className="text-xs text-amber-700">Medium/Low</p>
                        <p className="text-xl font-bold text-amber-800">{(aiSummary?.medium || 0) + (aiSummary?.low || 0)}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">{FAME} Suggestions</h4>
                      {aiRecommendations.length > 0 ? (
                        <div className="space-y-2">
                          {aiRecommendations.map((rec, idx) => (
                            <div key={idx} className={`rounded-lg border p-3 ${getRiskBadgeStyle(rec.type)}`}>
                              <p className="text-sm font-medium">{rec.message}</p>
                              {rec.action ? (
                                <p className="text-xs mt-1 opacity-90">
                                  Fix: <code className="font-mono">{rec.action}</code>
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No suggestions saved for this version.</p>
                      )}
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">Dependency Details</h4>
                      {aiDependencies.length > 0 ? (
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                          {aiDependencies.map((dep, idx) => (
                            <div key={`${dep.name}-${idx}`} className="border border-gray-200 rounded-lg p-3 bg-white">
                              <div className="flex justify-between items-center gap-2 flex-wrap">
                                <p className="font-medium text-gray-800">{dep.name}</p>
                                <span className={`text-xs px-2 py-1 rounded-full border ${getRiskBadgeStyle(dep.status || 'info')}`}>
                                  {(dep.status || 'info').replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Current: {dep.currentVersion || dep.version || 'N/A'} | Latest: {dep.latestVersion || 'N/A'}
                              </p>
                              {dep.issue ? <p className="text-sm text-gray-700 mt-1">{dep.issue}</p> : null}
                              {dep.fixCommand ? (
                                <p className="text-xs text-gray-600 mt-1">
                                  Fix command: <code className="font-mono">{dep.fixCommand}</code>
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No dependency details saved.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Versions Tab */}
        {activeTab === 'versions' && (
          <div className="p-6">
            {versions.length > 0 ? (
              <div className="space-y-4">
                {versions.map((version, idx) => (
                  <div key={version._id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">v{version.versionNumber}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">Version {version.versionNumber}</p>
                      <p className="text-xs text-gray-500">Submitted: {formatDate(version.submittedAt)}</p>
                      {version.isLatest && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700">
                          Latest
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => openFile(version.codeZipUrl)}
                      className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Download size={16} className="text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No version history available</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resubmit Modal */}
      {showResubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowResubmitModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Resubmit Project</h2>
              <button onClick={() => setShowResubmitModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-700">
                <p>Please address the feedback from your teacher before resubmitting.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Title *</label>
                <input
                  type="text"
                  value={resubmitData.title}
                  onChange={(e) => setResubmitData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  placeholder="Enter project title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  rows={3}
                  value={resubmitData.description}
                  onChange={(e) => setResubmitData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  placeholder="Describe your project..."
                />
              </div>
              
              {resubmitFileSpecs.map((spec) => (
                <div key={spec.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {spec.label} *
                  </label>
                  <input
                    type="file"
                    accept={spec.accept}
                    onChange={(e) => setResubmitData(prev => ({
                      ...prev,
                      files: { ...prev.files, [spec.field]: e.target.files[0] }
                    }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 p-4 flex gap-3">
              <button onClick={() => setShowResubmitModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-600">
                Cancel
              </button>
              <button onClick={handleResubmit} disabled={submitting} className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                Submit Resubmission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;