const isAdvisoryQuery = (query) =>
    /how to|how can|what should|what can|what would|improve|performance|better|tips?|advice|suggest|recommend|help.*(student|learner|class)|teaching|pedagog|learn(ing)?|motivat|best practice|strateg(y|ies)|ကောင်းအောင်|ဘယ်လို|ဘာတွေ|လုပ်ပေးသင့်|အကြံ|တိုးတက်|စွမ်းဆောင်ရည|performance|နည်းလမ်း|မြှင့်တင်|ကူညီ/i.test(
        String(query || '')
    );

const isFactualLookupQuery = (query) =>
    /how many|how much|count|total|number of|list|show me|give me|who is|email|student id|roll|grade|score|pending|approved|submitted|status of|ကျောင်းသား.*(ပေးပါ|စာရင်း|ဘယ်လောက်)|ဘယ်လောက်|စာရင်း|အမှတ|email|ခုံ/i.test(
        String(query || '')
    );

const assessRetrieval = (query, context, ragSnippets = []) => {
    if ((ragSnippets || []).length > 0) return 'matched';

    const q = String(query || '').toLowerCase();

    if (isAdvisoryQuery(query)) return 'advisory';

    if (isFactualLookupQuery(query)) {
        if (/student|ကျောင်းသား/.test(q) && (context?.stats?.totalStudents || 0) > 0) return 'partial';
        if (/project|submission|assignment|အလုပ်ပေးစာ/.test(q) && (context?.stats?.totalProjects || 0) > 0) {
            return 'partial';
        }
        if (/course|သင်တန်း/.test(q) && (context?.courses?.length || 0) > 0) return 'partial';
        if (/teacher|ဆရာ/.test(q) && (context?.stats?.totalTeachers || 0) > 0) return 'partial';
        return 'none';
    }

    return 'general';
};

const buildHybridAnswerPolicy = (retrieval, lang = 'en') => {
    const dbLabel = lang === 'my' ? '**ဒေတာဘေ့စ်မှ:**' : '**From database:**';
    const genLabel = lang === 'my' ? '**အထွေထွေအသိပညာ:**' : '**General knowledge:**';

    const lines = [
        'ANSWER STRATEGY — RAG + LLM KNOWLEDGE',
        `- Use ${dbLabel} ONLY for factual records that appear in DATABASE CONTEXT (names, counts, grades, statuses, emails, lists). Never invent records.`,
        `- Use ${genLabel} for advice, teaching tips, explanations, and "how to improve" questions when the database does not fully answer the question.`,
        '- NEVER refuse an advisory question by only repeating access scope. Answer the user helpfully.',
        '- If both apply: give brief database facts first, then general advice.',
        '- If a factual answer is missing from DATABASE CONTEXT, say it is not stored — you may add brief general knowledge if useful.',
    ];

    if (retrieval === 'matched' || retrieval === 'partial') {
        lines.push('- RETRIEVAL STATUS: Relevant database context is available — cite it when answering factual parts.');
    } else if (retrieval === 'advisory') {
        lines.push(
            '- RETRIEVAL STATUS: This is an advisory/general question — answer primarily from general knowledge. Optionally cite any useful stats from DATABASE CONTEXT if present.'
        );
    } else {
        lines.push(
            '- RETRIEVAL STATUS: No specific database records match this question — use general knowledge unless the user asked for records.'
        );
    }

    return lines.join('\n');
};

module.exports = {
    isAdvisoryQuery,
    isFactualLookupQuery,
    assessRetrieval,
    buildHybridAnswerPolicy,
};
