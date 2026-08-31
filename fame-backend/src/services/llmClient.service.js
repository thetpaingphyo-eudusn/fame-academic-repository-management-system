const { GoogleGenAI } = require('@google/genai');
const AiConfigService = require('./aiConfig.service');
const { toDisplayText, FAME } = require('../utils/fameBrand.util');

const CODING_SYSTEM_PROMPT = `You are FAME Coding Assistant — an expert front-end engineer and product designer.
Behave like a professional coding mentor: explain design choices clearly, suggest one next improvement.
Always output production-ready UI code with COMPLETE CSS embedded in the response (preview.css field).
Never use external stylesheet links — all styles must be in the CSS field for live preview.
Use modern layout (flex/grid), responsive breakpoints, hover states, and real Unsplash image URLs.`;

class LlmClientService {
    constructor() {
        this.chatBlockedUntil = 0;
        this.embeddingBlockedUntil = 0;
        this.lastError = null;
    }

    _isBlocked(kind = 'chat') {
        const until = kind === 'embedding' ? this.embeddingBlockedUntil : this.chatBlockedUntil;
        return Date.now() < until;
    }

    _markBlocked(kind, error) {
        const status = error?.status || error?.code;
        let delayMs = 30 * 60 * 1000;
        if (status === 429) delayMs = 15 * 60 * 1000;
        if (kind === 'embedding') this.embeddingBlockedUntil = Date.now() + delayMs;
        else this.chatBlockedUntil = Date.now() + delayMs;
    }

    resetState() {
        this.chatBlockedUntil = 0;
        this.embeddingBlockedUntil = 0;
        this.lastError = null;
    }

    async _getConfig() {
        return AiConfigService.getResolvedConfig();
    }

    _openAiBase(provider) {
        return provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1';
    }

    _defaultMaxTokens(provider, purpose = 'chat') {
        if (provider === 'openrouter') {
            return purpose === 'code' ? 4096 : 2048;
        }
        if (provider === 'openai') {
            return purpose === 'code' ? 8192 : 4096;
        }
        return undefined;
    }

    _resolveModel(config, purpose) {
        if (purpose === 'code') {
            return config.codingModel || config.chatModel;
        }
        return config.chatModel;
    }

    async _openAiChat(config, prompt, options = {}) {
        const base = this._openAiBase(config.provider);
        const purpose = options.purpose || 'chat';
        let maxTokens = options.maxTokens ?? this._defaultMaxTokens(config.provider, purpose);
        const model = options.model || this._resolveModel(config, purpose);

        const messages = [];
        if (purpose === 'code' || options.system) {
            messages.push({ role: 'system', content: options.system || CODING_SYSTEM_PROMPT });
        }
        messages.push({ role: 'user', content: prompt });

        const body = {
            model,
            messages,
            temperature: options.temperature ?? (purpose === 'code' ? 0.55 : 0.4),
        };
        if (config.provider === 'openrouter') {
            // Prevent reasoning models from spending the response budget on hidden/internal
            // analysis or leaking it into the final user-facing answer.
            body.reasoning = {
                effort: options.reasoningEffort || 'none',
                exclude: true,
            };
        }
        if (maxTokens) body.max_tokens = maxTokens;

        const res = await fetch(`${base}/chat/completions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json',
                ...(config.provider === 'openrouter'
                    ? { 'HTTP-Referer': 'http://localhost:5173', 'X-OpenRouter-Title': 'FAME Academic Repository' }
                    : {}),
            },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
            const msg = data?.error?.message || data?.message || `HTTP ${res.status}`;
            const err = new Error(msg);
            err.status = res.status;

            const affordMatch = String(msg).match(/can only afford (\d+)/i);
            if (affordMatch && !options._creditRetried && maxTokens) {
                const afford = parseInt(affordMatch[1], 10);
                const reduced = Math.max(512, Math.min(maxTokens, afford - 256));
                return this._openAiChat(config, prompt, {
                    ...options,
                    maxTokens: reduced,
                    _creditRetried: true,
                });
            }

            throw err;
        }
        return data?.choices?.[0]?.message?.content || null;
    }

    async _openAiEmbed(config, text) {
        const base = this._openAiBase(config.provider);
        const truncated = text.length > 6000 ? text.substring(0, 6000) : text;
        const res = await fetch(`${base}/embeddings`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json',
                ...(config.provider === 'openrouter'
                    ? { 'HTTP-Referer': 'http://localhost:5173', 'X-OpenRouter-Title': 'FAME Academic Repository' }
                    : {}),
            },
            body: JSON.stringify({ model: config.embedModel, input: truncated }),
        });
        const data = await res.json();
        if (!res.ok) {
            const err = new Error(data?.error?.message || data?.message || `HTTP ${res.status}`);
            err.status = res.status;
            throw err;
        }
        return data?.data?.[0]?.embedding || null;
    }

    async _geminiChat(config, prompt, options = {}) {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const purpose = options.purpose || 'chat';
        const model = this._resolveModel(config, purpose);
        const text =
            purpose === 'code'
                ? `${CODING_SYSTEM_PROMPT}\n\n---\n\n${prompt}`
                : prompt;
        const result = await ai.models.generateContent({
            model,
            contents: text,
        });
        return result.text || null;
    }

    async _geminiEmbed(config, text) {
        const ai = new GoogleGenAI({ apiKey: config.apiKey });
        const truncated = text.length > 6000 ? text.substring(0, 6000) : text;
        const result = await ai.models.embedContent({
            model: config.embedModel,
            contents: truncated,
        });
        return result?.embeddings?.[0]?.values || result?.embedding?.values || null;
    }

    async chat(prompt, options = {}) {
        const config = await this._getConfig();
        if (!config.hasApiKey || !config.chatEnabled || this._isBlocked('chat')) return null;

        try {
            let text;
            if (config.provider === 'gemini') {
                text = await this._geminiChat(config, prompt, options);
            } else {
                text = await this._openAiChat(config, prompt, options);
            }
            this.lastError = null;
            return text;
        } catch (error) {
            const msg = String(error?.message || '');
            if (config.provider === 'gemini' && /location is not supported|FAILED_PRECONDITION/i.test(msg)) {
                error.message =
                    'Google Gemini is blocked in your region. Switch Provider to OpenRouter in Admin → Settings and use your sk-or-v1 key.';
            } else if (config.provider === 'gemini' && /^sk-or/i.test(config.apiKey || '')) {
                error.message =
                    'This looks like an OpenRouter key (sk-or-…). Set Provider to OpenRouter in Admin → Settings.';
            } else if (/more credits|can only afford|insufficient credits|402/i.test(msg)) {
                error.message =
                    'OpenRouter credits are low. Add credits at openrouter.ai/settings/credits, or switch to a free model in Admin → Settings → AI Configuration.';
            }
            this.lastError = error;
            this._markBlocked('chat', error);
            console.error('LLM chat error:', error.message);
            return null;
        }
    }

    async embed(text) {
        const config = await this._getConfig();
        if (!config.hasApiKey || !config.embeddingEnabled || this._isBlocked('embedding')) return null;

        try {
            let vector;
            if (config.provider === 'gemini') {
                vector = await this._geminiEmbed(config, text);
            } else {
                vector = await this._openAiEmbed(config, text);
            }
            return vector;
        } catch (error) {
            this.lastError = error;
            this._markBlocked('embedding', error);
            console.error('LLM embed error:', error.message);
            return null;
        }
    }

    async testConnection() {
        const config = await this._getConfig();
        if (!config.hasApiKey) {
            return {
                success: false,
                message: toDisplayText(`${FAME} is not configured. Add an API key in Admin → Settings → AI Configuration.`),
                provider: config.provider,
            };
        }
        if (!config.chatEnabled) {
            return { success: false, message: 'AI chat is disabled in settings.', provider: config.provider };
        }
        const text = await this.chat('Reply with exactly: OK');
        return {
            success: !!text,
            message: text
                ? toDisplayText(`${FAME} connected (${config.provider} / ${config.chatModel})`)
                : toDisplayText(this.lastError?.message || `${FAME} test failed`),
            provider: config.provider,
            chatModel: config.chatModel,
            keySource: config.keySource,
        };
    }

    getLastError() {
        return this.lastError;
    }

    isChatBlocked() {
        return this._isBlocked('chat');
    }

    isEmbeddingBlocked() {
        return this._isBlocked('embedding');
    }
}

module.exports = new LlmClientService();
