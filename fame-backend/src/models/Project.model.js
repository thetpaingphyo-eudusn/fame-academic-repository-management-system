const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add project title'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Please add project description']
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Please add student ID']
    },
    studentName: {
        type: String,
        required: true
    },
    assignmentId: {  
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        required: false
    },
    courseId: {  
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Please add course ID']
    },
    department: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    section: {
        type: String,
        required: true
    },
    semester: {
        type: String
    },
    currentVersion: {
        type: Number,
        default: 1
    },
    isLatest: {
        type: Boolean,
        default: true
    },
    originalProjectId: {  
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null
    },
    isResubmission: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'revision', 'graded', 'archived'],
        default: 'pending'
    },
    teacherFeedback: {
        type: String,
        default: null
    },
    grade: {
        type: Number,
        min: 0,
        max: 100,
        default: null
    },
    gradedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    gradedAt: {
        type: Date,
        default: null
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    approvedAt: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes
ProjectSchema.index({ assignmentId: 1, studentId: 1 });
ProjectSchema.index({ courseId: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ studentId: 1, isLatest: 1 });

module.exports = mongoose.model('Project', ProjectSchema);