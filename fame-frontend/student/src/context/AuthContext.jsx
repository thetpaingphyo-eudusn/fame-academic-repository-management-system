import React, { createContext, useContext, useEffect, useState } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('studentToken');
    const savedUser = localStorage.getItem('studentUser');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Failed to parse user data', e);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      console.log('Login response:', response.data);
      
      const { token, user: userData } = response.data.data;
      
      localStorage.setItem('studentToken', token);
      localStorage.setItem('studentUser', JSON.stringify(userData));
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const logout = async () => {
    localStorage.removeItem('studentToken');
    localStorage.removeItem('studentUser');
    setUser(null);
  };

  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem('studentUser', JSON.stringify(updatedUser));
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('studentToken');
    if (!token) return null;
    const response = await authAPI.getMe();
    const freshUser = response.data?.data?.user || response.data?.data || null;
    if (freshUser) {
      localStorage.setItem('studentUser', JSON.stringify(freshUser));
      setUser(freshUser);
    }
    return freshUser;
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    refreshUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};