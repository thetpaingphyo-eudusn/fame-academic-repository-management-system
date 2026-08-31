import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('studentToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 response
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('studentToken');
      localStorage.removeItem('studentUser');
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

// ==================== STUDENT COURSE APIS ====================
export const courseAPI = {
  getMyCourses: () => api.get('/student/courses'),
  getCourseById: (id) => api.get(`/student/courses/${id}`),
  getAssignmentsByCourse: (courseId) => api.get(`/student/courses/${courseId}/assignments`),
  getAssignmentCriteria: (assignmentId) => api.get(`/student/assignments/${assignmentId}/criteria`)
};

// ==================== STUDENT PROJECT APIS ====================
export const projectAPI = {
  getMyProjects: (params) => api.get('/student/projects', { params }),
  getProjectById: (id) => api.get(`/student/projects/${id}`),
  createProject: (data) => api.post('/student/projects', data),
  uploadProjectFiles: (projectId, formData) => api.post(`/student/projects/${projectId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getProjectVersions: (id) => api.get(`/student/projects/${id}/versions`),
  getProjectAiAnalyses: (id) => api.get(`/student/projects/${id}/ai-analyses`),
  analyzeProjectVersion: (projectId, versionId) =>
    api.post(`/student/projects/${projectId}/versions/${versionId}/analyze`),
  downloadProject: (id) => api.get(`/student/projects/${id}/download`)
};

// ==================== STUDENT FEEDBACK APIS ====================
export const feedbackAPI = {
  getMyFeedback: () => api.get('/student/feedback'),
  getProjectFeedback: (id) => api.get(`/student/projects/${id}/feedback`)
};

// ==================== STUDENT PROFILE APIS ====================
export const studentAPI = {
  getProfile: () => api.get('/student/profile'),
  updateProfile: (data) => api.put('/student/profile', data),
  getMyProjects: (params) => api.get('/student/projects', { params }),
  getMyStats: () => api.get('/student/stats')
  
};
export const aiAPI = {
  analyzeDependencies: (dependencies) => api.post('/ai/analyze-dependencies', { dependencies }),
  analyzeCodeHealth: (code) => api.post('/ai/analyze-code-health', { code })
};

// ==================== DEFAULT EXPORT ====================
export default api;