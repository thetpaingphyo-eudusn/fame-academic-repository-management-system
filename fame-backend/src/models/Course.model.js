const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
    courseCode: {
        type: String,
        required: [true, 'Please add course code'],
        unique: true,
        trim: true
    },
    courseName: {
        type: String,
        required: [true, 'Please add course name'],
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    department: {
        type: String,
        required: [true, 'Please add department']
        // enum removed - can be any string now
    },
    year: {
        type: Number,
        required: [true, 'Please add year'],
        min: 1,
        max: 5
    },
    semester: {
        type: String,
        required: [true, 'Please add semester']
        // enum removed - can be any string now (e.g., "Fall 2024", "1st", "2nd", etc.)
    },
    section: {
        type: String,
        required: [true, 'Please add section']
        // enum removed - can be any string now (e.g., "A", "B", "Section 1", etc.)
    },
    credits: {
        type: Number,
        required: true,
        default: 3,
        min: 1,
        max: 6
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Please assign a teacher']
    },
    academicYear: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Compound index to prevent duplicate course assignment
CourseSchema.index({ courseCode: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('Course', CourseSchema);