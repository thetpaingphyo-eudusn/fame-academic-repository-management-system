const { GoogleGenAI } = require('@google/genai');
const { buildLocalFallback } = require('./codingAssistant.fallback');
const AiConfigService = require('./aiConfig.service');
const LlmClientService = require('./llmClient.service');
const CursorAgentService = require('./cursorAgent.service');
const { detectConversationLanguage } = require('../utils/detectUserLanguage.util');
const { enhanceWebPreview, unescapeAiString, scoreDesignQuality } = require('../utils/codingPreviewEnhance.util');
const { parseCodingAssistantResponse } = require('../utils/codingResponseParse.util');
const { FAME, toDisplayText } = require('../utils/fameBrand.util');

const LANGUAGE_CONFIG = {
    html: {
        label: 'HTML + CSS + JavaScript',
        preview: true,
        hint: 'Semantic HTML, separate CSS and optional vanilla JS.',
    },
    react: {
        label: 'React (JSX)',
        preview: true,
        hint: 'React functional components with JSX and CSS module or plain CSS.',
    },
    vue: {
        label: 'Vue 3',
        preview: true,
        hint: 'Vue 3 single-file component style split into .vue and supporting files.',
    },
    tailwind: {
        label: 'HTML + Tailwind CSS',
        preview: true,
        hint: 'Use Tailwind utility classes via CDN in preview-compatible HTML.',
    },
    angular: {
        label: 'Angular (TypeScript)',
        preview: true,
        hint: 'Angular component TypeScript, HTML template, and CSS.',
    },
    python: {
        label: 'Python',
        preview: false,
        hint: 'Clean Python 3 code with functions/classes as appropriate.',
    },
    javascript: {
        label: 'JavaScript (Node.js)',
        preview: false,
        hint: 'Node.js compatible JavaScript modules.',
    },
    typescript: {
        label: 'TypeScript',
        preview: false,
        hint: 'Typed TypeScript with clear interfaces/types.',
    },
    csharp: {
        label: 'C#',
        preview: false,
        hint: 'Modern C# with clear class structure.',
    },
    java: {
        label: 'Java',
        preview: false,
        hint: 'Java with proper package/class structure.',
    },
    php: {
        label: 'PHP',
        preview: false,
        hint: 'PHP with secure, readable structure.',
    },
    flutter: {
        label: 'Flutter (Dart)',
        preview: false,
        hint: 'Flutter Dart widget code.',
    },
    kotlin: {
        label: 'Kotlin',
        preview: false,
        hint: 'Kotlin for Android or backend-style structure.',
    },
    go: {
        label: 'Go',
        preview: false,
        hint: 'Idiomatic Go with clear package and functions.',
    },
};

class CodingAssistantService {
    constructor() {
        console.log('✅ Coding Assistant ready — config from Admin Settings or .env fallback');
    }

    async _getConfig() {
        return AiConfigService.getResolvedConfig();
    }

    async _isEnabled() {
        const cfg = await this._getConfig();
        if (cfg.codingAssistantEnabled === false) return false;
        if (cfg.codingAssistantEngine === 'cursor') {
            return !!(cfg.cursorApiKey || '').trim() || cfg.hasApiKey;
        }
        return cfg.hasApiKey && cfg.codingAssistantEnabled !== false;
    }

    _extractResponseText(result) {
        if (!result) return '';
        if (typeof result.text === 'string') return result.text;
        try {
            const fromParts = result.candidates?.[0]?.content?.parts
                ?.map((p) => p.text)
                .filter(Boolean)
                .join('');
            if (fromParts) return fromParts;
        } catch {
            /* ignore */
        }
        return String(result);
    }

    getLanguages() {
        const topFrontend = ['html', 'react', 'vue', 'tailwind', 'angular'];
        return topFrontend
            .filter((id) => LANGUAGE_CONFIG[id])
            .map((id) => ({
                id,
                label: LANGUAGE_CONFIG[id].label,
                preview: LANGUAGE_CONFIG[id].preview,
            }));
    }

    async _model() {
        const cfg = await this._getConfig();
        return cfg.chatModel || 'gemini-2.5-flash';
    }

    _friendlyError(error) {
        const msg = String(error?.message || error?.cause?.message || '');
        const code = error?.cause?.code || error?.code || '';

        if (/location is not supported/i.test(msg)) {
            return toDisplayText(`${FAME} is not available in your region. Use a supported VPN/region, or create an API key from a supported country in Google AI Studio.`);
        }
        if (code === 'UND_ERR_CONNECT_TIMEOUT' || /connect timeout|fetch failed/i.test(msg)) {
            return toDisplayText(`Cannot reach ${FAME} API (connection timed out). Check your internet, firewall, or VPN — generativelanguage.googleapis.com must be reachable.`);
        }
        if (code === 'UND_ERR_SOCKET' || /other side closed|socket/i.test(msg)) {
            return toDisplayText(`${FAME} closed the connection (often due to network instability or a large image). Try a smaller image, stable internet, or VPN.`);
        }
        if (/quota|429|RESOURCE_EXHAUSTED/i.test(msg)) {
            return toDisplayText(`${FAME} API quota exceeded. Wait for reset or enable billing in Google AI Studio.`);
        }
        if (/more credits|can only afford|insufficient credits|max_tokens/i.test(msg)) {
            return toDisplayText(
                `${FAME} OpenRouter credits are low. Add credits at openrouter.ai/settings/credits, or pick a free model (e.g. google/gemma-4-26b-a4b-it:free) in Admin → Settings.`
            );
        }
        if (/API key|401|403|invalid/i.test(msg)) {
            return toDisplayText(`${FAME} API key is invalid or expired. Check Admin → Settings → AI Configuration.`);
        }
        if (/cursor agent|cursor api/i.test(msg)) {
            return toDisplayText(`Cursor Agent error: ${msg.slice(0, 220)}. Check Cursor API key in Admin → Settings.`);
        }
        return toDisplayText(msg.slice(0, 280) || 'Failed to generate code. Please try again.');
    }

    _isRetryableError(error) {
        const msg = String(error?.message || error?.cause?.message || '');
        const code = String(error?.cause?.code || error?.code || '');
        return /fetch failed|UND_ERR|socket|timeout|ECONNRESET|other side closed/i.test(`${msg} ${code}`);
    }

    async _callGemini(parts) {
        const cfg = await this._getConfig();
        const hasImage = parts.some((p) => p.inlineData);
        const textParts = parts.filter((p) => p.text).map((p) => p.text).join('\n');

        if (cfg.provider !== 'gemini') {
            if (hasImage) {
                throw new Error('Image-to-code requires Google Gemini provider in AI settings.');
            }
            const maxAttempts = 3;
            let lastError;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    const text = await LlmClientService.chat(textParts, { maxTokens: 4096, purpose: 'code' });
                    if (!text) {
                        const llmErr = LlmClientService.getLastError();
                        throw llmErr || new Error('Empty AI response');
                    }
                    return { text };
                } catch (error) {
                    lastError = error;
                    if (attempt < maxAttempts && this._isRetryableError(error)) {
                        await new Promise((r) => setTimeout(r, 1500 * attempt));
                        continue;
                    }
                    throw error;
                }
            }
            throw lastError;
        }

        const ai = new GoogleGenAI({ apiKey: cfg.apiKey });
        const maxAttempts = 3;
        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const response = await ai.models.generateContent({
                    model: await this._model(),
                    contents: [{ role: 'user', parts }],
                });
                return { text: this._extractResponseText(response) };
            } catch (error) {
                lastError = error;
                if (attempt < maxAttempts && this._isRetryableError(error)) {
                    await new Promise((r) => setTimeout(r, 1500 * attempt));
                    continue;
                }
                throw error;
            }
        }

        throw lastError;
    }

    async _callCursorAgent({ systemPrompt, imageBuffer, mimeType }) {
        const images = [];
        if (imageBuffer?.length) {
            images.push({
                data: imageBuffer.toString('base64'),
                mimeType: mimeType || 'image/png',
            });
        }
        const result = await CursorAgentService.generateText({
            prompt: `${systemPrompt}

OUTPUT FORMAT (required): Reply with EITHER:
1) One \`\`\`json block: {"language":"html","files":[...],"preview":{"html":"","css":"","javascript":""},"explanation":"..."}
OR
2) Separate fenced blocks: \`\`\`html, \`\`\`css, \`\`\`javascript with complete code.`,
            images,
        });
        return { text: result.text, agentUrl: result.agentUrl };
    }

    async _callAi(parts, { imageBuffer, mimeType, systemPrompt }) {
        const cfg = await this._getConfig();
        if (cfg.codingAssistantEngine === 'cursor' && (cfg.cursorApiKey || '').trim()) {
            try {
                return await this._callCursorAgent({ systemPrompt, imageBuffer, mimeType });
            } catch (error) {
                console.warn('Cursor agent failed, falling back to standard LLM:', error.message);
                if (!cfg.hasApiKey) throw error;
            }
        }
        return this._callGemini(parts);
    }

    _parseJsonResponse(text, language = 'html') {
        const { parsed } = parseCodingAssistantResponse(text, language);
        return parsed;
    }

    _resolveParsedResponse(text, language, trimmedPrompt) {
        const { parsed, method } = parseCodingAssistantResponse(text, language);
        if (parsed) {
            return { parsed, method, recovered: method !== 'json-direct' && method !== 'json-fence' && method !== 'json-balanced' };
        }
        return { parsed: null, method: 'failed', recovered: false };
    }

    _buildPreviewDocument({ html = '', css = '', javascript = '' }) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="referrer" content="no-referrer" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <style>${css}</style>
</head>
<body>
${html}
<script>${javascript}<\/script>
</body>
</html>`;
    }

    _designQualityBrief() {
        return `DESIGN QUALITY BAR (mandatory — polished production UI, NOT basic homework):
- Role: senior product designer + front-end engineer (Stripe/Apple-style polish).
- Structure: sticky nav (logo + links + CTA), full-width hero/splash with photo + dark overlay + headline + subtext + button, features/trust row, product grid (min 3 cards), footer with links.
- Visual: cohesive palette (warm earth tones for food/farm shops), 8px spacing scale, 16–20px border-radius, layered box-shadows, subtle gradients, hover/focus transitions.
- Typography: @import Google Fonts (DM Sans + Fraunces or similar) in CSS; use clamp() for responsive headings.
- Layout: CSS Grid/Flexbox, mobile-first @media queries.
- Images (CRITICAL): ONLY working full HTTPS URLs. Copy these when relevant:
  • Hero orchard: https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=1600&q=85
  • Apple basket: https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?auto=format&fit=crop&w=900&q=85
  • Red apples: https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=900&q=85
  • Green apples: https://images.unsplash.com/photo-1587049352846-91a032f9ee42?auto=format&fit=crop&w=900&q=85
- Every <img> MUST include referrerpolicy="no-referrer" and meaningful alt text.
- NEVER use relative paths (images/apple.jpg), placeholder.com, or empty divs instead of photos.
- Include realistic prices, Add to Cart buttons, and micro-copy for e-commerce pages.`;
    }

    _languagePrompt(language) {
        const cfg = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.html;
        return `Target programming language/stack: ${cfg.label}.
${cfg.hint}`;
    }

    async _allowsLocalFallback() {
        const cfg = await this._getConfig();
        return cfg.localFallbackEnabled !== false;
    }

    _modeInstruction(mode = 'generate') {
        const map = {
            generate: 'Build new production-ready UI/code from the user request.',
            debug: 'User reports an error or bug. Diagnose root cause, fix the code, and document findings.',
            fix: 'Fix bugs in the provided code. Return corrected files and explain what was wrong.',
            explain: 'Explain the code, errors, or behavior clearly. Provide fixes if needed and helpful tips.',
        };
        return map[mode] || map.generate;
    }

    _buildGenerationPrompt({ prompt, language, hasImage, mode = 'generate', existingFiles = [], userLang = 'en' }) {
        const issuesShape = '"issues":[{"type":"error|warning|tip","title":"short title","detail":"explanation"}]';
        const filesContext = existingFiles.length
            ? `\nExisting code files:\n${existingFiles.map((f) => `--- ${f.name} ---\n${f.content}`).join('\n\n')}\n`
            : '';

        if (hasImage) {
            return `Expert front-end engineer. ${this._modeInstruction(mode)} Language: ${language}.
Return ONLY JSON: {"language":"${language}","files":[{"name":"...","content":"..."}],"preview":{"html":"","css":"","javascript":""},"explanation":"...","issues":[]}
Include ${issuesShape} when debugging/fixing. Web stacks must fill preview fields.
${filesContext}
Request: ${prompt || 'Recreate this design.'}`;
        }

        const langBlock = this._languagePrompt(language);

        const langNote =
            userLang === 'my'
                ? '\nIf the user request is in Myanmar/Burmese, write the "explanation" field in Myanmar Unicode (မြန်မာစာ).'
                : '';

        return `You are FAME Coding Assistant — a senior front-end engineer AND design mentor.
Task: ${this._modeInstruction(mode)}
Language/stack: ${langBlock}
${this._designQualityBrief()}
${filesContext}${langNote}

Assistant behavior:
- In "explanation", write like a helpful mentor: what you built, why, and ONE suggestion to improve next (e.g. "Try Fix Bug mode to add cart animation").
- If user writes in Myanmar, explanation must be in Myanmar Unicode.

Return ONLY valid JSON:
{
  "language": "${language}",
  "files": [{ "name": "index.html", "content": "..." }, { "name": "styles.css", "content": "..." }],
  "preview": { "html": "body HTML only", "css": "ALL styles here — min 120 lines", "javascript": "" },
  "explanation": "mentor-style summary + next step tip",
  "issues": [{ "type": "error|warning|tip", "title": "", "detail": "" }]
}

Critical rules:
- preview.css MUST contain ALL styling (120+ lines). Preview iframe cannot load external CSS files.
- preview.html = body content only (no <html>, no <link rel="stylesheet">).
- files[] must include index.html AND styles.css with same content as preview fields.
- Use semantic class names: .nav, .hero, .products, .product-card, .btn, .price
- Real Unsplash URLs on every product/hero image with referrerpolicy="no-referrer".

User request:
${prompt || 'Build a clean, modern UI implementation.'}`;
    }

    _normalizePayload(parsed, language, prompt = '') {
        const files = Array.isArray(parsed?.files)
            ? parsed.files
                  .filter((f) => f?.name && f?.content != null)
                  .map((f) => ({ name: String(f.name), content: String(f.content) }))
            : [];

        if (!files.length && (parsed?.html || parsed?.css || parsed?.code)) {
            if (parsed.code) {
                const extMap = {
                    python: 'main.py',
                    javascript: 'index.js',
                    typescript: 'index.ts',
                    csharp: 'Program.cs',
                    java: 'Main.java',
                    php: 'index.php',
                    flutter: 'main.dart',
                    kotlin: 'Main.kt',
                    go: 'main.go',
                };
                files.push({
                    name: extMap[language] || 'main.txt',
                    content: String(parsed.code),
                });
            } else {
                if (parsed.html) files.push({ name: 'index.html', content: String(parsed.html) });
                if (parsed.css) files.push({ name: 'styles.css', content: String(parsed.css) });
                if (parsed.javascript || parsed.js) {
                    files.push({ name: 'script.js', content: String(parsed.javascript || parsed.js) });
                }
            }
        }

        files.forEach((f, i) => {
            files[i] = { ...f, content: unescapeAiString(f.content) };
        });

        const preview = parsed?.preview || {};
        let html = String(preview.html || parsed?.html || '');
        let css = String(preview.css || parsed?.css || '');
        let javascript = String(preview.javascript || parsed?.javascript || parsed?.js || '');

        html = unescapeAiString(html);
        css = unescapeAiString(css);
        javascript = unescapeAiString(javascript);

        if (!html) {
            const htmlFile = files.find((f) => /\.html?$/i.test(f.name) || f.name.toLowerCase().includes('template'));
            if (htmlFile) html = String(htmlFile.content);
        }
        if (!css) {
            const cssFile = files.find((f) => /\.css$/i.test(f.name) || /style/i.test(f.name));
            if (cssFile) css = String(cssFile.content);
        }
        if (!javascript) {
            const jsFile = files.find((f) => /\.(js|jsx)$/i.test(f.name));
            if (jsFile) javascript = String(jsFile.content);
        }

        if (html && /<html[\s>]/i.test(html)) {
            const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            if (bodyMatch) html = bodyMatch[1].trim();
            if (!css) {
                const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
                    || String(files.find((f) => /\.html?$/i.test(f.name))?.content || '').match(/<style[^>]*>([\s\S]*?)<\/style>/i);
                if (styleMatch) css = styleMatch[1].trim();
            }
        }

        const issues = Array.isArray(parsed?.issues)
            ? parsed.issues
                  .filter((i) => i?.title || i?.detail)
                  .map((i) => ({
                      type: ['error', 'warning', 'tip'].includes(i.type) ? i.type : 'tip',
                      title: String(i.title || ''),
                      detail: String(i.detail || ''),
                  }))
            : [];

        const payload = {
            language: parsed?.language || language,
            files,
            html,
            css,
            javascript,
            explanation: String(parsed?.explanation || ''),
            issues,
            previewDocument: '',
            canPreview: !!(html || css),
        };

        const webLang = ['html', 'tailwind', 'react', 'vue', 'angular'].includes(payload.language);
        if (payload.canPreview && webLang) {
            const enhanced = enhanceWebPreview({
                html: payload.html,
                css: payload.css,
                javascript: payload.javascript,
                files: payload.files,
                prompt,
            });
            payload.html = enhanced.html;
            payload.css = enhanced.css;
            payload.files = enhanced.files;
            if (enhanced.tips.length) {
                payload.issues = [...payload.issues, ...enhanced.tips];
            }
        }

        if (payload.canPreview) {
            payload.previewDocument = this._buildPreviewDocument({
                html: payload.html,
                css: payload.css,
                javascript: payload.javascript,
            });
        }

        return payload;
    }

    async _generateProfessionalCss(html, userPrompt) {
        const cfg = await this._getConfig();
        if (!cfg.hasApiKey || !html?.trim()) return null;

        const cssPrompt = `Write complete professional CSS for this HTML (minimum 150 lines).
User project: ${userPrompt}

Requirements:
- @import Google Fonts (DM Sans + Fraunces or similar)
- CSS variables for colors, sticky nav, hero with image overlay, product grid cards
- Responsive @media, hover transitions, modern ecommerce polish
- Do NOT repeat or modify the HTML — CSS only

HTML body:
${html.slice(0, 7000)}

Return ONLY raw CSS. No markdown fences. No explanation.`;

        try {
            const raw = await LlmClientService.chat(cssPrompt, { purpose: 'code', maxTokens: 4096 });
            if (!raw) return null;
            let css = String(raw).replace(/^```(?:css)?\s*/i, '').replace(/```\s*$/i, '').trim();
            return css.length > 180 ? css : null;
        } catch (error) {
            console.warn('Professional CSS pass failed:', error.message);
            return null;
        }
    }

    async _applyProfessionalCssPass(payload, userPrompt) {
        if (!payload.html || scoreDesignQuality(payload.html, payload.css) >= 6) {
            return payload;
        }

        const aiCss = await this._generateProfessionalCss(payload.html, userPrompt);
        if (!aiCss) return payload;

        const merged = enhanceWebPreview({
            html: payload.html,
            css: aiCss,
            javascript: payload.javascript,
            files: payload.files,
            prompt: userPrompt,
        });

        payload.css = merged.css;
        payload.html = merged.html;
        payload.files = merged.files;
        payload.previewDocument = this._buildPreviewDocument({
            html: payload.html,
            css: payload.css,
            javascript: payload.javascript,
        });
        payload.explanation = `${payload.explanation}\n\nStyled with a second AI pass for professional layout and typography.`;
        payload.issues = [
            {
                type: 'tip',
                title: 'AI design pass',
                detail: 'CSS was professionally styled while keeping your HTML structure. Use Fix Bug mode to refine further.',
            },
            ...payload.issues,
        ];
        return payload;
    }

    async _generate({ prompt, language = 'html', mode = 'generate', imageBuffer, mimeType, existingFiles = [] }) {
        if (!(await this._isEnabled())) {
            return { success: false, message: toDisplayText(`${FAME} is not configured. Open Admin → Settings → AI Configuration.`) };
        }

        const trimmedPrompt = String(prompt || '').trim();
        const hasImage = !!imageBuffer?.length;
        const userLang = detectConversationLanguage(trimmedPrompt, []);

        if (!trimmedPrompt && !hasImage) {
            return { success: false, message: 'Provide a text prompt and/or a design image.' };
        }

        const lang = LANGUAGE_CONFIG[language] ? language : 'html';
        const systemPrompt = this._buildGenerationPrompt({
            prompt: trimmedPrompt,
            language: lang,
            hasImage,
            mode,
            existingFiles,
            userLang,
        });

        try {
            const parts = [{ text: systemPrompt }];
            if (hasImage) {
                parts.push({
                    inlineData: {
                        mimeType: mimeType || 'image/png',
                        data: imageBuffer.toString('base64'),
                    },
                });
            }

            const result = await this._callAi(parts, {
                imageBuffer,
                mimeType,
                systemPrompt,
            });

            const rawText = this._extractResponseText(result);
            const { parsed, recovered } = this._resolveParsedResponse(rawText, lang, trimmedPrompt);

            if (!parsed) {
                if (await this._allowsLocalFallback()) {
                    const fallback = buildLocalFallback({
                        prompt: trimmedPrompt,
                        language: lang,
                        hasImage,
                    });
                    const payload = this._normalizePayload(fallback, lang, trimmedPrompt);
                    return {
                        success: true,
                        data: payload,
                        source: 'local-fallback',
                        warning: toDisplayText(
                            'AI returned an unreadable format — loaded a starter template. Enable Cursor Agent or try a shorter prompt.'
                        ),
                    };
                }
                return {
                    success: false,
                    message: 'AI response could not be parsed. Try a shorter prompt or enable Cursor Agent in Admin Settings.',
                    raw: rawText?.slice?.(0, 2000) || rawText,
                };
            }

            let payload = this._normalizePayload(parsed, lang, trimmedPrompt);
            if (recovered) {
                payload.issues = [
                    {
                        type: 'tip',
                        title: 'Code loaded',
                        detail: 'Built from AI response. Check Preview tab — use Code tab to edit.',
                    },
                    ...payload.issues,
                ];
            }
            if (lang === 'html' && mode === 'generate' && !hasImage) {
                payload = await this._applyProfessionalCssPass(payload, trimmedPrompt);
            }
            if (!payload.files.length && !payload.html && !payload.css) {
                return {
                    success: false,
                    message: 'No code was generated. Try a clearer prompt or design image.',
                    raw: result.text,
                };
            }

            const source = result.agentUrl
                ? 'cursor-agent'
                : hasImage
                  ? 'gemini-vision'
                  : 'gemini-text';
            return {
                success: true,
                data: {
                    ...payload,
                    cursorAgentUrl: result.agentUrl || undefined,
                },
                source,
            };
        } catch (error) {
            console.error('Code generation error:', error);
            const friendly = this._friendlyError(error);
            if (await this._allowsLocalFallback()) {
                const fallback = buildLocalFallback({
                    prompt: trimmedPrompt,
                    language: lang,
                    hasImage,
                });
                const payload = this._normalizePayload(fallback, lang, trimmedPrompt);
                return {
                    success: true,
                    data: payload,
                    source: 'local-fallback',
                    warning: toDisplayText(`${friendly} Starter template loaded — edit in Code and Preview.`),
                };
            }
            return { success: false, message: friendly };
        }
    }

    async generateFromPrompt({ prompt, language = 'html', mode = 'generate', existingFiles = [] }) {
        return this._generate({ prompt, language, mode, existingFiles });
    }

    async generateFromDesign({ imageBuffer, mimeType, prompt = '', language = 'html', mode = 'generate', existingFiles = [] }) {
        if (!imageBuffer?.length) {
            return { success: false, message: 'Design image is required' };
        }
        return this._generate({
            prompt: prompt || 'Recreate this UI design as closely as possible.',
            language,
            mode,
            imageBuffer,
            mimeType,
            existingFiles,
        });
    }

    async refineCode({ files = [], html, css, javascript, instruction, language = 'html', imageBuffer, mimeType }) {
        if (!(await this._isEnabled())) {
            return { success: false, message: toDisplayText(`${FAME} is not configured. Open Admin → Settings → AI Configuration.`) };
        }
        if (!String(instruction || '').trim()) {
            return { success: false, message: 'Instruction is required' };
        }

        const filesText = (files || [])
            .map((f) => `FILE: ${f.name}\n${f.content}`)
            .join('\n\n');

        const refinePrompt = `Refine the code below for language/stack: ${(LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.html).label}.
${this._designQualityBrief()}

Current files:
${filesText || 'No files'}

Legacy preview snapshot:
HTML: ${html || ''}
CSS: ${css || ''}
JS: ${javascript || ''}

Instruction:
${instruction}

Return ONLY valid JSON:
{
  "language": "${language}",
  "files": [{ "name": "...", "content": "..." }],
  "preview": { "html": "...", "css": "...", "javascript": "..." },
  "explanation": "what changed"
}`;

        try {
            const parts = [{ text: refinePrompt }];
            if (imageBuffer?.length) {
                parts.push({
                    inlineData: {
                        mimeType: mimeType || 'image/png',
                        data: imageBuffer.toString('base64'),
                    },
                });
            }

            const result = await this._callAi(parts, {
                imageBuffer,
                mimeType,
                systemPrompt: refinePrompt,
            });

            const rawText = this._extractResponseText(result);
            const { parsed } = this._resolveParsedResponse(rawText, language, instruction);

            if (!parsed) {
                return { success: false, message: 'Could not parse refined code response. Try a shorter instruction.' };
            }

            return {
                success: true,
                data: this._normalizePayload(parsed, language, instruction),
                source: result.agentUrl ? 'cursor-refine' : 'gemini-refine',
            };
        } catch (error) {
            console.error('Code refine error:', error);
            return { success: false, message: this._friendlyError(error) };
        }
    }
}

module.exports = new CodingAssistantService();
