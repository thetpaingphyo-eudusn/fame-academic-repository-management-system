const ProjectRepository = require('../repositories/project.repository');
const DocumentEmbeddingRepository = require('../repositories/documentEmbedding.repository');
const SearchHistoryRepository = require('../repositories/searchHistory.repository');
const GeminiCacheRepository = require('../repositories/geminiCache.repository');
const AuditLogRepository = require('../repositories/auditLog.repository');
const ApiResponse = require('../utils/apiResponse.util');
const GeminiRagService = require('../services/geminiRag.service');


class SearchController {
    // @desc    Semantic search using Gemini RAG
    // @route   POST /api/search/semantic
    // @access  Private (Teacher/Admin)
   async semanticSearch(req, res, next) {
    try {
        const { query, filters = {}, useGemini = true } = req.body;
        const startTime = Date.now();
        
        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }
        
        const trimmedQuery = query.trim();
        let results = [];
        let geminiUsed = false;
        let tokensUsed = 0;
        let cacheHit = false;
        
        // Check cache first
        const cached = await GeminiCacheRepository.getCachedResponse(trimmedQuery, filters);
        
        if (cached && cached.found) {
            cacheHit = true;
            results = await ProjectRepository.findAll({
                _id: { $in: cached.resultProjectIds }
            }, { populate: ['studentId', 'courseId'] });
        } 
        else if (useGemini && GeminiRagService.ai) {
            // 🔥 REAL GEMINI CALL
            geminiUsed = true;
            
            // Get all projects for context
            const allProjects = await ProjectRepository.findAll(filters, {
                limit: 100,
                populate: ['studentId', 'courseId']
            });
            
            // Build context for Gemini
            const context = allProjects.map(p => `
ID: ${p._id}
Title: ${p.title}
Description: ${p.description || 'N/A'}
Department: ${p.department}
Status: ${p.status}
            `).join('\n---\n');
            
            const geminiPrompt = `
You are a search assistant. Query: "${trimmedQuery}"

Projects:
${context}

Return ONLY JSON: 
{
    "matchedIds": ["id1", "id2", ...],
    "reasoning": "explanation"
}`;
            
            const geminiResponse = await GeminiRagService.generateResponse(geminiPrompt);
            tokensUsed = geminiResponse?.length || 100;
            
            // Parse Gemini response
            let matchedIds = [];
            try {
                const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    matchedIds = parsed.matchedIds || [];
                }
            } catch (e) {
                console.error('Parse error:', e);
            }
            
            // Fallback to keyword search if Gemini fails
            if (matchedIds.length === 0) {
                const keywordResults = await ProjectRepository.searchProjects(trimmedQuery, filters);
                matchedIds = keywordResults.map(p => p._id);
            }
            
            results = await ProjectRepository.findAll({
                _id: { $in: matchedIds }
            }, { populate: ['studentId', 'courseId'] });
            
            // Save to cache
            await GeminiCacheRepository.saveToCache(
                trimmedQuery, filters,
                `Gemini search results`,
                results.map(p => p._id),
                tokensUsed,
                'gemini-1.5-flash'
            );
        } 
        else {
            // Fallback to keyword search
            results = await ProjectRepository.searchProjects(trimmedQuery, filters);
        }
        
        const responseTimeMs = Date.now() - startTime;
        
        await SearchHistoryRepository.logSearch(
            req.user._id, req.user.role, trimmedQuery, 'semantic',
            results.length, results.map(p => p._id), responseTimeMs,
            geminiUsed, tokensUsed, cacheHit,
            req.ip, req.headers['user-agent'], filters
        );
        
        ApiResponse.success(res, {
            query: trimmedQuery,
            results,
            meta: {
                total: results.length,
                responseTimeMs,
                geminiUsed,
                cacheHit,
                tokensUsed
            }
        }, 'Search completed');
        
    } catch (error) {
        console.error('Semantic search error:', error);
        next(error);
    }
}

    // @desc    Basic keyword search
    // @route   POST /api/search/basic
    // @access  Private
    async basicSearch(req, res, next) {
        try {
            const { keyword, filters = {} } = req.body;
            const startTime = Date.now();
            
            // Validate keyword
            if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Search keyword is required'
                });
            }
            
            const trimmedKeyword = keyword.trim();
            
            const results = await ProjectRepository.searchProjects(trimmedKeyword, filters);
            const responseTimeMs = Date.now() - startTime;
            
            // Apply role-based filtering
            let finalResults = results;
            if (req.user.role === 'student') {
                finalResults = results.filter(p => p.studentId && p.studentId.toString() === req.user._id.toString());
            }
            
            // ✅ Fixed: Use queryText instead of keyword as first param?
            await SearchHistoryRepository.logSearch(
                req.user._id,           // userId
                req.user.role,          // userRole
                trimmedKeyword,         // queryText
                'basic',                // queryType
                finalResults.length,    // resultsCount
                finalResults.map(p => p._id), // resultProjectIds
                responseTimeMs,         // responseTimeMs
                false,                  // geminiUsed
                0,                      // geminiTokensUsed
                false,                  // cacheHit
                req.ip,                 // ipAddress
                req.headers['user-agent'], // userAgent
                filters                 // filters
            );
            
            ApiResponse.success(res, {
                keyword: trimmedKeyword,
                results: finalResults,
                total: finalResults.length,
                responseTimeMs
            }, 'Basic search completed');
        } catch (error) {
            console.error('Basic search error:', error);
            next(error);
        }
    }

    // @desc    Get search history
    // @route   GET /api/search/history
    // @access  Private
    async getSearchHistory(req, res, next) {
        try {
            const { limit = 50 } = req.query;
            const history = await SearchHistoryRepository.getSearchHistoryByUser(req.user._id, parseInt(limit));
            ApiResponse.success(res, history, 'Search history retrieved');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Clear search history
    // @route   DELETE /api/search/history
    // @access  Private
    async clearSearchHistory(req, res, next) {
        try {
            await SearchHistoryRepository.deleteMany({ userId: req.user._id });
            ApiResponse.success(res, null, 'Search history cleared');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Get popular searches
    // @route   GET /api/search/popular
    // @access  Private (Admin/Teacher)
    async getPopularSearches(req, res, next) {
        try {
            const { days = 30, limit = 10 } = req.query;
            const popular = await SearchHistoryRepository.getPopularSearches(parseInt(days), parseInt(limit));
            ApiResponse.success(res, popular, 'Popular searches retrieved');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SearchController();