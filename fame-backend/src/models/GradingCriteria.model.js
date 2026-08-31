const mongoose = require('mongoose');

const CriterionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    weight: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    maxScore: {
        type: Number,
        default: 100
    }
});

const GradingCriteriaSchema = new mongoose.Schema({
    assignmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        required: true,
        unique: true
    },
    criteria: [CriterionSchema],
    totalWeight: {
        type: Number,
        default: 0
    },
    passingGrade: {
        type: Number,
        default: 60
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Auto-calculate total weight before save
GradingCriteriaSchema.pre('save', function(next) {
    this.totalWeight = this.criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
    next();
});

module.exports = mongoose.model('GradingCriteria', GradingCriteriaSchema);