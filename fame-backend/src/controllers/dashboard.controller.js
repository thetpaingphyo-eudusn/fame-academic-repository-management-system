const UserRepository = require('../repositories/user.repository');
const ProjectRepository = require('../repositories/project.repository');
const CourseRepository = require('../repositories/course.repository');
const FeedbackRepository = require('../repositories/feedback.repository');
const SearchHistoryRepository = require('../repositories/searchHistory.repository');
const AuditLogRepository = require('../repositories/auditLog.repository');
const ApiResponse = require('../utils/apiResponse.util');
const { ROLES } = require('../constants/roles.constant');
const { PROJECT_STATUS } = require('../constants/status.constant');

class DashboardController {
    // @desc    Admin dashboard stats
    // @route   GET /api/dashboard/admin
    // @access  Private (Admin only)
    async getAdminDashboard(req, res, next) {
        try {
            const totalStudents = await UserRepository.count({ role: ROLES.STUDENT });
            const totalTeachers = await UserRepository.count({ role: ROLES.TEACHER });
            const totalProjects = await ProjectRepository.count({});
            const pendingProjects = await ProjectRepository.count({ status: PROJECT_STATUS.PENDING });
            const approvedProjects = await ProjectRepository.count({ status: PROJECT_STATUS.APPROVED });
            const rejectedProjects = await ProjectRepository.count({ status: PROJECT_STATUS.REJECTED });
            const revisionProjects = await ProjectRepository.count({ status: PROJECT_STATUS.REVISION });
            
            const recentProjects = await ProjectRepository.findAll({}, {
                limit: 10,
                sort: { createdAt: -1 },
                populate: ['studentId', 'courseId']
            });
            
            const recentActivities = await AuditLogRepository.getRecentActivity(24, 10);
            
            const searchStats = await SearchHistoryRepository.getSearchStatsByDate(
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                new Date()
            );
            
            ApiResponse.success(res, {
                counts: {
                    totalStudents,
                    totalTeachers,
                    totalProjects,
                    pendingProjects,
                    approvedProjects,
                    rejectedProjects,
                    revisionProjects
                },
                recentProjects,
                recentActivities,
                searchStats
            }, 'Admin dashboard data retrieved');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Teacher dashboard stats
    // @route   GET /api/dashboard/teacher
    // @access  Private (Teacher only)
    async getTeacherDashboard(req, res, next) {
        try {
            const courses = await CourseRepository.getCoursesByTeacher(req.user._id);
            const courseIds = courses.map(c => c._id);
            
            const myProjects = await ProjectRepository.findAll(
                { courseId: { $in: courseIds } },
                { populate: ['studentId', 'courseId'] }
            );
            
            const pendingCount = myProjects.filter(p => p.status === PROJECT_STATUS.PENDING).length;
            const gradedCount = myProjects.filter(p => p.status === PROJECT_STATUS.GRADED).length;
            const revisionCount = myProjects.filter(p => p.status === PROJECT_STATUS.REVISION).length;
            
            const recentSubmissions = myProjects
                .sort((a, b) => b.submittedAt - a.submittedAt)
                .slice(0, 10);
            
            const avgGrade = await FeedbackRepository.getAverageGradeForCourse(courseIds[0]);
            
            ApiResponse.success(res, {
                courseCount: courses.length,
                totalProjects: myProjects.length,
                pendingCount,
                gradedCount,
                revisionCount,
                recentSubmissions,
                averageGrade: avgGrade.avgGrade
            }, 'Teacher dashboard data retrieved');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Student dashboard stats
    // @route   GET /api/dashboard/student
    // @access  Private (Student only)
    async getStudentDashboard(req, res, next) {
        try {
            const myProjects = await ProjectRepository.findAll(
                { studentId: req.user._id },
                { sort: { createdAt: -1 }, populate: 'courseId' }
            );
            
            const pendingCount = myProjects.filter(p => p.status === PROJECT_STATUS.PENDING).length;
            const approvedCount = myProjects.filter(p => p.status === PROJECT_STATUS.APPROVED).length;
            const revisionCount = myProjects.filter(p => p.status === PROJECT_STATUS.REVISION).length;
            const gradedCount = myProjects.filter(p => p.status === PROJECT_STATUS.GRADED).length;
            
            const latestProject = myProjects[0] || null;
            let latestFeedback = null;
            
            if (latestProject) {
                latestFeedback = await FeedbackRepository.getFinalFeedback(latestProject._id);
            }
            
            ApiResponse.success(res, {
                totalProjects: myProjects.length,
                pendingCount,
                approvedCount,
                revisionCount,
                gradedCount,
                latestProject,
                latestFeedback
            }, 'Student dashboard data retrieved');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new DashboardController();