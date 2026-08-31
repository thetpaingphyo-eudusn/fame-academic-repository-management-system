const BaseRepository = require('./base.repository');
const Project = require('../models/Project.model');

class ProjectRepository extends BaseRepository {
    constructor() {
        super(Project);
    }

    // Get projects by student
    async getProjectsByStudent(studentId) {
        return await this.findAll(
            { studentId, isActive: true },
            { sort: { createdAt: -1 }, populate: 'courseId' }
        );
    }

    // Get projects by course
    async getProjectsByCourse(courseId, status = null) {
        const query = { courseId };
        if (status) query.status = status;
        return await this.findAll(query, {
            sort: { submittedAt: -1 },
            populate: 'studentId'
        });
    }

    // Get projects by teacher (via courses they teach)
    async getProjectsByTeacher(teacherId, courseIds) {
        return await this.findAll(
            { courseId: { $in: courseIds }, isActive: true },
            { sort: { submittedAt: -1 }, populate: ['studentId', 'courseId'] }
        );
    }

    // Get projects by department
    async getProjectsByDepartment(department, year = null, section = null) {
        const query = { department };
        if (year) query.year = year;
        if (section) query.section = section;
        return await this.findAll(query, {
            sort: { submittedAt: -1 },
            populate: ['studentId', 'courseId']
        });
    }

    // Get projects by status
    async getProjectsByStatus(status, department = null) {
        const query = { status };
        if (department) query.department = department;
        return await this.findAll(query, {
            sort: { submittedAt: -1 },
            populate: ['studentId', 'courseId']
        });
    }

    // Get pending projects for teacher review
    async getPendingProjectsForTeacher(teacherId, courseIds) {
        return await this.findAll(
            { courseId: { $in: courseIds }, status: 'pending' },
            { sort: { submittedAt: 1 }, populate: ['studentId', 'courseId'] }
        );
    }

    // Update project status
    async updateStatus(projectId, status, teacherId = null) {
        const updateData = { status };
        if (status === 'approved') updateData.approvedAt = new Date();
        if (teacherId) updateData.gradedBy = teacherId;
        if (status === 'graded') updateData.gradedAt = new Date();
        return await this.updateById(projectId, updateData);
    }

    // Update grade and feedback
    async updateGradeAndFeedback(projectId, grade, feedback, teacherId) {
        return await this.updateById(projectId, {
            grade,
            teacherFeedback: feedback,
            gradedBy: teacherId,
            gradedAt: new Date(),
            status: 'graded'
        });
    }

    // Search projects
// Search projects (FIXED - with proper regex handling)
async searchProjects(keyword, filters = {}) {
    // ✅ Ensure keyword is a valid string
    if (!keyword || typeof keyword !== 'string') {
        return [];
    }
    
    const trimmedKeyword = keyword.trim();
    if (trimmedKeyword.length === 0) {
        return [];
    }
    
    // ✅ Create regex properly
    const searchRegex = new RegExp(trimmedKeyword, 'i');
    
    const query = {
        $or: [
            { title: { $regex: searchRegex } },
            { description: { $regex: searchRegex } },
            { studentName: { $regex: searchRegex } }
        ],
        ...filters
    };
    
    return await this.findAll(query, {
        sort: { submittedAt: -1 },
        populate: ['studentId', 'courseId']
    });
}

    // Get project statistics
    async getProjectStats(department = null) {
        const match = department ? { department } : {};
        return await this.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    avgGrade: { $avg: '$grade' }
                }
            }
        ]);
    }

    // Get projects with low health score
    async getUnhealthyProjects(threshold = 50, department = null) {
        // This will work after adding health score to Project model
        const query = { healthScore: { $lt: threshold } };
        if (department) query.department = department;
        return await this.findAll(query, { populate: 'studentId' });
    }

    // Get recent projects (last N days)
    async getRecentProjects(days = 30, department = null) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        const query = { submittedAt: { $gte: date } };
        if (department) query.department = department;
        return await this.findAll(query, {
            sort: { submittedAt: -1 },
            populate: ['studentId', 'courseId']
        });
    }

    // Get project by version
    async getProjectWithVersions(projectId) {
        return await this.findById(projectId).populate('versions');
    }

    // Get projects needing revision
    async getRevisionNeededProjects(teacherId, courseIds) {
        return await this.findAll(
            { courseId: { $in: courseIds }, status: 'revision' },
            { sort: { updatedAt: -1 }, populate: ['studentId', 'courseId'] }
        );
    }
}

module.exports = new ProjectRepository();