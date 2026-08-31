const AiConfigService = require('../services/aiConfig.service');
const LlmClientService = require('../services/llmClient.service');
const ApiResponse = require('../utils/apiResponse.util');

class SystemSettingsController {
    async getAiSettings(req, res, next) {
        try {
            const data = await AiConfigService.getPublicConfig();
            ApiResponse.success(res, data, 'AI settings retrieved');
        } catch (error) {
            next(error);
        }
    }

    async updateAiSettings(req, res, next) {
        try {
            const data = await AiConfigService.updateConfig(req.body || {}, req.user._id);
            LlmClientService.resetState();
            ApiResponse.success(res, data, 'AI settings saved');
        } catch (error) {
            next(error);
        }
    }

    async testAiSettings(req, res, next) {
        try {
            AiConfigService.invalidateCache();
            LlmClientService.resetState();
            const result = await LlmClientService.testConnection();
            ApiResponse.success(res, result, result.success ? 'Connection OK' : 'Connection failed');
        } catch (error) {
            next(error);
        }
    }

    async testCursorSettings(req, res, next) {
        try {
            AiConfigService.invalidateCache();
            const CursorAgentService = require('../services/cursorAgent.service');
            const result = await CursorAgentService.testConnection();
            ApiResponse.success(res, result, result.success ? 'Cursor OK' : 'Cursor connection failed');
        } catch (error) {
            next(error);
        }
    }

    async clearAiCache(req, res, next) {
        try {
            const GeminiCache = require('../models/GeminiCache.model');
            const GeminiRagService = require('../services/geminiRag.service');
            const result = await GeminiCache.deleteMany({});
            AiConfigService.invalidateCache();
            LlmClientService.resetState();
            GeminiRagService.resetState();
            ApiResponse.success(
                res,
                { deletedCachedResponses: result.deletedCount || 0 },
                'AI cache cleared. The next request will use fresh settings.'
            );
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new SystemSettingsController();
