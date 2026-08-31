const BaseRepository = require('./base.repository');
const AuditLog = require('../models/AuditLog.model');

class AuditLogRepository extends BaseRepository {
    constructor() {
        super(AuditLog);
    }

    // Log an action
    async logAction(userId, userEmail, userRole, action, entityType, entityId, entityName = null, oldValues = null, newValues = null, details = null, metadata = null, userIp = null, userAgent = null, status = 'success', errorMessage = null) {
        return await this.create({
            userId,
            userEmail,
            userRole,
            userIp,
            userAgent,
            action,
            entityType,
            entityId,
            entityName,
            oldValues,
            newValues,
            details,
            metadata,
            status,
            errorMessage,
            createdAt: new Date()
        });
    }

    // Get logs by user
    async getLogsByUser(userId, limit = 100, skip = 0) {
        return await this.findAll(
            { userId },
            { sort: { createdAt: -1 }, limit, skip }
        );
    }

    // Get logs by action type
    async getLogsByAction(action, days = 30, limit = 100) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);
        
        return await this.findAll(
            { action, createdAt: { $gte: dateLimit } },
            { sort: { createdAt: -1 }, limit }
        );
    }

    // Get logs by entity type
    async getLogsByEntityType(entityType, entityId = null, limit = 100) {
        const filter = { entityType };
        if (entityId) filter.entityId = entityId;
        
        return await this.findAll(
            filter,
            { sort: { createdAt: -1 }, limit, populate: 'userId' }
        );
    }

    // Get logs by date range
    async getLogsByDateRange(startDate, endDate, limit = 500) {
        return await this.findAll(
            { createdAt: { $gte: startDate, $lte: endDate } },
            { sort: { createdAt: -1 }, limit, populate: 'userId' }
        );
    }

    // Get logs by status (success/failed)
    async getLogsByStatus(status, days = 7, limit = 100) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);
        
        return await this.findAll(
            { status, createdAt: { $gte: dateLimit } },
            { sort: { createdAt: -1 }, limit }
        );
    }

    // Get failed logs (errors)
    async getFailedLogs(days = 7, limit = 100) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);
        
        return await this.findAll(
            { status: 'failed', createdAt: { $gte: dateLimit } },
            { sort: { createdAt: -1 }, limit }
        );
    }

    // Get logs by user role
    async getLogsByRole(role, days = 30, limit = 100) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);
        
        return await this.findAll(
            { userRole: role, createdAt: { $gte: dateLimit } },
            { sort: { createdAt: -1 }, limit }
        );
    }

    // Get action statistics
    async getActionStats(days = 30) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);
        
        const stats = await this.aggregate([
            { $match: { createdAt: { $gte: dateLimit } } },
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 },
                    successCount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
                    failedCount: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
                }
            },
            { $sort: { count: -1 } }
        ]);
        
        return stats;
    }

    // Get daily activity summary
    async getDailyActivitySummary(days = 7) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);
        
        const summary = await this.aggregate([
            { $match: { createdAt: { $gte: dateLimit } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    totalActions: { $sum: 1 },
                    uniqueUsers: { $addToSet: '$userId' },
                    actionTypes: { $addToSet: '$action' }
                }
            },
            {
                $project: {
                    date: '$_id',
                    totalActions: 1,
                    uniqueUserCount: { $size: '$uniqueUsers' },
                    actionTypesCount: { $size: '$actionTypes' }
                }
            },
            { $sort: { date: 1 } }
        ]);
        
        return summary;
    }

    // Get user activity report
    async getUserActivityReport(userId, days = 30) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);
        
        const report = await this.aggregate([
            { $match: { userId, createdAt: { $gte: dateLimit } } },
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 },
                    lastPerformed: { $max: '$createdAt' }
                }
            },
            { $sort: { count: -1 } }
        ]);
        
        return report;
    }

    // Get entity change history
    async getEntityChangeHistory(entityType, entityId) {
        return await this.findAll(
            { entityType, entityId },
            { sort: { createdAt: -1 } }
        );
    }

    // Delete old logs (retention policy)
    async deleteOldLogs(days = 365) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);
        
        return await this.deleteMany({ createdAt: { $lt: dateLimit } });
    }

    // Export logs to CSV format
    async exportLogsToCSV(startDate, endDate) {
        const logs = await this.getLogsByDateRange(startDate, endDate, 10000);
        
        const csvRows = [
            ['Timestamp', 'User Email', 'User Role', 'Action', 'Entity Type', 'Entity ID', 'Status', 'Details']
        ];
        
        for (const log of logs) {
            csvRows.push([
                log.createdAt.toISOString(),
                log.userEmail,
                log.userRole,
                log.action,
                log.entityType,
                log.entityId?.toString() || '',
                log.status,
                log.details || ''
            ]);
        }
        
        return csvRows.map(row => row.join(',')).join('\n');
    }

    // Get recent activity (last N hours)
    async getRecentActivity(hours = 24, limit = 50) {
        const dateLimit = new Date();
        dateLimit.setHours(dateLimit.getHours() - hours);
        
        return await this.findAll(
            { createdAt: { $gte: dateLimit } },
            { sort: { createdAt: -1 }, limit, populate: 'userId' }
        );
    }
}

module.exports = new AuditLogRepository();