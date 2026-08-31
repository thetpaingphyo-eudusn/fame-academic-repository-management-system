const SystemSettings = require('../models/SystemSettings.model');
const { AI_PROVIDERS, SETTINGS_KEY } = require('../constants/aiProviders');
const { encrypt, decrypt, maskSecret } = require('../utils/secretCrypto.util');

class AiConfigService {
    constructor() {
        this.cache = null;
        this.cacheAt = 0;
        this.cacheTtlMs = 15 * 1000;
    }

    _envFallbackKey(provider) {
        if (provider === 'openrouter') return process.env.OPENROUTER_API_KEY || '';
        if (provider === 'openai') return process.env.OPENAI_API_KEY || '';
        return process.env.GEMINI_API_KEY || '';
    }

    _detectProviderFromKey(key) {
        const k = String(key || '').trim();
        if (!k) return null;
        if (k.startsWith('sk-or-v1-') || k.startsWith('sk-or-')) return 'openrouter';
        if (k.startsWith('AIza') || k.startsWith('AQ.')) return 'gemini';
        if (k.startsWith('sk-')) return 'openai';
        return null;
    }

    _resolveProviderAndModels(doc, apiKeyFromDb) {
        let provider = doc.provider || 'gemini';
        let chatModel = doc.chatModel;
        let embedModel = doc.embedModel;

        const detected = apiKeyFromDb ? this._detectProviderFromKey(apiKeyFromDb) : null;
        if (detected && detected !== provider) {
            provider = detected;
            const preset = AI_PROVIDERS[detected] || AI_PROVIDERS.gemini;
            if (detected === 'openrouter' || detected === 'openai') {
                if (!String(chatModel || '').includes('/')) chatModel = preset.defaultChatModel;
                if (!String(embedModel || '').includes('/')) embedModel = preset.defaultEmbedModel;
            } else if (detected === 'gemini') {
                if (String(chatModel || '').includes('/')) chatModel = preset.defaultChatModel;
                if (String(embedModel || '').includes('/')) embedModel = preset.defaultEmbedModel;
            }
        }

        return { provider, chatModel, embedModel, providerAutoCorrected: detected && detected !== doc.provider };
    }

    _defaultsFromEnv() {
        const provider = ['gemini', 'openai', 'openrouter'].includes(process.env.AI_PROVIDER)
            ? process.env.AI_PROVIDER
            : 'gemini';
        const preset = AI_PROVIDERS[provider] || AI_PROVIDERS.gemini;
        return {
            key: SETTINGS_KEY,
            provider,
            chatModel: process.env.AI_CHAT_MODEL || process.env.GEMINI_CHAT_MODEL || preset.defaultChatModel,
            embedModel: process.env.AI_EMBED_MODEL || preset.defaultEmbedModel,
            chatEnabled: process.env.RAG_CHAT_USE_GEMINI !== 'false',
            embeddingEnabled: process.env.RAG_CHAT_USE_EMBEDDINGS === 'true',
            localFallbackEnabled:
                process.env.RAG_CHAT_LOCAL_FALLBACK === 'true' ||
                process.env.GEMINI_FALLBACK_ON_ERROR === 'true',
            codingAssistantEnabled: process.env.CODING_ASSISTANT_ENABLED !== 'false',
            codingAssistantEngine:
                process.env.CODING_ASSISTANT_ENGINE === 'cursor' ? 'cursor' : 'standard',
            cursorModel: process.env.CURSOR_MODEL || 'composer-2.5',
            codingModel: process.env.CODING_MODEL || '',
            cursorApiKeyEncrypted: '',
            apiKeyEncrypted: '',
        };
    }

    invalidateCache() {
        this.cache = null;
        this.cacheAt = 0;
    }

    async getDocument(forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && this.cache && now - this.cacheAt < this.cacheTtlMs) {
            return this.cache;
        }
        let doc = await SystemSettings.findOne({ key: SETTINGS_KEY }).lean();
        if (!doc) {
            doc = this._defaultsFromEnv();
        }
        this.cache = doc;
        this.cacheAt = now;
        return doc;
    }

    async getResolvedConfig(forceRefresh = false) {
        const doc = await this.getDocument(forceRefresh);
        const apiKeyFromDb = decrypt(doc.apiKeyEncrypted);
        const { provider, chatModel, embedModel, providerAutoCorrected } = this._resolveProviderAndModels(
            doc,
            apiKeyFromDb
        );
        const apiKey = apiKeyFromDb || this._envFallbackKey(provider);
        const preset = AI_PROVIDERS[provider] || AI_PROVIDERS.gemini;
        const codingModel =
            doc.codingModel ||
            process.env.CODING_MODEL ||
            preset.defaultCodingModel ||
            chatModel;
        return {
            ...doc,
            provider,
            chatModel,
            embedModel,
            codingModel,
            apiKey,
            hasApiKey: !!apiKey?.trim(),
            keySource: apiKeyFromDb ? 'database' : apiKey ? 'env' : 'none',
            providerAutoCorrected,
            codingAssistantEngine: doc.codingAssistantEngine || 'standard',
            cursorModel: doc.cursorModel || 'composer-2.5',
            cursorApiKey: decrypt(doc.cursorApiKeyEncrypted) || process.env.CURSOR_API_KEY || '',
        };
    }

    async getPublicConfig() {
        const doc = await this.getDocument();
        const apiKeyFromDb = decrypt(doc.apiKeyEncrypted);
        const envKey = this._envFallbackKey(doc.provider);
        const hasKey = !!(apiKeyFromDb || envKey);
        return {
            provider: doc.provider,
            chatModel: doc.chatModel,
            embedModel: doc.embedModel,
            chatEnabled: doc.chatEnabled,
            embeddingEnabled: doc.embeddingEnabled,
            localFallbackEnabled: doc.localFallbackEnabled,
            codingAssistantEnabled: doc.codingAssistantEnabled,
            codingAssistantEngine: doc.codingAssistantEngine || 'standard',
            cursorModel: doc.cursorModel || 'composer-2.5',
            codingModel: doc.codingModel || AI_PROVIDERS[doc.provider || 'gemini']?.defaultCodingModel || doc.chatModel,
            hasCursorApiKey: !!(decrypt(doc.cursorApiKeyEncrypted) || process.env.CURSOR_API_KEY),
            cursorApiKeyMasked: (decrypt(doc.cursorApiKeyEncrypted) || process.env.CURSOR_API_KEY)
                ? maskSecret(decrypt(doc.cursorApiKeyEncrypted) || process.env.CURSOR_API_KEY)
                : '',
            hasApiKey: hasKey,
            apiKeyMasked: hasKey ? maskSecret(apiKeyFromDb || envKey) : '',
            keySource: apiKeyFromDb ? 'database' : envKey ? 'env' : 'none',
            updatedAt: doc.updatedAt,
            providers: AI_PROVIDERS,
        };
    }

    async updateConfig(payload, adminUserId) {
        const current = await this.getDocument(true);
        const newKey = String(payload.apiKey || '').trim();
        const existingKey = decrypt(current.apiKeyEncrypted);
        const keyForDetect = newKey && !newKey.includes('••••') ? newKey : existingKey;

        let provider = payload.provider || current.provider || 'gemini';
        const detected = keyForDetect ? this._detectProviderFromKey(keyForDetect) : null;
        if (detected) provider = detected;

        const preset = AI_PROVIDERS[provider] || AI_PROVIDERS.gemini;
        let chatModel = payload.chatModel || current.chatModel || preset.defaultChatModel;
        let embedModel = payload.embedModel || current.embedModel || preset.defaultEmbedModel;

        if (detected && (provider === 'openrouter' || provider === 'openai')) {
            if (!String(chatModel).includes('/')) chatModel = preset.defaultChatModel;
            if (!String(embedModel).includes('/')) embedModel = preset.defaultEmbedModel;
        }

        const update = {
            provider,
            chatModel,
            embedModel,
            chatEnabled: payload.chatEnabled !== undefined ? !!payload.chatEnabled : current.chatEnabled !== false,
            embeddingEnabled: payload.embeddingEnabled !== undefined ? !!payload.embeddingEnabled : !!current.embeddingEnabled,
            localFallbackEnabled:
                payload.localFallbackEnabled !== undefined
                    ? !!payload.localFallbackEnabled
                    : current.localFallbackEnabled !== false,
            codingAssistantEnabled:
                payload.codingAssistantEnabled !== undefined
                    ? !!payload.codingAssistantEnabled
                    : current.codingAssistantEnabled !== false,
            codingAssistantEngine:
                payload.codingAssistantEngine === 'cursor'
                    ? 'cursor'
                    : payload.codingAssistantEngine === 'standard'
                      ? 'standard'
                      : current.codingAssistantEngine || 'standard',
            cursorModel: payload.cursorModel || current.cursorModel || 'composer-2.5',
            codingModel: payload.codingModel || current.codingModel || preset.defaultCodingModel || chatModel,
            updatedBy: adminUserId,
        };

        if (newKey && !newKey.includes('••••')) {
            update.apiKeyEncrypted = encrypt(newKey);
        }

        const newCursorKey = String(payload.cursorApiKey || '').trim();
        if (newCursorKey && !newCursorKey.includes('••••')) {
            update.cursorApiKeyEncrypted = encrypt(newCursorKey);
        }

        const doc = await SystemSettings.findOneAndUpdate(
            { key: SETTINGS_KEY },
            { $set: { key: SETTINGS_KEY, ...update } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ).lean();

        this.invalidateCache();
        const publicConfig = await this.getPublicConfig();
        if (detected && detected !== (payload.provider || current.provider)) {
            publicConfig.providerAutoCorrected = true;
            publicConfig.notice = `Provider auto-set to ${AI_PROVIDERS[detected]?.label || detected} based on your API key.`;
        }
        return publicConfig;
    }

    getProviderCatalog() {
        return AI_PROVIDERS;
    }
}

module.exports = new AiConfigService();
