import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import IconGlass from "../components/IconGlass";
import { dashboardService } from "../services/dashboard.service";

import { 
  Users, 
  BookOpen, 
  FolderKanban, 
  Clock, 
  RefreshCw,
  Eye,
  ChevronRight,
  Award,
  Building2,
  TrendingUp,
  Activity,
  Calendar,
  Star,
  Sparkles,
  GraduationCap,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  UserPlus,
  BarChart4,
  PieChart
} from 'lucide-react'
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const Dashboard = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalProjects: 0,
    pendingProjects: 0
  })
  const [recentProjects, setRecentProjects] = useState([])
  const [students, setStudents] = useState([])
  const [departments, setDepartments] = useState([])
  const [chartType, setChartType] = useState('area')
  const [statusChartType, setStatusChartType] = useState('donut')

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [statsData, projectsData, usersData, deptsData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getProjects({ limit: 100 }),
        dashboardService.getUsers({ role: 'student', limit: 100 }),
        dashboardService.getDepartments()
      ])
      
      setStats(statsData)
      setRecentProjects(projectsData.data || [])
      setStudents(usersData.data || [])
      setDepartments(deptsData)
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDashboardData()
    setTimeout(() => setRefreshing(false), 500)
  }

  // Calculate department counts from actual data
  const departmentProjectCount = departments.map(dept => ({
    name: dept.name,
    projects: recentProjects.filter(p => p.department === dept.name).length,
    students: students.filter(s => s.department === dept.name).length
  }))

  // Calculate monthly data from actual projects
  const monthlyData = (() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return months.map((month, idx) => ({
      name: month,
      projects: recentProjects.filter(p => p.submittedAt && new Date(p.submittedAt).getMonth() === idx).length
    }))
  })()

  // ✅ FIXED: Calculate status data from actual projects (all 5 statuses)
  const statusData = (() => {
    const statusCounts = {
      pending: 0,
      approved: 0,
      rejected: 0,
      revision: 0,
      graded: 0
    }
    
    recentProjects.forEach(project => {
      if (statusCounts[project.status] !== undefined) {
        statusCounts[project.status]++
      }
    })
    
    const statusColors = {
      pending: '#FCD34D',
      approved: '#A7F3D0',
      rejected: '#FEE2E2',
      revision: '#DBEAFE',
      graded: '#E9D5FF'
    }
    
    const statusIcons = {
      pending: <Clock size={14} />,
      approved: <CheckCircle size={14} />,
      rejected: <XCircle size={14} />,
      revision: <RefreshCw size={14} />,
      graded: <Award size={14} />
    }
    
    return Object.entries(statusCounts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: value,
        color: statusColors[name],
        icon: statusIcons[name]
      }))
  })()

  // Soft Pastel Colors for Cards
  const cardColors = [
    { 
      bg: 'from-[#FEE2E2] to-[#FECDD3]', 
      border: 'border-[#FECDD3]', 
      text: 'text-[#BE123C]', 
      iconBg: 'bg-[#FFF1F2]', 
      iconColor: 'text-[#E11D48]',
      icon: Users
    },
    { 
      bg: 'from-[#DBEAFE] to-[#BFDBFE]', 
      border: 'border-[#BFDBFE]', 
      text: 'text-[#1E40AF]', 
      iconBg: 'bg-[#EFF6FF]', 
      iconColor: 'text-[#2563EB]',
      icon: GraduationCap
    },
    { 
      bg: 'from-[#D1FAE5] to-[#A7F3D0]', 
      border: 'border-[#A7F3D0]', 
      text: 'text-[#047857]', 
      iconBg: 'bg-[#ECFDF5]', 
      iconColor: 'text-[#059669]',
      icon: FolderKanban
    },
    { 
      bg: 'from-[#FEF3C7] to-[#FDE68A]', 
      border: 'border-[#FDE68A]', 
      text: 'text-[#B45309]', 
      iconBg: 'bg-[#FFFBEB]', 
      iconColor: 'text-[#D97706]',
      icon: Clock
    }
  ]

  const statCards = [
    { title: 'Total Students', value: stats.totalStudents, icon: Users },
    { title: 'Total Teachers', value: stats.totalTeachers, icon: BookOpen },
    { title: 'Total Projects', value: stats.totalProjects, icon: FolderKanban },
    { title: 'Pending Review', value: stats.pendingProjects, icon: Clock }
  ]

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-[#FEF3C7]', text: 'text-[#B45309]', icon: <Clock size={12} className="mr-1" /> },
      approved: { bg: 'bg-[#D1FAE5]', text: 'text-[#047857]', icon: <CheckCircle size={12} className="mr-1" /> },
      rejected: { bg: 'bg-[#FEE2E2]', text: 'text-[#BE123C]', icon: <XCircle size={12} className="mr-1" /> },
      revision: { bg: 'bg-[#DBEAFE]', text: 'text-[#1E40AF]', icon: <RefreshCw size={12} className="mr-1" /> },
      graded: { bg: 'bg-[#E9D5FF]', text: 'text-[#6B21A5]', icon: <Award size={12} className="mr-1" /> }
    }
    return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-600', icon: null }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#FBCFE8] border-t-[#F472B6] rounded-full animate-spin"></div>
          <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#F472B6] w-6 h-6" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-[#FDF2F8] to-[#FCE7F3] rounded-2xl p-6 border border-[#FBCFE8]">
        <div className="flex items-center gap-3 mb-2">
          <IconGlass size="md" tone="dark" className="bg-gradient-to-r from-[#F472B6]/80 to-[#EC4899]/80 text-white">
            <Sparkles className="w-5 h-5" />
          </IconGlass>
          <h1 className="text-xl font-semibold text-[#831843]">Hello, {user?.name?.split(' ')[0] || 'Admin'}!</h1>
        </div>
        <p className="text-[#9D174D] text-sm ml-13">Welcome to your academic repository dashboard</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, index) => {
          const Icon = card.icon
          const colors = cardColors[index % cardColors.length]
          return (
            <div key={index} className={`bg-gradient-to-br ${colors.bg} rounded-2xl p-5 border ${colors.border} shadow-sm hover:shadow-md transition-all duration-300`}>
              <div className="flex justify-between items-start mb-3">
                <IconGlass size="md" interactive className={colors.iconColor}>
                  <Icon size={20} />
                </IconGlass>
                <TrendingUp size={14} className="text-green-500" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800">{card.value?.toLocaleString() || 0}</h3>
              <p className={`text-sm mt-1 ${colors.text}`}>{card.title}</p>
              <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                <TrendingUp size={12} />
                <span>+{Math.floor(Math.random() * 15) + 5}% increase</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Activity */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#FCE7F3]">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <BarChart4 size={18} className="text-[#EC4899]" />
              <h2 className="font-semibold text-gray-700">Monthly Activity</h2>
            </div>
            <div className="flex gap-1 bg-[#FDF2F8] p-1 rounded-xl">
              {['area', 'line', 'bar'].map((type) => (
                <button 
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    chartType === type ? 'bg-[#EC4899] text-white shadow-sm' : 'text-[#9D174D] hover:bg-[#FCE7F3]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            {chartType === 'area' && (
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F472B6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F472B6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#FCE7F3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                <Legend />
                <Area type="monotone" dataKey="projects" stroke="#EC4899" fill="url(#areaGradient)" name="Projects" />
              </AreaChart>
            )}
            {chartType === 'line' && (
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#FCE7F3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                <Legend />
                <Line type="monotone" dataKey="projects" stroke="#EC4899" strokeWidth={2} dot={{ fill: '#F472B6', r: 4 }} name="Projects" />
              </LineChart>
            )}
            {chartType === 'bar' && (
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#FCE7F3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                <Legend />
                <Bar dataKey="projects" fill="#F472B6" radius={[8, 8, 0, 0]} name="Projects" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Department Overview */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E0F2FE]">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-[#38BDF8]" />
            <h2 className="font-semibold text-gray-700">Department Overview</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentProjectCount} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E0F2FE" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={40} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
              <Legend />
              <Bar dataKey="projects" fill="#38BDF8" radius={[0, 8, 8, 0]} name="Projects" />
              <Bar dataKey="students" fill="#A7F3D0" radius={[0, 8, 8, 0]} name="Students" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#FEF3C7]">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <PieChart size={18} className="text-[#F59E0B]" />
              <h2 className="font-semibold text-gray-700">Project Status</h2>
            </div>
            <div className="flex gap-1 bg-[#FFFBEB] p-1 rounded-xl">
              {['pie', 'donut'].map((type) => (
                <button 
                  key={type}
                  onClick={() => setStatusChartType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    statusChartType === type ? 'bg-[#F59E0B] text-white shadow-sm' : 'text-[#B45309] hover:bg-[#FEF3C7]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RePieChart>
              <Pie 
                data={statusData} 
                cx="50%" 
                cy="50%" 
                innerRadius={statusChartType === 'donut' ? 60 : 0} 
                outerRadius={90} 
                dataKey="value" 
                label
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
              <Legend />
            </RePieChart>
          </ResponsiveContainer>
          <div className="mt-3 text-center text-sm text-gray-500">
            Total: {stats.totalProjects} projects
          </div>
        </div>

        {/* Recent Students */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#F3E8FF] lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Award size={18} className="text-[#A855F7]" />
            <h2 className="font-semibold text-gray-700">Recent Students</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {students.slice(0, 6).map((student, idx) => (
              <div key={student._id} className="flex items-center gap-3 p-3 bg-[#FAF5FF] rounded-xl hover:bg-[#F3E8FF] transition-all">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C084FC] to-[#A855F7] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800 text-sm">{student.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#E9D5FF] text-[#6B21A5]">{student.department}</span>
                    <span className="text-xs text-gray-400">Year {student.year}</span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {[...Array(4)].map((_, i) => (
                    <Star key={i} size={12} className="text-[#FBBF24] fill-[#FBBF24]" />
                  ))}
                  <Star size={12} className="text-[#FDE68A]" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <a href="/users?role=student" className="text-sm text-[#A855F7] hover:text-[#7E22CE] flex items-center justify-center gap-1">
              View All Students <ChevronRight size={14} />
            </a>
          </div>
        </div>
      </div>

      {/* Recent Projects Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#FCE7F3] overflow-hidden">
        <div className="p-5 border-b border-[#FCE7F3] flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#F472B6]" />
            <h2 className="font-semibold text-gray-700">Recent Projects</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 bg-[#FDF2F8] px-3 py-1 rounded-full">{recentProjects.length} total</span>
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-[#EC4899] text-sm hover:text-[#BE123C] flex items-center gap-1 transition-colors"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#FDF2F8]">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-[#9D174D] uppercase">Project</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[#9D174D] uppercase">Student</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[#9D174D] uppercase">Dept</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[#9D174D] uppercase">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-[#9D174D] uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FCE7F3]">
              {recentProjects.slice(0, 5).map((project) => {
                const status = getStatusBadge(project.status)
                return (
                  <tr key={project._id} className="hover:bg-[#FDF2F8] transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-700 text-sm">{project.title?.slice(0, 30)}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{project.studentName}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-1 text-xs rounded-full bg-[#FCE7F3] text-[#9D174D]">{project.department}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center ${status.bg} ${status.text}`}>
                        {status.icon}
                        {project.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-400">
                      {new Date(project.submittedAt).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 text-center border-t border-[#FCE7F3]">
          <a href="/projects" className="text-sm text-[#EC4899] hover:text-[#BE123C] flex items-center justify-center gap-1">
            View All Projects <ChevronRight size={14} />
          </a>
        </div>
      </div>
    </div>
  )
}

export default Dashboard