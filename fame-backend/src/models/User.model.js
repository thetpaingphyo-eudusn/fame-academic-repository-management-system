const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please add email'],
        unique: true,
        lowercase: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add password'],
        minlength: 6,
        select: false
    },
    role: {
        type: String,
        enum: ['student', 'teacher', 'admin'],
        default: 'student'
    },
    studentId: {
        type: String,
        unique: true,
        sparse: true
    },
    department: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: [20, 'Department code must be at most 20 characters'],
        match: [/^[A-Z0-9][A-Z0-9._-]*$/, 'Invalid department code']
    },
    year: {
        type: Number,
        min: 1,
        max: 5
    },
    semester: {
        type: String,
        enum: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th']
    },
    section: {
        type: String,
        enum: ['A', 'B', 'C', 'D']
    },
    teacherId: {
        type: String,
        unique: true,
        sparse: true
    },
    position: {
        type: String,
        trim: true,
        default: ''
    },
    assignedCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],
    profileImage: {
        type: String,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// ✅ CORRECT: No 'next' parameter - like your working code
UserSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// ✅ Match user entered password
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);