const BaseRepository = require('./base.repository');
const Feedback = require('../models/Feedback.model');

class FeedbackRepository extends BaseRepository {
    constructor() {
        super(Feedback);
    }

    // Get feedback by project
    async getFeedbackByProject(projectId) {
        return await this.findAll(
            { projectId },
            { sort: { createdAt: -1 }, populate: 'teacherId' }
        );
    }

    // Get feedback by version
    async getFeedbackByVersion(versionId) {
        return await this.findAll(
            { versionId },
            { populate: 'teacherId' }
        );
    }

    // Get latest feedback for project
    async getLatestFeedback(projectId) {
        return await this.findOne(
            { projectId },
            { sort: { createdAt: -1 } }
        );
    }

    // Get final feedback (graded)
    async getFinalFeedback(projectId) {
        return await this.findOne({ projectId, isFinal: true });
    }

    // Get feedback by teacher
    async getFeedbackByTeacher(teacherId) {
        return await this.findAll(
            { teacherId },
            { sort: { createdAt: -1 }, populate: ['projectId', 'versionId'] }
        );
    }

    // Get feedback by student (via projects)
    async getFeedbackByStudent(studentId) {
        return await this.aggregate([
            {
                $lookup: {
                    from: 'projects',
                    localField: 'projectId',
                    foreignField: '_id',
                    as: 'project'
                }
            },
            { $unwind: '$project' },
            { $match: { 'project.studentId': studentId } },
            { $sort: { createdAt: -1 } }
        ]);
    }

    // Create or update feedback
    async saveFeedback(projectId, versionId, teacherId, data) {
        // Check if feedback already exists
        const existing = await this.findOne({ projectId, versionId, teacherId });
        
        if (existing) {
            return await this.updateById(existing._id, data);
        }
        return await this.create({
            projectId,
            versionId,
            teacherId,
            ...data
        });
    }

    // Publish feedback (make visible to student)
    async publishFeedback(feedbackId) {
        return await this.updateById(feedbackId, {
            isPublished: true,
            publishedAt: new Date()
        });
    }

    // Request revision
    async requestRevision(feedbackId, revisionNotes) {
        return await this.updateById(feedbackId, {
            revisionRequested: true,
            revisionNotes
        });
    }

    // Get average grade for course
    async getAverageGradeForCourse(courseId) {
        const result = await this.aggregate([
            {
                $lookup: {
                    from: 'projects',
                    localField: 'projectId',
                    foreignField: '_id',
                    as: 'project'
                }
            },
            { $unwind: '$project' },
            { $match: { 'project.courseId': courseId, isFinal: true } },
            {
                $group: {
                    _id: null,
                    avgGrade: { $avg: '$grade' },
                    minGrade: { $min: '$grade' },
                    maxGrade: { $max: '$grade' },
                    totalProjects: { $sum: 1 }
                }
            }
        ]);
        return result[0] || { avgGrade: 0, totalProjects: 0 };
    }

    // Get grade distribution
    async getGradeDistribution(department = null) {
        const match = {};
        if (department) match.department = department;
        
        return await this.aggregate([
            {
                $lookup: {
                    from: 'projects',
                    localField: 'projectId',
                    foreignField: '_id',
                    as: 'project'
                }
            },
            { $unwind: '$project' },
            { $match: { ...match, isFinal: true } },
            {
                $bucket: {
                    groupBy: '$grade',
                    boundaries: [0, 40, 50, 60, 70, 80, 90, 100],
                    default: 'Other',
                    output: {
                        count: { $sum: 1 }
                    }
                }
            }
        ]);
    }

    // Get unread feedback for student
    async getUnreadFeedbackForStudent(studentId) {
        return await this.aggregate([
            {
                $lookup: {
                    from: 'projects',
                    localField: 'projectId',
                    foreignField: '_id',
                    as: 'project'
                }
            },
            { $unwind: '$project' },
            { $match: { 'project.studentId': studentId, isPublished: true, isRead: false } }
        ]);
    }

    // Mark feedback as read
    async markAsRead(feedbackId) {
        return await this.updateById(feedbackId, { isRead: true });
    }
}

module.exports = new FeedbackRepository();