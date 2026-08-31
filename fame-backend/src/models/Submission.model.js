const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
    assignmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    isLate: {
        type: Boolean,
        default: false
    },
    daysLate: {
        type: Number,
        default: 0
    },
    files: {
        codeZipUrl: { type: String },
        codeZipSize: { type: Number, default: 0 },
        srsPdfUrl: { type: String },
        srsPdfSize: { type: Number, default: 0 },
        designPdfUrl: { type: String },
        manualPdfUrl: { type: String },
        presentationPdfUrl: { type: String },
        videoFileUrl: { type: String }
    },
    grade: {
        type: Number,
        min: 0,
        max: 100
    },
    scores: {
        type: Map,
        of: Number,
        default: {}
    },
    feedback: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['submitted', 'reviewing', 'graded', 'revision', 'approved'],
        default: 'submitted'
    },
    revisionNotes: {
        type: String,
        default: ''
    },
    gradedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    gradedAt: {
        type: Date
    },
    versionNumber: {
        type: Number,
        default: 1
    },
    resubmissionCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes
SubmissionSchema.index({ assignmentId: 1, studentId: 1 });
SubmissionSchema.index({ status: 1 });
SubmissionSchema.index({ submittedAt: -1 });

// ✅ FIX: Remove 'next' parameter - use async function without next
SubmissionSchema.pre('save', async function() {
    // Calculate late status before saving
    if (this.isNew && this.assignmentId) {
        const Assignment = mongoose.model('Assignment');
        const assignment = await Assignment.findById(this.assignmentId);
        
        if (assignment && this.submittedAt > assignment.dueDate) {
            this.isLate = true;
            const diffTime = Math.abs(this.submittedAt - assignment.dueDate);
            this.daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
    }
});

module.exports = mongoose.model('Submission', SubmissionSchema);