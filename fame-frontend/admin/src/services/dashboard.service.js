import api from "./api";

export const dashboardService = {
  // Get dashboard stats
  getStats: async () => {
    const response = await api.get('/admin/dashboard/stats')
    return response.data.data
  },

  // Get all projects with filters
  getProjects: async (params = {}) => {
    const response = await api.get('/admin/projects', { params })
    return response.data
  },

  // Get all users with role filter
  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params })
    return response.data
  },

  // Get departments
  getDepartments: async () => {
    const response = await api.get('/admin/departments')
    return response.data.data
  },

  // Get courses
  getCourses: async () => {
    const response = await api.get('/admin/courses')
    return response.data.data
  }
}