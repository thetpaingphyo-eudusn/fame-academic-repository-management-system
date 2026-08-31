const mongoose = require('mongoose');

const GeminiCacheSchema = new mongoose.Schema({
    queryHash: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    originalQuery: {
        type: String,
        required: true
    },
    normalizedQuery: {
        type: String,
        required: true,
        index: true
    },
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
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'revision', null],
            default: null
        }
    },
    responseText: {
        type: String,
        required: true
    },
    resultProjectIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    }],
    tokensUsed: {
        type: Number,
        default: 0
    },
    modelUsed: {
        type: String,
        default: 'gemini-2.5-flash' // Upgraded to current standard baseline
    },
    temperature: {
        type: Number,
        default: 0
    },
    hitCount: {
        type: Number,
        default: 1
    },
    lastHitAt: {
        type: Date,
        default: Date.now
    },
    // FIX 1: Set a functional default directly in the schema declaration. 
    // This runs cleanly on document creation without breaking lifecycle hooks.
    expiresAt: {
        type: Date,
        required: true,
        index: true,
        default: () => {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            return thirtyDaysFromNow;
        }
    }
}, {
    timestamps: true
});

// Update hit count and last hit time
GeminiCacheSchema.methods.recordHit = async function() {
    this.hitCount += 1;
    this.lastHitAt = new Date();
    return await this.save();
};

// TTL index with proper field name
GeminiCacheSchema.index( { expireAfterSeconds: 0 });

module.exports = mongoose.model('GeminiCache', GeminiCacheSchema);