const NotificationService = require('../services/notification.service');
const ApiResponse = require('../utils/apiResponse.util');

class NotificationController {
    async getInbox(req, res, next) {
        try {
            const { page = 1, limit = 20 } = req.query;
            const data = await NotificationService.getInbox(req.user._id, {
                page: parseInt(page, 10) || 1,
                limit: Math.min(parseInt(limit, 10) || 20, 50),
            });
            ApiResponse.paginated(res, data.items, data.pagination, 'Notifications retrieved');
        } catch (error) {
            next(error);
        }
    }

    async getUnreadCount(req, res, next) {
        try {
            const unreadCount = await NotificationService.getUnreadCount(req.user._id);
            ApiResponse.success(res, { unreadCount }, 'Unread count retrieved');
        } catch (error) {
            next(error);
        }
    }

    async markAsRead(req, res, next) {
        try {
            const updated = await NotificationService.markAsRead(req.params.id, req.user._id);
            if (!updated) {
                return res.status(404).json({ success: false, message: 'Notification not found' });
            }
            ApiResponse.success(res, updated, 'Notification marked as read');
        } catch (error) {
            next(error);
        }
    }

    async markAllAsRead(req, res, next) {
        try {
            const result = await NotificationService.markAllAsRead(req.user._id);
            ApiResponse.success(res, result, 'All notifications marked as read');
        } catch (error) {
            next(error);
        }
    }

    async broadcast(req, res, next) {
        try {
            const { title, message, audience = 'both' } = req.body;
            const result = await NotificationService.broadcastFromAdmin(req.user, {
                title,
                message,
                audience,
            });

            if (!result.success) {
                return res.status(400).json(result);
            }

            ApiResponse.success(res, result, 'Notification sent');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new NotificationController();
