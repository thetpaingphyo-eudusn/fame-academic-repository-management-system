const ROLE_SCOPES = {
    admin: {
        label: 'Administrator — full repository access',
        canAsk: ['all projects', 'all students', 'all teachers', 'all courses', 'assignments', 'analytics'],
    },
    teacher: {
        label: 'Teacher — only your assigned courses and related data',
        canAsk: [
            'your courses',
            'your assignments and due dates',
            'students enrolled in your courses',
            'projects submitted in your courses',
            'grades and submission status in your courses',
        ],
        cannotAsk: [
            'other teachers\' courses or private data',
            'students outside your courses',
            'all students or all projects in the system',
            'admin-only analytics or user management',
        ],
    },
    student: {
        label: 'Student — only your own academic data',
        canAsk: [
            'your enrolled courses',
            'your assignments and due dates',
            'your own projects and submissions',
            'your grades and feedback',
        ],
        cannotAsk: [
            'other students\' projects or grades',
            'all students or class rankings',
            'teachers\' private data',
            'courses you are not enrolled in',
        ],
    },
};

const DENIED_PATTERNS = {
    teacher: [
        /\ball\s+(teachers|users|admins?|departments?)\b/i,
        /\bevery\s+teacher\b/i,
        /\bother\s+teachers?\b/i,
        /\badmin\s+(panel|dashboard|analytics|users?)\b/i,
        /\blist\s+(all|every)\s+students?\b/i,
        /\ball\s+students?\s+in\s+(the\s+)?(university|school|system)\b/i,
        /\bevery\s+student\s+in\b/i,
        /\bentire\s+(database|repository|system)\b/i,
    ],
    student: [
        /\ball\s+(students?|projects?|teachers?|users?|courses?)\b/i,
        /\bevery\s+student\b/i,
        /\bother\s+students?\b/i,
        /\bclassmate/i,
        /\bwho\s+(got|has|scored)\s+(the\s+)?(best|highest|top)\b/i,
        /\brank(ing)?\s+(of|for)\s+students?\b/i,
        /\bcompare\s+(me\s+with|to)\s+other\b/i,
        /\badmin\s+(panel|data|users?)\b/i,
        /\bother\s+students?\s+(project|grade|submission)/i,
    ],
};

class RagAccessService {
    getScopeForRole(role) {
        return ROLE_SCOPES[role] || ROLE_SCOPES.student;
    }

    buildAccessPolicyText(role) {
        const scope = this.getScopeForRole(role);
        const lines = [`ACCESS SCOPE: ${scope.label}`];
        if (scope.canAsk?.length) {
            lines.push(`You MAY answer questions about: ${scope.canAsk.join('; ')}.`);
        }
        if (scope.cannotAsk?.length) {
            lines.push(`You MUST REFUSE requests for: ${scope.cannotAsk.join('; ')}.`);
        }
        lines.push(
            'For FACTUAL questions (student names, grades, counts, lists), use DATABASE CONTEXT only — never invent records.',
            'For ADVISORY questions (how to improve performance, teaching tips, study advice, explanations), you MAY and SHOULD use general LLM knowledge when the database does not contain the full answer.',
            'Do NOT refuse advisory or educational questions by only repeating access scope — answer helpfully, and cite database stats only when relevant.'
        );
        return lines.join('\n');
    }

    _extractNameTokens(query) {
        return query
            .replace(
                /\b(show|list|tell|about|student|students|teacher|teachers|project|projects|grade|for|the|my|all|who|is|are|how|many|much|in|course|courses|of|their|his|her|its|this|that|what|which|give|me|please|a|an)\b/gi,
                ' '
            )
            .split(/\s+/)
            .filter((w) => w.length > 2 && /^[a-zA-Z]/.test(w));
    }

    _mentionsUnknownPerson(query, context, role) {
        if (role === 'admin') return null;

        const knownNames = new Set();
        (context.studentProjectMap || []).forEach((s) => {
            if (s.name) knownNames.add(s.name.toLowerCase());
            (s.name || '').split(/\s+/).forEach((part) => {
                if (part.length > 2) knownNames.add(part.toLowerCase());
            });
        });

        if (role === 'admin') {
            (context.teachers || []).forEach((t) => {
                if (t.name) knownNames.add(t.name.toLowerCase());
            });
        }

        const selfName = (context.userName || '').toLowerCase();
        if (selfName) knownNames.add(selfName);

        const tokens = this._extractNameTokens(query);
        for (const token of tokens) {
            const lower = token.toLowerCase();
            if (['project', 'course', 'assignment', 'grade', 'pending', 'approved'].includes(lower)) continue;
            const mightBeName = [...knownNames].some(
                (name) => name.includes(lower) || lower.includes(name.split(' ')[0])
            );
            if (!mightBeName && lower.length > 3 && /student|teacher|person|name/i.test(query)) {
                return token;
            }
        }
        return null;
    }

    validateQuery(query, role, context = {}) {
        if (!query?.trim() || role === 'admin') {
            return { allowed: true };
        }

        if (/how\s+many|how\s+much|count|total|number\s+of|ဘယ်လောက်|နှုန်း|အရေအတွက်|ဘယ်နှစ်/.test(query)) {
            return { allowed: true };
        }

        const { isAdvisoryQuery } = require('../utils/ragQueryIntent.util');
        if (isAdvisoryQuery(query)) {
            return { allowed: true };
        }

        const patterns = DENIED_PATTERNS[role] || [];
        for (const pattern of patterns) {
            if (pattern.test(query)) {
                return {
                    allowed: false,
                    message: this._refusalMessage(role, 'scope'),
                };
            }
        }

        const unknownPerson = this._mentionsUnknownPerson(query, context, role);
        if (
            unknownPerson &&
            /\b(student|teacher|person|who|about)\b/i.test(query) &&
            !/how\s+many|count|total|number\s+of/i.test(query)
        ) {
            return {
                allowed: false,
                message: this._refusalMessage(role, 'person', unknownPerson),
            };
        }

        return { allowed: true };
    }

    _refusalMessage(role, kind, detail) {
        const scope = this.getScopeForRole(role);
        if (kind === 'person') {
            return (
                `I can't share information about **${detail}** — that's outside your access.\n\n` +
                `As a **${role}**, I can only help with: ${scope.canAsk.join(', ')}.\n\n` +
                `Try asking about your own ${role === 'student' ? 'courses, assignments, or projects' : 'courses, assignments, or your students'}.`
            );
        }
        return (
            `That request is outside your **${role}** access permissions.\n\n` +
            `I can help with: ${scope.canAsk.join(', ')}.\n\n` +
            `I cannot provide: ${scope.cannotAsk.join(', ')}.`
        );
    }
}

module.exports = new RagAccessService();
