const mongoose = require('mongoose');

const ProjectVersionSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: [true, 'Please add project ID']
    },
    versionNumber: {
        type: Number,
        required: true
    },
    // ✅ FIX: Make these optional (not required for grading)
    codeZipUrl: {
        type: String,
        default: null
    },
    srsPdfUrl: {
        type: String,
        default: null
    },
    designPdfUrl: {
        type: String,
        default: null
    },
    manualPdfUrl: {
        type: String,
        default: null
    },
    presentationPdfUrl: {
        type: String,
        default: null
    },
    videoFileUrl: {
        type: String,
        default: null
    },
    // File metadata
    codeFileSize: {
        type: Number,
        default: 0
    },
    pdfFileSize: {
        type: Number,
        default: 0
    },
    totalFileSize: {
        type: Number,
        default: 0
    },
    // Folder structure preservation
    folderStructure: {
        type: Object,
        default: null
    },
    // Dependencies from code scan
    dependencies: [{
        name: String,
        version: String,
        isDeprecated: Boolean,
        latestVersion: String,
        suggestion: String,
        severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical']
        }
    }],
    // Code health score
    codeHealthScore: {
        type: Number,
        min: 0,
        max: 100,
        default: null
    },
    healthWarnings: [{
        type: String
    }],
    // Submission info
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ipAddress: {
        type: String,
        default: null
    },
    userAgent: {
        type: String,
        default: null
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    isLatest: {
        type: Boolean,
        default: false
    },
dependencyAnalysis: {
    type: Object,
    default: null
}
}, {
    timestamps: true
});

// Compound index for unique project + version
ProjectVersionSchema.index({ projectId: 1, versionNumber: 1 }, { unique: true });

// Index for fast queries
ProjectVersionSchema.index({ projectId: 1, isLatest: 1 });
ProjectVersionSchema.index({ submittedAt: -1 });

module.exports = mongoose.model('ProjectVersion', ProjectVersionSchema);