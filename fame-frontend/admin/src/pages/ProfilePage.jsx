import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/PageHeader";

import { 
  User, 
  Mail, 
  GraduationCap, 
  Building2, 
  Calendar,
  Save,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Key,
  LogOut
} from 'lucide-react'

const ProfilePage = () => {
  const { user, logout, changePassword } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    department: '',
    year: '',
    section: '',
    studentId: '',
    teacherId: ''
  })
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        department: user.department || '',
        year: user.year || '',
        section: user.section || '',
        studentId: user.studentId || '',
        teacherId: user.teacherId || ''
      })
    }
  }, [user])

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })
    
    try {
      const response = await api.put(`/admin/users/${user._id}`, {
        name: profileData.name,
        department: profileData.department,
        year: profileData.year,
        section: profileData.section
      })
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
        // Update local user
        user.name = profileData.name
        user.department = profileData.department
        user.year = profileData.year
        user.section = profileData.section
        localStorage.setItem('adminUser', JSON.stringify(user))
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }
    
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }
    
    setSaving(true)
    setMessage({ type: '', text: '' })
    
    try {
      await api.post(`/admin/users/${user._id}/reset-password`, {
        newPassword: passwordData.newPassword
      })
      
      setMessage({ type: 'success', text: 'Password changed successfully!' })
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to change password' })
    } finally {
      setSaving(false)
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={User}
        iconColor="text-blue-500"
        title="My Profile"
        subtitle="Manage your account information"
      >
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 flex items-center gap-2"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </PageHeader>

      {/* Message Alert */}
      {message.text && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center gap-2">
              <User size={18} className="text-blue-500" />
              <h2 className="font-semibold text-gray-800">Profile Information</h2>
            </div>
          </div>
          
          <form onSubmit={handleProfileUpdate} className="p-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={profileData.email}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                  disabled
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Department</label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={profileData.department}
                  onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">Select Department</option>
                  <option value="CS">CS - Computer Science</option>
                  <option value="IT">IT - Information Technology</option>
                  <option value="CT">CT - Computer Technology</option>
                  <option value="EC">EC - Electronic Commerce</option>
                </select>
              </div>
            </div>
            
            {user?.role === 'student' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Year</label>
                    <select
                      value={profileData.year}
                      onChange={(e) => setProfileData({ ...profileData, year: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300"
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
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Section</label>
                    <select
                      value={profileData.section}
                      onChange={(e) => setProfileData({ ...profileData, section: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      <option value="">Select Section</option>
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                      <option value="D">Section D</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Student ID</label>
                  <div className="relative">
                    <GraduationCap size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={profileData.studentId}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                      disabled
                    />
                  </div>
                </div>
              </>
            )}
            
            {user?.role === 'teacher' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Teacher ID</label>
                <div className="relative">
                  <GraduationCap size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={profileData.teacherId}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                    disabled
                  />
                </div>
              </div>
            )}
            
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-500 text-white py-2 rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
            <div className="flex items-center gap-2">
              <Key size={18} className="text-purple-500" />
              <h2 className="font-semibold text-gray-800">Change Password</h2>
            </div>
          </div>
          
          <form onSubmit={handlePasswordChange} className="p-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Current Password</label>
              <div className="relative">
                <Key size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">New Password</label>
              <div className="relative">
                <Key size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Confirm New Password</label>
              <div className="relative">
                <Key size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                  required
                />
              </div>
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-purple-500 text-white py-2 rounded-xl font-medium hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                {saving ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Account Info Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-500" />
            <h2 className="font-semibold text-gray-800">Account Information</h2>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400">Role</label>
              <p className="font-medium text-gray-800 capitalize">{user?.role || 'N/A'}</p>
            </div>
            <div>
              <label className="text-xs text-gray-400">Account ID</label>
              <p className="font-mono text-sm text-gray-600">{user?._id || 'N/A'}</p>
            </div>
            <div>
              <label className="text-xs text-gray-400">Member Since</label>
              <p className="text-gray-700">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage