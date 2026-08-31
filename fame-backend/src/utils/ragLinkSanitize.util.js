const OBJECT_ID_RE = /[a-f0-9]{24}/i;

const fixMalformedProtocol = (href) =>
    String(href || '')
        .trim()
        .replace(/^https:\/(?!\/)/i, 'https://')
        .replace(/^http:\/(?!\/)/i, 'http://');

const extractPathFromAbsoluteUrl = (href) => {
    try {
        const normalized = fixMalformedProtocol(href);
        const withProtocol = /^https?:\/\//i.test(normalized)
            ? normalized
            : `https://${normalized.replace(/^\/+/, '')}`;
        const u = new URL(withProtocol);
        return `${u.pathname}${u.search}${u.hash}`;
    } catch {
        const match = String(href).match(/(?:https?:\/\/|https:\/|http:\/)?[^/]*example\.com(\/[^?\s#]*)?(\?[^\s#)]*)?/i);
        if (match) {
            return `${match[1] || '/projects'}${match[2] || ''}`;
        }
        return null;
    }
};

const buildEntityIndex = (entityLinks = []) => {
    const byId = new Map();
    entityLinks.forEach((link) => {
        if (link?.id) byId.set(String(link.id), link.path);
    });
    return byId;
};

const resolveRagLink = (href, entityLinks = []) => {
    let h = fixMalformedProtocol(href);
    if (!h) return '/';

    const byId = buildEntityIndex(entityLinks);

    const idMatch = h.match(/[?&](?:id|project)=([a-f0-9]{24})/i);
    if (idMatch && byId.has(idMatch[1])) {
        return byId.get(idMatch[1]);
    }

    const bareId = h.match(OBJECT_ID_RE);
    if (bareId && byId.has(bareId[0])) {
        return byId.get(bareId[0]);
    }

    if (/example\.com/i.test(h) || /^https?:\/\//i.test(h) || /^https:\//i.test(h)) {
        const extracted = extractPathFromAbsoluteUrl(h);
        if (extracted) h = extracted;
    }

    if (!h.startsWith('/')) {
        h = `/${h.replace(/^\/+/, '')}`;
    }

    const exact = entityLinks.find((link) => link.path === h);
    if (exact) return exact.path;

    const byIncludedId = entityLinks.find((link) => link.id && h.includes(link.id));
    if (byIncludedId) return byIncludedId.path;

    return h;
};

const sanitizeRagAnswerLinks = (text, entityLinks = []) => {
    if (!text) return text;

    return String(text).replace(/\[([^\]]+)\]\(([^)]+)\)/g, (full, label, href) => {
        const path = resolveRagLink(href, entityLinks);
        return `[${label}](${path})`;
    });
};

const sanitizeEntityLinks = (links = [], entityLinks = []) =>
    (links || []).map((link) => ({
        ...link,
        path: resolveRagLink(link.path || link.href || '', entityLinks),
    }));

module.exports = {
    resolveRagLink,
    sanitizeRagAnswerLinks,
    sanitizeEntityLinks,
};
