const { randomUUID } = require('crypto');
const NotificationRepository = require('../repositories/notification.repository');
const User = require('../models/User.model');
const { emitToUser } = require('../config/socket.io.instance');

class NotificationService {
    async getInbox(userId, query = {}) {
        return NotificationRepository.listForUser(userId, query);
    }

    async getUnreadCount(userId) {
        return NotificationRepository.countUnread(userId);
    }

    async markAsRead(notificationId, userId) {
        const updated = await NotificationRepository.markRead(notificationId, userId);
        if (!updated) return null;

        const unreadCount = await this.getUnreadCount(userId);
        emitToUser(userId, 'notification:count', { unreadCount });
        return updated;
    }

    async markAllAsRead(userId) {
        await NotificationRepository.markAllRead(userId);
        emitToUser(userId, 'notification:count', { unreadCount: 0 });
        return { unreadCount: 0 };
    }

    async pushRealtime(userId, notification) {
        const unreadCount = await this.getUnreadCount(userId);
        emitToUser(userId, 'notification:new', {
            notification,
            unreadCount,
        });
    }

    async createForUser({ recipientId, sender, title, message, type = 'announcement', broadcastId = null, metadata = {} }) {
        const doc = await NotificationRepository.create({
            recipientId,
            senderId: sender?._id || null,
            senderName: sender?.name || 'System',
            type,
            title,
            message,
            broadcastId,
            metadata,
        });

        const notification = doc.toObject ? doc.toObject() : doc;
        await this.pushRealtime(recipientId, notification);
        return notification;
    }

    async broadcastFromAdmin(admin, { title, message, audience = 'both' }) {
        const trimmedTitle = String(title || '').trim();
        const trimmedMessage = String(message || '').trim();

        if (!trimmedTitle || !trimmedMessage) {
            return { success: false, message: 'Title and message are required' };
        }

        const roles =
            audience === 'teachers'
                ? ['teacher']
                : audience === 'students'
                  ? ['student']
                  : audience === 'all'
                    ? ['teacher', 'student', 'admin']
                    : ['teacher', 'student'];

        const recipients = await User.find({ role: { $in: roles }, isActive: { $ne: false } }).select(
            '_id role'
        );

        if (!recipients.length) {
            return { success: false, message: 'No recipients found for this audience' };
        }

        const broadcastId = randomUUID();
        const payload = recipients.map((user) => ({
            recipientId: user._id,
            senderId: admin._id,
            senderName: admin.name || 'Admin',
            type: 'announcement',
            title: trimmedTitle,
            message: trimmedMessage,
            broadcastId,
            metadata: { audience },
        }));

        const created = await NotificationRepository.createMany(payload);

        await Promise.all(
            created.map((notification) => this.pushRealtime(String(notification.recipientId), notification))
        );

        return {
            success: true,
            broadcastId,
            recipientCount: created.length,
            audience,
        };
    }

    async sendFromTeacher(teacher, { title, message, courseId, studentIds = [] }) {
        const trimmedTitle = String(title || '').trim();
        const trimmedMessage = String(message || '').trim();

        if (!trimmedTitle || !trimmedMessage) {
            return { success: false, message: 'Title and message are required' };
        }

        const CourseRepository = require('../repositories/course.repository');
        let recipientIds = [];

        if (courseId) {
            const course = await CourseRepository.findById(courseId);
            if (!course || course.teacherId?.toString() !== teacher._id.toString()) {
                return { success: false, message: 'Course not found or access denied' };
            }
            const students = await User.find({
                role: 'student',
                isActive: { $ne: false },
                assignedCourses: course._id,
            }).select('_id');
            recipientIds = students.map((s) => s._id);
        } else if (studentIds.length) {
            const teacherCourses = await CourseRepository.findAll({ teacherId: teacher._id });
            const courseIds = teacherCourses.map((c) => c._id);
            const students = await User.find({
                _id: { $in: studentIds },
                role: 'student',
                assignedCourses: { $in: courseIds },
                isActive: { $ne: false },
            }).select('_id');
            recipientIds = students.map((s) => s._id);
        } else {
            const teacherCourses = await CourseRepository.findAll({ teacherId: teacher._id });
            const courseIds = teacherCourses.map((c) => c._id);
            if (!courseIds.length) {
                return { success: false, message: 'No courses found for this teacher' };
            }
            const students = await User.find({
                role: 'student',
                isActive: { $ne: false },
                assignedCourses: { $in: courseIds },
            }).select('_id');
            recipientIds = students.map((s) => s._id);
        }

        const uniqueIds = [...new Set(recipientIds.map(String))];
        if (!uniqueIds.length) {
            return { success: false, message: 'No students found to notify' };
        }

        const broadcastId = randomUUID();
        const payload = uniqueIds.map((recipientId) => ({
            recipientId,
            senderId: teacher._id,
            senderName: teacher.name || 'Teacher',
            type: 'announcement',
            title: trimmedTitle,
            message: trimmedMessage,
            broadcastId,
            metadata: { courseId: courseId || null, fromTeacher: true },
        }));

        const created = await NotificationRepository.createMany(payload);
        await Promise.all(
            created.map((notification) =>
                this.pushRealtime(String(notification.recipientId), notification)
            )
        );

        return {
            success: true,
            broadcastId,
            recipientCount: created.length,
        };
    }
}

module.exports = new NotificationService();
