const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userEmail: String,
    userRole: String,
    action: String,
    entityType: String,
    entityId: mongoose.Schema.Types.ObjectId,
    entityName: String,
    details: String,
    userIp: String,
    userAgent: String,
    status: { type: String, default: 'success' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);