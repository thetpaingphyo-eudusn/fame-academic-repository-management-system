const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add department name'],
        unique: true,
        trim: true,
        uppercase: true,
        minlength: [2, 'Department code must be at least 2 characters'],
        maxlength: [20, 'Department code must be at most 20 characters'],
        match: [/^[A-Z0-9][A-Z0-9._-]*$/, 'Department code may contain letters, numbers, hyphen, underscore, or dot']
    },
    fullName: {
        type: String,
        required: [true, 'Please add full department name'],
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    headOfDepartment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    establishedYear: {
        type: Number
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Department', DepartmentSchema);