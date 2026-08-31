function stripBom(text) {
    return String(text || '').replace(/^\uFEFF/, '').trim();
}

function tryParseJson(raw) {
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function repairJsonString(raw) {
    let s = raw;
    s = s.replace(/,\s*([}\]])/g, '$1');
    s = s.replace(/\r\n/g, '\\n').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
    return s;
}

function extractBalancedJson(text) {
    const src = stripBom(text);
    const start = src.indexOf('{');
    if (start < 0) return null;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = start; i < src.length; i++) {
        const ch = src[i];
        if (inString) {
            if (escape) escape = false;
            else if (ch === '\\') escape = true;
            else if (ch === '"') inString = false;
            continue;
        }
        if (ch === '"') {
            inString = true;
            continue;
        }
        if (ch === '{') depth += 1;
        if (ch === '}') {
            depth -= 1;
            if (depth === 0) {
                const slice = src.slice(start, i + 1);
                return tryParseJson(slice) || tryParseJson(repairJsonString(slice));
            }
        }
    }

    const end = src.lastIndexOf('}');
    if (end > start) {
        const slice = src.slice(start, end + 1);
        return tryParseJson(slice) || tryParseJson(repairJsonString(slice));
    }
    return null;
}

function allFencedBlocks(text) {
    const blocks = [];
    const re = /```(\w*)\s*([\s\S]*?)```/gi;
    let m;
    while ((m = re.exec(text)) !== null) {
        blocks.push({ lang: (m[1] || '').toLowerCase(), content: m[2].trim() });
    }
    return blocks;
}

function extractFromFencedBlocks(text, language = 'html') {
    const blocks = allFencedBlocks(text);
    if (!blocks.length) return null;

    let html = '';
    let css = '';
    let javascript = '';
    const files = [];

    for (const block of blocks) {
        const lang = block.lang;
        const content = block.content;
        if (!content) continue;

        if (lang === 'json') {
            const parsed = tryParseJson(content) || extractBalancedJson(content);
            if (parsed) return parsed;
            continue;
        }

        if (lang === 'html' || lang === 'htm') {
            html = content;
            files.push({ name: 'index.html', content });
        } else if (lang === 'css') {
            css = content;
            files.push({ name: 'styles.css', content });
        } else if (['js', 'javascript', 'jsx', 'ts', 'tsx'].includes(lang)) {
            javascript = content;
            files.push({ name: lang.includes('ts') ? 'script.ts' : 'script.js', content });
        } else if (!lang && /<html[\s>]/i.test(content)) {
            html = content;
            files.push({ name: 'index.html', content });
        } else if (!lang && (/\{[\s\S]*\}/.test(content) || /[:#.]/.test(content.slice(0, 80)))) {
            if (!css && !/<html/i.test(content)) {
                css = content;
                files.push({ name: 'styles.css', content });
            } else if (!html) {
                html = content;
                files.push({ name: 'index.html', content });
            }
        }
    }

    if (!html && !css && !javascript) return null;

    if (html && /<html[\s>]/i.test(html)) {
        const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (styleMatch && !css) css = styleMatch[1].trim();
        if (bodyMatch) html = bodyMatch[1].trim();
    }

    return {
        language,
        files: files.length
            ? files
            : [
                  ...(html ? [{ name: 'index.html', content: html }] : []),
                  ...(css ? [{ name: 'styles.css', content: css }] : []),
                  ...(javascript ? [{ name: 'script.js', content: javascript }] : []),
              ],
        preview: { html, css, javascript },
        explanation: 'Extracted from AI markdown/code blocks.',
        issues: [],
    };
}

function extractFromFullHtmlDocument(text) {
    const doc = text.match(/<!DOCTYPE html[\s\S]*<\/html>/i)?.[0]
        || text.match(/<html[\s\S]*<\/html>/i)?.[0];
    if (!doc) return null;

    const styleMatch = doc.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const bodyMatch = doc.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const scriptMatch = doc.match(/<script[^>]*>([\s\S]*?)<\/script>/i);

    const html = bodyMatch ? bodyMatch[1].trim() : doc;
    const css = styleMatch ? styleMatch[1].trim() : '';
    const javascript = scriptMatch ? scriptMatch[1].trim() : '';

    return {
        language: 'html',
        files: [
            { name: 'index.html', content: html },
            ...(css ? [{ name: 'styles.css', content: css }] : []),
            ...(javascript ? [{ name: 'script.js', content: javascript }] : []),
        ],
        preview: { html, css, javascript },
        explanation: 'Extracted from full HTML document in AI response.',
        issues: [],
    };
}

function parseCodingAssistantResponse(text, language = 'html') {
    const trimmed = stripBom(text);
    if (!trimmed) return { parsed: null, method: 'empty' };

    const jsonFence = trimmed.match(/```json\s*([\s\S]*?)```/i);
    if (jsonFence) {
        const parsed = tryParseJson(jsonFence[1].trim()) || extractBalancedJson(jsonFence[1]);
        if (parsed) return { parsed, method: 'json-fence' };
    }

    if (trimmed.startsWith('{')) {
        const direct = tryParseJson(trimmed) || extractBalancedJson(trimmed);
        if (direct) return { parsed: direct, method: 'json-direct' };
    }

    const balanced = extractBalancedJson(trimmed);
    if (balanced) return { parsed: balanced, method: 'json-balanced' };

    const fromDoc = extractFromFullHtmlDocument(trimmed);
    if (fromDoc) return { parsed: fromDoc, method: 'html-document' };

    const fromBlocks = extractFromFencedBlocks(trimmed, language);
    if (fromBlocks) return { parsed: fromBlocks, method: 'fenced-blocks' };

    return { parsed: null, method: 'failed' };
}

module.exports = {
    parseCodingAssistantResponse,
    extractBalancedJson,
    extractFromFencedBlocks,
};
