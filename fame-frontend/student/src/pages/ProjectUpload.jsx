import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { aiAPI, courseAPI, projectAPI } from "../services/api";
import FameThinking from "../components/FameThinking";
import GradingCriteriaView from "../components/GradingCriteriaView";
import { FAME } from "../utils/fameBrand";
import { parseGradingCriteria } from "../utils/gradingHelpers";
import {
  appendSubmissionFiles,
  createEmptySubmissionFiles,
  getRequiredFileSpecs,
  validateSubmissionFiles,
} from "../utils/submissionRequirements";
import PageHeader from "../components/PageHeader";

import { 
  ArrowLeft, Upload, FileText, Code, File, CheckCircle, 
  XCircle, AlertCircle, Loader, Calendar, Clock, 
  BookOpen, GraduationCap, Paperclip, Send, X,
  Brain, Zap, Shield, TrendingUp, Sparkles, Heart, Sliders
} from 'lucide-react';

const canSubmitToAssignment = (assignment) => {
  if (!assignment) return false;
  if (['revision', 'rejected'].includes(assignment.submissionStatus)) return true;
  if (assignment.submission) return false;
  return ['open', 'not_started'].includes(assignment.submissionStatus);
};

const ProjectUpload = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dependencyFile, setDependencyFile] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [showAllRecommendations, setShowAllRecommendations] = useState(false);
  const [criteria, setCriteria] = useState([]);
  const [passingGrade, setPassingGrade] = useState(60);
  const [selectedAssignmentInfo, setSelectedAssignmentInfo] = useState(null);
  
  // Get courseId from URL params if present
  const queryParams = new URLSearchParams(location.search);
  const preSelectedCourse = queryParams.get('course');
  const preSelectedAssignment = queryParams.get('assignment');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: user?.department || 'CS',
    year: user?.year || '',
    section: user?.section || '',
    files: createEmptySubmissionFiles()
  });

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadAssignments(selectedCourse);
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedAssignment) {
      loadAssignmentCriteria(selectedAssignment);
    } else {
      setCriteria([]);
      setPassingGrade(60);
      setSelectedAssignmentInfo(null);
    }
  }, [selectedAssignment, assignments]);

  const loadAssignmentCriteria = async (assignmentId) => {
    const info = assignments.find((a) => a._id === assignmentId);
    setSelectedAssignmentInfo(info || null);

    try {
      const res = await courseAPI.getAssignmentCriteria(assignmentId);
      const data = res.data.data;
      setCriteria(parseGradingCriteria(data));
      setPassingGrade(data?.passingGrade ?? 60);
    } catch (error) {
      console.error('Failed to load criteria:', error);
      setCriteria([]);
    }
  };

  const requiredFileSpecs = getRequiredFileSpecs(selectedAssignmentInfo?.requiredFiles);
  const maxUploadSizeMb = selectedAssignmentInfo?.maxFileSize || 200;

  useEffect(() => {
    if (selectedAssignment) {
      setFormData((prev) => ({
        ...prev,
        files: createEmptySubmissionFiles(),
      }));
      setDependencyFile(null);
      setAiAnalysis(null);
      setShowAISuggestions(false);
    }
  }, [selectedAssignment]);

  useEffect(() => {
    if (preSelectedCourse) {
      setSelectedCourse(preSelectedCourse);
    }
    if (preSelectedAssignment) {
      setSelectedAssignment(preSelectedAssignment);
    }
  }, [preSelectedCourse, preSelectedAssignment]);

  const submittableAssignments = assignments.filter(canSubmitToAssignment);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await courseAPI.getMyCourses();
      setCourses(res.data.data || []);
    } catch (error) {
      console.error('Failed to load courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async (courseId) => {
    try {
      const res = await courseAPI.getAssignmentsByCourse(courseId);
      const assignmentsData = res.data.data?.assignments || res.data.data || [];
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Failed to load assignments:', error);
      setAssignments([]);
    }
  };

  const analyzeDependencyFile = async (file) => {
    if (!file) return;
    
    setAnalyzing(true);
    setAiAnalysis(null);
    
    try {
      const fileContent = await readFileAsText(file);
      const fileName = file.name;
      
      // Determine file type
      let dependencies = [];
      if (fileName === 'package.json') {
        const packageJson = JSON.parse(fileContent);
        dependencies = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };
      } else if (fileName === 'requirements.txt') {
        const lines = fileContent.split('\n');
        lines.forEach(line => {
          const match = line.match(/^([a-zA-Z0-9_-]+)([=<>!~]+)([0-9.]+)?/);
          if (match) {
            dependencies[match[1]] = match[3] || 'latest';
          }
        });
      }
      
      const depArray = Object.entries(dependencies).map(([name, version]) => ({
        name,
        version: version.toString()
      }));
      
      const response = await aiAPI.analyzeDependencies(depArray);
      setAiAnalysis(response.data.data);
      setShowAISuggestions(true);
      setShowAllRecommendations(false);
      toast.success('AI analysis complete! Check suggestions below.');
    } catch (error) {
      console.error('AI Analysis failed:', error);
      toast.error('Failed to analyze dependencies');
    } finally {
      setAnalyzing(false);
    }
  };

  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const validateSelectedFile = (file, fileType) => {
    const spec = requiredFileSpecs.find((item) => item.field === fileType);
    if (!spec) return true;

    const fileName = file.name.toLowerCase();
    if (spec.kind === 'zip' && !fileName.endsWith('.zip')) {
      toast.error(`${spec.label} must be a ZIP archive`);
      return false;
    }
    if (spec.kind === 'pdf' && file.type !== 'application/pdf') {
      toast.error(`${spec.label} must be a PDF file`);
      return false;
    }
    if (spec.kind === 'presentation' && !/\.(pdf|ppt|pptx)$/.test(fileName)) {
      toast.error(`${spec.label} must be PDF or PowerPoint`);
      return false;
    }
    if (spec.kind === 'video' && !/\.(mp4|mov|webm)$/.test(fileName)) {
      toast.error(`${spec.label} must be MP4, MOV, or WEBM`);
      return false;
    }
    return true;
  };

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > maxUploadSizeMb * 1024 * 1024) {
        toast.error(`${fileType} file size exceeds ${maxUploadSizeMb}MB limit`);
        return;
      }

      if (fileType !== 'dependencyFile' && !validateSelectedFile(file, fileType)) {
        return;
      }
      
      if (fileType === 'dependencyFile') {
        setDependencyFile(file);
        analyzeDependencyFile(file);
      }
      
      setFormData(prev => ({
        ...prev,
        files: { ...prev.files, [fileType]: file }
      }));
    }
  };

  const removeFile = (fileType) => {
    if (fileType === 'dependencyFile') {
      setDependencyFile(null);
      setAiAnalysis(null);
      setShowAISuggestions(false);
    }
    setFormData(prev => ({
      ...prev,
      files: { ...prev.files, [fileType]: null }
    }));
  };

  const validateForm = () => {
    if (!selectedCourse) {
      toast.error('Please select a course');
      return false;
    }
    if (!selectedAssignment) {
      toast.error('Please select an assignment');
      return false;
    }
    if (!canSubmitToAssignment(selectedAssignmentInfo)) {
      toast.error('This assignment is not open for submission');
      return false;
    }
    if (!formData.title.trim()) {
      toast.error('Please enter project title');
      return false;
    }
    if (!formData.description.trim()) {
      toast.error('Please enter project description');
      return false;
    }
    const missingFiles = validateSubmissionFiles(selectedAssignmentInfo?.requiredFiles, formData.files);
    if (missingFiles.length > 0) {
      toast.error(`Please upload required files: ${missingFiles.join(', ')}`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    setUploadProgress(0);
    
    try {
      // Step 1: Create project
      setUploadProgress(10);
      const projectData = {
        title: formData.title,
        description: formData.description,
        assignmentId: selectedAssignment,
        department: formData.department,
        year: parseInt(formData.year) || user?.year,
        section: formData.section || user?.section
      };
      
      const projectRes = await projectAPI.createProject(projectData);
      const projectId = projectRes.data.data._id;
      setUploadProgress(30);
      
      // Step 2: Upload files
      const uploadFormData = new FormData();
      appendSubmissionFiles(uploadFormData, formData.files);
      
      setUploadProgress(50);
      await projectAPI.uploadProjectFiles(projectId, uploadFormData);
      setUploadProgress(100);
      
      toast.success('Project uploaded successfully with AI analysis!');
      navigate(`/projects/${projectId}`);
    } catch (error) {
      console.error('Failed to upload project:', error);
      toast.error(error.response?.data?.message || 'Failed to upload project');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const getHealthColor = (score) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-100';
    if (score >= 60) return 'text-amber-600 bg-amber-100';
    return 'text-rose-600 bg-rose-100';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/my-courses')}
          className="text-emerald-500 text-sm hover:underline flex items-center gap-1"
        >
          <ArrowLeft size={16} /> Back to My Courses
        </button>
        <div className="text-center py-16 bg-white rounded-2xl border border-emerald-100">
          <BookOpen size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium">You are not enrolled in any courses yet</p>
          <p className="text-sm text-gray-400 mt-1">Ask your teacher or admin to enroll you before uploading a project.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button 
          onClick={() => navigate(selectedCourse ? `/courses/${selectedCourse}` : '/my-courses')} 
          className="text-emerald-500 text-sm mb-2 hover:underline flex items-center gap-1"
        >
          <ArrowLeft size={16} /> Back to Course
        </button>
        <PageHeader
          title="Upload New Project"
          subtitle="Submit your project with AI-powered dependency analysis"
          icon={Upload}
        />
      </div>

      {/* Main Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 space-y-5">
            {/* Course Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Course <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                required
              >
                <option value="">-- Select a course --</option>
                {courses.map(course => (
                  <option key={course._id} value={course._id}>
                    {course.courseName} ({course.courseCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Assignment Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Assignment <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedAssignment}
                onChange={(e) => setSelectedAssignment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                disabled={!selectedCourse}
                required
              >
                <option value="">-- Select an assignment --</option>
                {submittableAssignments.map(assignment => (
                  <option key={assignment._id} value={assignment._id}>
                    {assignment.title} - Due: {new Date(assignment.dueDate).toLocaleDateString()}
                  </option>
                ))}
              </select>
              {selectedCourse && assignments.length > 0 && submittableAssignments.length === 0 && (
                <p className="text-xs text-amber-500 mt-1">No open assignments available — you may have already submitted or missed the deadline.</p>
              )}
              {selectedCourse && assignments.length === 0 && (
                <p className="text-xs text-amber-500 mt-1">No assignments published for this course yet.</p>
              )}
            </div>

            {selectedAssignment && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                <h3 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                  <Sliders size={16} className="text-emerald-500" />
                  Grading Rubric
                </h3>
                {selectedAssignmentInfo && (
                  <p className="text-xs text-gray-500 mb-3">
                    Due {new Date(selectedAssignmentInfo.dueDate).toLocaleString()}
                    {selectedAssignmentInfo.gradingCriteria?.hasCriteria && (
                      <> · {selectedAssignmentInfo.gradingCriteria.count} criteria</>
                    )}
                  </p>
                )}
                <GradingCriteriaView criteria={criteria} passingGrade={passingGrade} />
              </div>
            )}

            {/* Project Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="Enter your project title"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="Describe your project, features, technologies used..."
                required
              />
            </div>

            {/* Academic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  placeholder="e.g., CS"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                >
                  <option value="">Select Year</option>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                  <option value="5">Year 5</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <input
                  type="text"
                  value={formData.section}
                  onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  placeholder="A, B, C"
                  maxLength={1}
                />
              </div>
            </div>

            {/* File Uploads */}
            <div className="space-y-4">
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-500" />
                  Project Files
                </h3>
                
                {selectedAssignmentInfo && (
                  <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Required by your teacher</p>
                    <div className="flex flex-wrap gap-2">
                      {requiredFileSpecs.map((spec) => (
                        <span
                          key={spec.key}
                          className="px-2 py-1 text-xs rounded-full bg-white text-emerald-700 border border-emerald-200"
                        >
                          {spec.label}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Maximum file size: {maxUploadSizeMb}MB per file</p>
                  </div>
                )}

                {!selectedAssignment && (
                  <p className="text-sm text-gray-500 mb-4">Select an assignment to see required submission files.</p>
                )}

                {requiredFileSpecs.map((spec) => (
                  <div key={spec.key} className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {spec.label} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                          {spec.icon === 'code' ? (
                            <Code size={18} className="text-blue-500" />
                          ) : (
                            <FileText size={18} className="text-emerald-500" />
                          )}
                          <span className="text-sm text-gray-600">
                            {formData.files[spec.field]?.name || `Choose ${spec.shortLabel}`}
                          </span>
                        </div>
                        <input
                          type="file"
                          accept={spec.accept}
                          onChange={(e) => handleFileChange(e, spec.field)}
                          className="hidden"
                          disabled={!selectedAssignment}
                        />
                      </label>
                      {formData.files[spec.field] && (
                        <button
                          type="button"
                          onClick={() => removeFile(spec.field)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Dependency File with AI Analysis */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dependency File <span className="text-emerald-500">(AI Analysis Available)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer">
                      <div className={`flex items-center gap-2 px-4 py-2 border rounded-xl transition-colors ${
                        analyzing ? 'bg-purple-50 border-purple-300' : 'border-gray-200 hover:bg-gray-50'
                      }`}>
                        {analyzing ? (
                          <Loader size={18} className="text-purple-500 animate-spin" />
                        ) : (
                          <Brain size={18} className="text-purple-500" />
                        )}
                        <span className="text-sm text-gray-600">
                          {formData.files.dependencyFile ? formData.files.dependencyFile.name : 'Choose package.json or requirements.txt'}
                        </span>
                      </div>
                      <input
                        type="file"
                        accept=".json,.txt"
                        onChange={(e) => handleFileChange(e, 'dependencyFile')}
                        className="hidden"
                      />
                    </label>
                    {formData.files.dependencyFile && (
                      <button
                        type="button"
                        onClick={() => removeFile('dependencyFile')}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Upload package.json or requirements.txt for AI-powered dependency analysis and security checks
                  </p>
                  {analyzing && (
                    <div className="mt-3">
                      <FameThinking size="sm" label={`${FAME} is analyzing dependencies`} />
                    </div>
                  )}
                  {showAISuggestions && aiAnalysis && (
                    <div className="mt-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-200">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                          <Brain size={20} className="text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start flex-wrap gap-2">
                            <h3 className="font-semibold text-gray-800">AI Dependency Analysis</h3>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthColor(aiAnalysis.healthScore)}`}>
                              Health Score: {aiAnalysis.healthScore}%
                            </div>
                          </div>
                          <div className="mt-3 space-y-2">
                            {(showAllRecommendations
                              ? aiAnalysis.recommendations
                              : aiAnalysis.recommendations?.slice(0, 3)
                            )?.map((rec, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-sm">
                                {rec.type === 'critical' ? (
                                  <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                                ) : rec.type === 'high' ? (
                                  <AlertCircle size={14} className="text-orange-500 mt-0.5 shrink-0" />
                                ) : (
                                  <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                                )}
                                <div className="text-gray-600 min-w-0">
                                  <p>{rec.message}</p>
                                  {rec.action && (
                                    <p className="text-xs text-gray-500 mt-0.5 break-words">
                                      Fix: <code className="font-mono">{rec.action}</code>
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          {aiAnalysis.recommendations?.length > 3 && (
                            <button
                              type="button"
                              onClick={() => setShowAllRecommendations((prev) => !prev)}
                              className="mt-3 text-xs text-purple-600 hover:underline"
                            >
                              {showAllRecommendations
                                ? 'Show fewer suggestions'
                                : `Show all ${aiAnalysis.recommendations.length} suggestions`}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => navigate('/my-projects')}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {submitting ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                {submitting ? 'Uploading...' : 'Submit Project'}
              </button>
            </div>

            {/* Upload Progress */}
            {submitting && uploadProgress > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Info Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-100">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <GraduationCap size={18} className="text-emerald-500" />
              Submission Guidelines
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="text-emerald-500 mt-0.5" />
                <span>Ensure your code is properly zipped</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="text-emerald-500 mt-0.5" />
                <span>Include all required documentation</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="text-emerald-500 mt-0.5" />
                <span>Upload dependency file for AI analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle size={14} className="text-emerald-500 mt-0.5" />
                <span>Maximum file size follows your assignment setting</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-5 border border-purple-100">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Zap size={18} className="text-purple-500" />
              AI Features
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <Brain size={14} className="text-purple-500 mt-0.5" />
                <span>Automatic dependency vulnerability detection</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield size={14} className="text-purple-500 mt-0.5" />
                <span>Security issue identification</span>
              </li>
              <li className="flex items-start gap-2">
                <TrendingUp size={14} className="text-purple-500 mt-0.5" />
                <span>Update recommendations</span>
              </li>
              <li className="flex items-start gap-2">
                <Heart size={14} className="text-purple-500 mt-0.5" />
                <span>Code health score calculation</span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-500" />
              Important Notes
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Submit before the deadline to avoid late penalties</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>You can resubmit if revision is requested</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Check AI suggestions to improve code quality</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectUpload;