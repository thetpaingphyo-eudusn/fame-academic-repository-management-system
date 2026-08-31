const BaseRepository = require('./base.repository');
const SearchHistory = require('../models/SearchHistory.model');

class SearchHistoryRepository extends BaseRepository {
    constructor() {
        super(SearchHistory);
    }

    // Log a search
    async logSearch(userId, userRole, queryText, queryType, resultsCount, resultProjectIds, responseTimeMs, geminiUsed = false, geminiTokensUsed = 0, cacheHit = false, ipAddress = null, userAgent = null, filters = {}) {
        return await this.create({
            userId,
            userRole,
            queryText,
            queryType,
            filters,
            resultsCount,
            resultProjectIds,
            responseTimeMs,
            geminiUsed,
            geminiTokensUsed,
            cacheHit,
            ipAddress,
            userAgent,
            searchedAt: new Date()
        });
    }

    // Get search history by user
    async getSearchHistoryByUser(userId, limit = 50) {
        return await this.findAll(
            { userId },
            { sort: { searchedAt: -1 }, limit }
        );
    }

    // Get search history by user and query type
    async getSearchesByType(userId, queryType, limit = 20) {
        return await this.findAll(
            { userId, queryType },
            { sort: { searchedAt: -1 }, limit }
        );
    }

    // Get popular searches (most frequent queries)
    async getPopularSearches(days = 30, limit = 10) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);

        const result = await this.aggregate([
            { $match: { searchedAt: { $gte: dateLimit } } },
            { $group: { _id: '$queryText', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: limit }
        ]);
        return result;
    }

    // Get search statistics by date
    async getSearchStatsByDate(startDate, endDate) {
        const result = await this.aggregate([
            { $match: { searchedAt: { $gte: startDate, $lte: endDate } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$searchedAt' } },
                    totalSearches: { $sum: 1 },
                    geminiSearches: { $sum: { $cond: ['$geminiUsed', 1, 0] } },
                    avgResponseTime: { $avg: '$responseTimeMs' },
                    avgResults: { $avg: '$resultsCount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        return result;
    }

    // Get search stats by user role
    async getSearchStatsByRole(startDate, endDate) {
        const result = await this.aggregate([
            { $match: { searchedAt: { $gte: startDate, $lte: endDate } } },
            {
                $group: {
                    _id: '$userRole',
                    totalSearches: { $sum: 1 },
                    geminiSearches: { $sum: { $cond: ['$geminiUsed', 1, 0] } },
                    avgResponseTime: { $avg: '$responseTimeMs' }
                }
            }
        ]);
        return result;
    }

    // Get recent searches (last N hours)
    async getRecentSearches(hours = 24, limit = 100) {
        const dateLimit = new Date();
        dateLimit.setHours(dateLimit.getHours() - hours);

        return await this.findAll(
            { searchedAt: { $gte: dateLimit } },
            { sort: { searchedAt: -1 }, limit, populate: 'userId' }
        );
    }

    // Get user's search patterns (frequent filters)
    async getUserSearchPatterns(userId) {
        const result = await this.aggregate([
            { $match: { userId: userId } },
            {
                $group: {
                    _id: null,
                    commonDepartments: { $addToSet: '$filters.department' },
                    commonYears: { $addToSet: '$filters.year' },
                    commonSections: { $addToSet: '$filters.section' },
                    totalSearches: { $sum: 1 }
                }
            }
        ]);
        return result[0] || null;
    }

    // Delete old search history (older than days)
    async deleteOldSearches(days = 90) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);
        
        return await this.deleteMany({ searchedAt: { $lt: dateLimit } });
    }

    // Get search count for today by user
    async getTodaySearchCount(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return await this.count({
            userId,
            searchedAt: { $gte: today, $lt: tomorrow }
        });
    }

    // Get searches by result count (searches with zero results)
    async getZeroResultSearches(days = 30) {
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);

        return await this.findAll(
            { resultsCount: 0, searchedAt: { $gte: dateLimit } },
            { sort: { searchedAt: -1 }, limit: 50 }
        );
    }

    // Delete search history by filter (for clear history feature)
async deleteMany(filter) {
    try {
        return await this.model.deleteMany(filter);
    } catch (error) {
        throw error;
    }
}

// Delete user's entire search history (alias for clearHistory)
async deleteUserHistory(userId) {
    return await this.deleteMany({ userId });
}

    
}

module.exports = new SearchHistoryRepository();