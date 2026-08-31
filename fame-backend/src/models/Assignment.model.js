const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Course ID is required']
    },
    title: {
        type: String,
        required: [true, 'Assignment title is required'],
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    openDate: {
        type: Date,
        required: [true, 'Open date is required']
    },
    dueDate: {
        type: Date,
        required: [true, 'Due date is required']
    },
    allowLate: {
        type: Boolean,
        default: true
    },
    latePenalty: {
        type: Number,
        default: 10,
        min: 0,
        max: 100
    },
    maxLateDays: {
        type: Number,
        default: 5
    },
    maxFileSize: {
        type: Number,
        default: 200 // MB
    },
    requiredFiles: [{
        type: String,
        enum: ['code', 'srs', 'design', 'manual', 'presentation', 'video']
    }],
    status: {
        type: String,
        enum: ['draft', 'published', 'closed'],
        default: 'draft'
    },
    totalSubmissions: {
        type: Number,
        default: 0
    },
    avgGrade: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes
AssignmentSchema.index({ courseId: 1 });
AssignmentSchema.index({ dueDate: 1 });
AssignmentSchema.index({ status: 1 });

module.exports = mongoose.model('Assignment', AssignmentSchema);