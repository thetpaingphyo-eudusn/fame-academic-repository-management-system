const mongoose = require('mongoose');

const SearchHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userRole: {
        type: String,
        enum: ['student', 'teacher', 'admin'],
        required: true
    },
    // Search query
    queryText: {
        type: String,
        required: true,
        trim: true
    },
    queryType: {
        type: String,
        enum: ['basic', 'semantic', 'gemini_rag', 'code_search'],
        default: 'basic'
    },
    // Filters applied
    filters: {
        department: {
            type: String,
            default: null
        },
        year: {
            type: Number,
            min: 1,
            max: 5,
            default: null
        },
        section: {
            type: String,
            enum: ['A', 'B', 'C', 'D', null],
            default: null
        },
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            default: null
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'revision', null],
            default: null
        },
        minGrade: {
            type: Number,
            min: 0,
            max: 100,
            default: null
        },
        maxGrade: {
            type: Number,
            min: 0,
            max: 100,
            default: null
        }
    },
    // Search results
    resultsCount: {
        type: Number,
        default: 0
    },
    resultProjectIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    }],
    // Performance metrics
    responseTimeMs: {
        type: Number,
        default: 0
    },
    // Gemini usage
    geminiUsed: {
        type: Boolean,
        default: false
    },
    geminiTokensUsed: {
        type: Number,
        default: 0
    },
    geminiModel: {
        type: String,
        default: null
    },
    // Cache hit/miss
    cacheHit: {
        type: Boolean,
        default: false
    },
    // Search IP and device
    ipAddress: {
        type: String,
        default: null
    },
    userAgent: {
        type: String,
        default: null
    },
    searchedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for fast queries
SearchHistorySchema.index({ userId: 1, searchedAt: -1 });
SearchHistorySchema.index({ queryType: 1, searchedAt: -1 });
SearchHistorySchema.index({ geminiUsed: 1 });
SearchHistorySchema.index({ searchedAt: -1 });

// TTL index to auto-delete old searches after 90 days
SearchHistorySchema.index({ searchedAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('SearchHistory', SearchHistorySchema);