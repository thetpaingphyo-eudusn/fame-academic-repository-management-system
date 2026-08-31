import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('teacherToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('teacherToken');
      localStorage.removeItem('teacherUser');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH APIS ====================
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    api.put('/auth/change-password', { currentPassword, newPassword })
};

// ==================== TEACHER DASHBOARD ====================
export const dashboardAPI = {
  getTeacherDashboard: () => api.get('/dashboard/teacher')
};

// ==================== TEACHER PROJECT APIS ====================
export const projectAPI = {
  getMyProjects: (params) => api.get('/teacher/projects', { params }),
  getProjectById: (id) => api.get(`/teacher/projects/${id}`),
  getProjectHealth: (id) => api.get(`/teacher/projects/${id}/health`),
  gradeProject: (id, data) => api.post(`/teacher/projects/${id}/grade`, data),
  approveProject: (id, notes) => api.put(`/teacher/projects/${id}/approve`, { notes }),
  rejectProject: (id, notes) => api.put(`/teacher/projects/${id}/reject`, { notes }),
  requestRevision: (id, revisionNotes) => api.put(`/teacher/projects/${id}/revision`, { revisionNotes })
};

// ==================== TEACHER COURSE APIS ====================
export const courseAPI = {
  getMyCourses: () => api.get('/teacher/courses'),
  getCourseById: (id) => api.get(`/teacher/courses/${id}`),
  createCourse: (data) => api.post('/teacher/courses', data),
  updateCourse: (id, data) => api.put(`/teacher/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/teacher/courses/${id}`),
  getStudentsByCourse: (courseId) => api.get(`/teacher/courses/${courseId}/students`),
  assignStudentToCourse: (courseId, studentId) =>
    api.post(`/teacher/courses/${courseId}/students/${studentId}/assign`)
};

// ==================== TEACHER ASSIGNMENT APIS ====================
export const assignmentAPI = {
  getMyAssignments: () => api.get('/teacher/assignments'),
  getAssignmentsByCourse: (courseId) => api.get(`/teacher/courses/${courseId}/assignments`),
  getAssignmentById: (id) => api.get(`/teacher/assignments/${id}`),
  createAssignment: (data) => api.post('/teacher/assignments', data),
  updateAssignment: (id, data) => api.put(`/teacher/assignments/${id}`, data),
  deleteAssignment: (id) => api.delete(`/teacher/assignments/${id}`),
  getSubmissionsByAssignment: (assignmentId) =>
    api.get(`/teacher/assignments/${assignmentId}/submissions`),
  getGradingCriteria: (assignmentId) => api.get(`/teacher/assignments/${assignmentId}/criteria`),
  updateGradingCriteria: (assignmentId, data) =>
    api.put(`/teacher/assignments/${assignmentId}/criteria`, data)
};

// ==================== TEACHER SUBMISSION APIS ====================
export const submissionAPI = {
  gradeSubmission: (id, data) => api.post(`/teacher/submissions/${id}/grade`, data),
  approveSubmission: (id) => api.put(`/teacher/submissions/${id}/approve`),
  requestRevision: (id, revisionNotes) =>
    api.put(`/teacher/submissions/${id}/revision`, { revisionNotes })
};

// ==================== TEACHER FEEDBACK APIS ====================
export const feedbackAPI = {
  getMyFeedback: () => api.get('/teacher/feedback'),
  updateFeedback: (id, data) => api.put(`/teacher/feedback/${id}`, data)
};

// ==================== TEACHER STUDENT APIS ====================
export const studentAPI = {
  searchAvailableStudents: (params) => api.get('/teacher/students/available', { params }),
  updateStudent: (id, data) => api.put(`/teacher/students/${id}`, data),
  deleteStudent: (id) => api.delete(`/teacher/students/${id}`),
  getStudentById: (id) => api.get(`/teacher/students/${id}`),
  getStudentsByCourse: (courseId) => api.get(`/teacher/courses/${courseId}/students`),
  getAllStudents: () => api.get('/teacher/students'),
  enrollInCourse: (courseId, studentId) =>
    api.post(`/teacher/courses/${courseId}/students/${studentId}/assign`)
};

// ==================== UPLOAD APIS ====================
export const uploadAPI = {
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteFile: (publicId) => api.delete(`/upload/file/${publicId}`)
};

// ==================== AI APIS ====================
export const aiAPI = {
  analyzeDependencies: (dependencies) => api.post('/ai/analyze-dependencies', { dependencies }),
  analyzeCode: (code) => api.post('/ai/analyze-code', { code })
};

// ==================== SEARCH APIS ====================
export const searchAPI = {
  basic: (query) => api.post('/search/basic', { query }),
  semantic: (query) => api.post('/search/semantic', { query })
};

// ==================== NOTIFICATION APIS ====================
export const notificationAPI = {
  sendToStudents: (data) => api.post('/teacher/notifications/send', data),
};

export default api;
