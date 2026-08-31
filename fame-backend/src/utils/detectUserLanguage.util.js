function detectUserLanguage(text) {
    const s = String(text || '').trim();
    if (!s) return 'en';

    if (/[\u1000-\u109F]/.test(s)) return 'my';

    const lower = s.toLowerCase();
    const romanizedHints = [
        'mingalaba',
        'mingalabar',
        'ne kaung',
        'nay kaung',
        'kyay zu',
        'kyayzu',
        'kaung par',
        'kaung ba',
        'hote lar',
        'hote tal',
        'tal ma',
        'bel lo',
        'sar tal',
        'pyaw ba',
        'pyaw par',
        'kya hote',
        'atuhote',
        'a tu hote',
        'myanmar',
        'burmese',
        'burma',
        'zay',
        'yay pyay',
        'pyan',
    ];

    if (romanizedHints.some((w) => lower.includes(w))) return 'my';

    return 'en';
}

function detectConversationLanguage(query, history = []) {
    if (detectUserLanguage(query) === 'my') return 'my';

    const recentUser = [...(history || [])]
        .reverse()
        .filter((h) => h.role === 'user')
        .slice(0, 4);

    if (recentUser.some((h) => detectUserLanguage(h.content) === 'my')) return 'my';

    return detectUserLanguage(query);
}

function buildLanguageInstruction(lang) {
    if (lang === 'my') {
        return `DETECTED USER LANGUAGE: Myanmar (Burmese)
- You MUST reply entirely in Myanmar language using Unicode Burmese script (မြန်မာစာ).
- Do NOT reply in English unless the user explicitly asks for English.
- Keep proper nouns, course codes, emails, and markdown link paths unchanged.
- Use natural Burmese for labels, e.g. "**ဒေတာဘေ့စ်မှ:**" not "**From database:**".`;
    }

    return `DETECTED USER LANGUAGE: English
- Reply in English unless the user writes in another language.`;
}

module.exports = {
    detectUserLanguage,
    detectConversationLanguage,
    buildLanguageInstruction,
};
