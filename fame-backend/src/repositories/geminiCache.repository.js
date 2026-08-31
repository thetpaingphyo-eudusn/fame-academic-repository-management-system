const BaseRepository = require('./base.repository');
const GeminiCache = require('../models/GeminiCache.model');
const crypto = require('crypto');

class GeminiCacheRepository extends BaseRepository {
    constructor() {
        super(GeminiCache);
    }

    // Generate query hash
    generateQueryHash(query, filters = {}) {
        const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
        const filterString = JSON.stringify(filters);
        const combined = `${normalizedQuery}|${filterString}`;
        return crypto.createHash('sha256').update(combined).digest('hex');
    }

    // Normalize query text
    normalizeQuery(query) {
        return query.toLowerCase().trim().replace(/\s+/g, ' ');
    }

    // Get cached response
    async getCachedResponse(query, filters = {}) {
        const queryHash = this.generateQueryHash(query, filters);
        const normalizedQuery = this.normalizeQuery(query);
        
        const cache = await this.findOne({
            queryHash,
            normalizedQuery,
            expiresAt: { $gt: new Date() }
        });
        
        if (cache) {
            // Update hit count
            await this.updateById(cache._id, {
                hitCount: cache.hitCount + 1,
                lastHitAt: new Date()
            });
            
            return {
                found: true,
                response: cache.responseText,
                resultProjectIds: cache.resultProjectIds,
                hitCount: cache.hitCount + 1
            };
        }
        
        return { found: false };
    }

    // Save response to cache
    async saveToCache(query, filters, responseText, resultProjectIds, tokensUsed, modelUsed, temperature = 0) {
        const queryHash = this.generateQueryHash(query, filters);
        const normalizedQuery = this.normalizeQuery(query);
        
        // Set expiry to 30 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        
        // Check if already exists (update instead of create)
        const existing = await this.findOne({ queryHash });
        
        if (existing) {
            return await this.updateById(existing._id, {
                responseText,
                resultProjectIds,
                tokensUsed,
                modelUsed,
                temperature,
                hitCount: existing.hitCount + 1,
                lastHitAt: new Date(),
                expiresAt
            });
        }
        
        return await this.create({
            queryHash,
            originalQuery: query,
            normalizedQuery,
            filters,
            responseText,
            resultProjectIds,
            tokensUsed,
            modelUsed,
            temperature,
            hitCount: 1,
            lastHitAt: new Date(),
            expiresAt
        });
    }

    // Get cache statistics
    async getCacheStats() {
        const stats = await this.aggregate([
            {
                $group: {
                    _id: null,
                    totalEntries: { $sum: 1 },
                    totalHits: { $sum: '$hitCount' },
                    avgHits: { $avg: '$hitCount' },
                    expiredCount: {
                        $sum: { $cond: [{ $lt: ['$expiresAt', new Date()] }, 1, 0] }
                    }
                }
            }
        ]);
        
        return stats[0] || { totalEntries: 0, totalHits: 0, avgHits: 0, expiredCount: 0 };
    }

    // Get most popular cached queries
    async getPopularCachedQueries(limit = 10) {
        return await this.findAll(
            { expiresAt: { $gt: new Date() } },
            { sort: { hitCount: -1 }, limit }
        );
    }

    // Clean expired cache entries
    async cleanExpiredCache() {
        const result = await this.deleteMany({ expiresAt: { $lt: new Date() } });
        return result.deletedCount;
    }

    // Clear cache for specific query
    async clearCacheForQuery(query, filters = {}) {
        const queryHash = this.generateQueryHash(query, filters);
        return await this.deleteOne({ queryHash });
    }

    // Clear all cache
    async clearAllCache() {
        return await this.deleteMany({});
    }

    // Get cache size
    async getCacheSize() {
        const result = await this.aggregate([
            {
                $group: {
                    _id: null,
                    totalSize: { $sum: { $strLenCP: '$responseText' } }
                }
            }
        ]);
        return result[0]?.totalSize || 0;
    }

    // Get cache entries by model
    async getCacheByModel(modelName, limit = 50) {
        return await this.findAll(
            { modelUsed: modelName },
            { sort: { hitCount: -1 }, limit }
        );
    }

    // Check if query is cached and valid
    async isCached(query, filters = {}) {
        const queryHash = this.generateQueryHash(query, filters);
        const exists = await this.exists({
            queryHash,
            expiresAt: { $gt: new Date() }
        });
        return exists;
    }

    // Update expiry for a cache entry
    async extendExpiry(query, filters = {}, daysToAdd = 7) {
        const queryHash = this.generateQueryHash(query, filters);
        const cache = await this.findOne({ queryHash });
        
        if (cache) {
            const newExpiry = new Date();
            newExpiry.setDate(newExpiry.getDate() + daysToAdd);
            
            return await this.updateById(cache._id, { expiresAt: newExpiry });
        }
        
        return null;
    }

    // Get cache hit rate
    async getHitRate() {
        const stats = await this.getCacheStats();
        const totalQueries = stats.totalHits + (await this.count());
        return totalQueries > 0 ? (stats.totalHits / totalQueries) * 100 : 0;
    }
}

module.exports = new GeminiCacheRepository();