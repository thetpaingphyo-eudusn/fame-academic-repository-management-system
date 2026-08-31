import React, { createContext, useContext, useEffect, useState } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('teacherToken')
    if (token) {
      loadUser()
    } else {
      setLoading(false)
    }
  }, [])

  const loadUser = async () => {
    try {
      const response = await authAPI.getMe()
      setUser(response.data.data.user)
    } catch (error) {
      localStorage.removeItem('teacherToken')
      localStorage.removeItem('teacherUser')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const response = await authAPI.login(email, password)
    const { token, user } = response.data.data
    
    // Check if user is teacher
    if (user.role !== 'teacher') {
      throw new Error('Access denied. Teacher role required.')
    }
    
    localStorage.setItem('teacherToken', token)
    localStorage.setItem('teacherUser', JSON.stringify(user))
    setUser(user)
    return user
  }

  const logout = () => {
    localStorage.removeItem('teacherToken')
    localStorage.removeItem('teacherUser')
    setUser(null)
  }

  const refreshUser = async () => {
    const response = await authAPI.getMe()
    const fresh = response.data.data.user
    setUser(fresh)
    localStorage.setItem('teacherUser', JSON.stringify(fresh))
    return fresh
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}