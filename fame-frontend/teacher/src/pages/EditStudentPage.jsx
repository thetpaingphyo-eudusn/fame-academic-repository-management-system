import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { studentAPI } from "../services/api";
import PageHeader from "../components/PageHeader";

import { 
  User, Mail, Phone, MapPin, GraduationCap, 
  BookOpen, X, Loader, AlertCircle, Save,
  Building, Calendar, ArrowLeft, Edit
} from 'lucide-react';

const SEMESTER_OPTIONS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"].map(
  (s) => ({ value: s, label: `${s} Sem` })
);

const EditStudentPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [student, setStudent] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    studentId: '',
    semester: '',
    year: '',
    section: '',
    department: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    loadStudent();
  }, [id]);

  const loadStudent = async () => {
    setLoading(true);
    try {
      const res = await studentAPI.getStudentById(id);
      const studentData = res.data.data;
      setStudent(studentData);
      setFormData({
        name: studentData.name || '',
        email: studentData.email || '',
        studentId: studentData.studentId || '',
        semester: studentData.semester || '1st',
        year: studentData.year?.toString() || '',
        section: studentData.section || '',
        department: studentData.department || 'CS',
        phone: studentData.phone || '',
        address: studentData.address || ''
      });
    } catch (error) {
      console.error('Failed to load student:', error);
      setError('Student not found');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (!formData.name || !formData.name.trim()) {
      setError('Please enter student name');
      return;
    }
    if (!formData.semester) {
      setError('Please select semester');
      return;
    }
    if (!formData.section || !formData.section.trim()) {
      setError('Please enter section');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const updateData = {
        name: formData.name.trim(),
        phone: formData.phone || '',
        address: formData.address || '',
        semester: formData.semester,
        section: formData.section.trim().toUpperCase(),
        department: formData.department
      };
      
      await studentAPI.updateStudent(id, updateData);
      alert('Student updated successfully!');
      navigate('/students');
    } catch (error) {
      console.error('Failed to update student:', error);
      const errorMsg = error.response?.data?.message || 'Failed to update student';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/students');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error && !student) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="bg-red-50 rounded-2xl p-6 text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-3" />
          <p className="text-red-600">{error}</p>
          <button
            onClick={handleCancel}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            Back to Students
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-100 p-6 bg-gradient-to-r from-amber-50 to-white">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleCancel}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              title="Back to Students"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <PageHeader
              title="Edit Student"
              subtitle="Update student information"
              icon={Edit}
              iconTone="dark"
              iconClassName="bg-gradient-to-r from-amber-500/80 to-orange-500/80 text-white"
            />
          </div>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle size={20} className="text-red-500" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          {/* Student Info Card */}
          <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {student?.name?.charAt(0) || 'S'}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-800">{student?.name}</p>
              <p className="text-sm text-gray-500">{student?.studentId}</p>
            </div>
          </div>
          
          {/* Personal Information Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User size={18} className="text-blue-500" />
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                <input
                  type="text"
                  value={formData.studentId}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1">Student ID cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>
            </div>
          </div>
          
          {/* Academic Information Section */}
          <div className="pt-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <GraduationCap size={18} className="text-green-500" />
              Academic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                >
                  <option value="CS">Computer Science</option>
                  <option value="IT">Information Technology</option>
                  <option value="CT">Computer Technology</option>
                  <option value="EC">Electronic Commerce</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semester <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                >
                  {SEMESTER_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.section}
                  onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  maxLength={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                />
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            >
              {submitting ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              Update Student
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditStudentPage;