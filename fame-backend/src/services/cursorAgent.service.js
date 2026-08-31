const CURSOR_API_BASE = 'https://api.cursor.com';
const TERMINAL_STATUSES = new Set(['FINISHED', 'ERROR', 'CANCELLED', 'EXPIRED']);
const POLL_MS = 2500;
const DEFAULT_TIMEOUT_MS = 120000;

class CursorAgentService {
    _authHeaders(apiKey) {
        const token = Buffer.from(`${String(apiKey).trim()}:`).toString('base64');
        return {
            Authorization: `Basic ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };
    }

    async getConfig(forceRefresh = false) {
        const AiConfigService = require('./aiConfig.service');
        const cfg = await AiConfigService.getResolvedConfig(forceRefresh);
        const apiKey = String(cfg.cursorApiKey || '').trim();
        return {
            enabled: cfg.codingAssistantEngine === 'cursor' && !!apiKey,
            apiKey,
            model: cfg.cursorModel || process.env.CURSOR_MODEL || 'composer-2.5',
            hasApiKey: !!apiKey,
        };
    }

    async _request(path, { apiKey, method = 'GET', body, timeoutMs = 30000 } = {}) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(`${CURSOR_API_BASE}${path}`, {
                method,
                headers: this._authHeaders(apiKey),
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });
            const text = await res.text();
            let data = null;
            try {
                data = text ? JSON.parse(text) : null;
            } catch {
                data = { raw: text };
            }
            if (!res.ok) {
                const msg =
                    data?.message ||
                    data?.error?.message ||
                    data?.error ||
                    `Cursor API ${res.status}`;
                const err = new Error(String(msg));
                err.status = res.status;
                err.data = data;
                throw err;
            }
            return data;
        } finally {
            clearTimeout(timer);
        }
    }

    async testConnection() {
        const cfg = await this.getConfig(true);
        if (!cfg.apiKey) {
            return { success: false, message: 'Cursor API key is not configured.' };
        }
        try {
            const data = await this._request('/v1/models', { apiKey: cfg.apiKey });
            const count = Array.isArray(data?.items) ? data.items.length : 0;
            return {
                success: true,
                message: `Cursor API connected (${count} models available).`,
                model: cfg.model,
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Cursor API connection failed.',
            };
        }
    }

    async _pollRun({ apiKey, agentId, runId, timeoutMs = DEFAULT_TIMEOUT_MS }) {
        const started = Date.now();
        while (Date.now() - started < timeoutMs) {
            const run = await this._request(`/v1/agents/${agentId}/runs/${runId}`, { apiKey });
            if (TERMINAL_STATUSES.has(run.status)) {
                if (run.status === 'FINISHED') {
                    return {
                        text: String(run.result || ''),
                        agentId,
                        runId,
                        agentUrl: `https://cursor.com/agents/${agentId}`,
                    };
                }
                throw new Error(`Cursor agent run ${run.status.toLowerCase()}`);
            }
            await new Promise((r) => setTimeout(r, POLL_MS));
        }
        throw new Error('Cursor agent timed out. Try a simpler prompt or increase timeout.');
    }

    async generateText({ prompt, images = [], model, timeoutMs = DEFAULT_TIMEOUT_MS }) {
        const cfg = await this.getConfig();
        if (!cfg.apiKey) {
            throw new Error('Cursor API key is not configured in Admin → Settings.');
        }

        const body = {
            prompt: {
                text: String(prompt || ''),
            },
            model: { id: model || cfg.model },
        };

        if (images.length) {
            body.prompt.images = images.slice(0, 5).map((img) => ({
                data: img.data,
                mimeType: img.mimeType || 'image/png',
            }));
        }

        const created = await this._request('/v1/agents', {
            apiKey: cfg.apiKey,
            method: 'POST',
            body,
            timeoutMs: 60000,
        });

        const agentId = created?.agent?.id;
        const runId = created?.run?.id || created?.agent?.latestRunId;
        if (!agentId || !runId) {
            throw new Error('Cursor agent did not return agent/run ids.');
        }

        return this._pollRun({ apiKey: cfg.apiKey, agentId, runId, timeoutMs });
    }
}

module.exports = new CursorAgentService();
