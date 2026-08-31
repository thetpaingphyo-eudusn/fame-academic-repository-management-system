import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { authAPI, studentAPI } from "../services/api";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

import {
  User, Mail, Phone, MapPin, GraduationCap, BookOpen,
  Calendar, Save, Edit2, X, CheckCircle, AlertCircle,
  Loader, Building, Users, Award, Lock,
  Eye, EyeOff, Key
} from 'lucide-react';

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    address: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    averageGrade: 0,
    completedProjects: 0,
    pendingProjects: 0
  });

  useEffect(() => {
    if (user) {
      setFormData({
        phone: user.phone || '',
        address: user.address || ''
      });
    }
    loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      const res = await studentAPI.getMyStats();
      const data = res.data.data || {};
      setStats({
        totalProjects: data.totalProjects || 0,
        averageGrade: data.averageGrade || 0,
        completedProjects: data.completedProjects || 0,
        pendingProjects: data.pendingProjects || 0
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await studentAPI.updateProfile({
        phone: formData.phone,
        address: formData.address
      });
      await refreshUser();
      setShowEditModal(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!passwordData.currentPassword) {
      toast.error('Please enter current password');
      return;
    }
    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      await authAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
      toast.success('Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        subtitle="View your personal information and update contact details"
        icon={User}
      >
        <button
          onClick={() => setShowEditModal(true)}
          className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-emerald-600 transition-all"
        >
          <Edit2 size={16} /> Edit Contact Info
        </button>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2"
        >
          <Lock size={16} /> Change Password
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={stats.totalProjects} icon={BookOpen} iconColor="blue" cardClass="cute-card cute-card-blue p-4" />
        <StatCard label="Average Grade" value={`${stats.averageGrade}%`} icon={Award} iconColor="purple" cardClass="cute-card cute-card-purple p-4" />
        <StatCard label="Completed" value={stats.completedProjects} icon={CheckCircle} iconColor="emerald" cardClass="cute-card cute-card-emerald p-4" />
        <StatCard label="Pending" value={stats.pendingProjects} icon={AlertCircle} iconColor="amber" cardClass="cute-card cute-card-amber p-4" />
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
        {/* Cover Image / Header */}
        <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-500 relative">
          <div className="absolute -bottom-12 left-6">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
              <div className="w-22 h-22 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                <span className="text-white text-3xl font-bold">
                  {user.name?.charAt(0)?.toUpperCase() || 'S'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="pt-16 pb-6 px-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
              <p className="text-sm text-gray-500">{user.studentId}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              user?.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {user?.isActive ? 'Active Student' : 'Inactive'}
            </span>
          </div>

          {/* Information Display - Read Only Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User size={14} className="inline mr-1" /> Full Name
              </label>
              <p className="text-gray-800 py-2 bg-gray-50 px-3 rounded-lg">{user.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail size={14} className="inline mr-1" /> Email Address
              </label>
              <p className="text-gray-800 py-2 bg-gray-50 px-3 rounded-lg">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <GraduationCap size={14} className="inline mr-1" /> Student ID
              </label>
              <p className="text-gray-800 py-2 bg-gray-50 px-3 rounded-lg">{user.studentId || 'Not assigned'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building size={14} className="inline mr-1" /> Department
              </label>
              <p className="text-gray-800 py-2 bg-gray-50 px-3 rounded-lg">{user.department || 'Not assigned'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar size={14} className="inline mr-1" /> Year
              </label>
              <p className="text-gray-800 py-2 bg-gray-50 px-3 rounded-lg">{user.year ? `Year ${user.year}` : 'Not assigned'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Users size={14} className="inline mr-1" /> Section
              </label>
              <p className="text-gray-800 py-2 bg-gray-50 px-3 rounded-lg">{user.section ? `Section ${user.section}` : 'Not assigned'}</p>
            </div>
          </div>

          {/* Contact Info Display */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Phone size={18} className="text-emerald-500" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone size={14} className="inline mr-1" /> Phone Number
                </label>
                <p className="text-gray-800 py-2">{formData.phone || 'Not provided'}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin size={14} className="inline mr-1" /> Address
                </label>
                <p className="text-gray-800 py-2">{formData.address || 'Not provided'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Contact Info Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-100 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Edit2 size={20} className="text-emerald-500" />
                <h2 className="text-lg font-bold text-gray-800">Edit Contact Information</h2>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone size={14} className="inline mr-1" /> Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="09xxxxxxxxx"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin size={14} className="inline mr-1" /> Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="Your address"
                  />
                </div>
              </div>
              
              <div className="border-t border-gray-100 p-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-100 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Key size={20} className="text-emerald-500" />
                <h2 className="text-lg font-bold text-gray-800">Change Password</h2>
              </div>
              <button onClick={() => setShowPasswordModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleChangePassword}>
              <div className="p-4 space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 pr-10"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 pr-10"
                      placeholder="Enter new password (min 6 characters)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 pr-10"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-100 p-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader size={16} className="animate-spin" /> : <Key size={16} />}
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;