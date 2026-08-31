const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: [true, 'Please add project ID']
    },
    versionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProjectVersion',
        required: [true, 'Please add version ID']
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Please add teacher ID']
    },
    teacherName: {
        type: String,
        required: true
    },
    // Main feedback
    feedbackText: {
        type: String,
        required: [true, 'Please add feedback text']
    },
    grade: {
        type: Number,
        required: [true, 'Please add grade'],
        min: 0,
        max: 100
    },
    // Category scores
    codeQualityScore: {
        type: Number,
        min: 0,
        max: 100,
        default: null
    },
    documentationScore: {
        type: Number,
        min: 0,
        max: 100,
        default: null
    },
    libraryUsageScore: {
        type: Number,
        min: 0,
        max: 100,
        default: null
    },
    criterionScores: [{
        name: { type: String },
        weight: { type: Number },
        score: { type: Number, min: 0, max: 100 },
        maxScore: { type: Number, default: 100 }
    }],
    presentationScore: {
        type: Number,
        min: 0,
        max: 100,
        default: null
    },
    // Status
    isFinal: {
        type: Boolean,
        default: false
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    publishedAt: {
        type: Date,
        default: null
    },
    // Revision request
    revisionRequested: {
        type: Boolean,
        default: false
    },
    revisionNotes: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Index for fast queries
FeedbackSchema.index({ projectId: 1, versionId: 1 });
FeedbackSchema.index({ teacherId: 1 });
FeedbackSchema.index({ grade: -1 });

// Each project version can have only one final feedback
FeedbackSchema.index({ projectId: 1, versionId: 1, isFinal: 1 }, { 
    unique: true, 
    partialFilterExpression: { isFinal: true } 
});

module.exports = mongoose.model('Feedback', FeedbackSchema);