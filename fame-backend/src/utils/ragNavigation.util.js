const ROLE_ROUTES = {
    admin: {
        projects: '/projects',
        users: '/users',
        courses: '/courses',
        submissions: '/submissions',
        feedback: '/feedback',
        analytics: '/analytics',
    },
    teacher: {
        students: '/students',
        submissions: '/submissions',
        courses: '/courses',
        assignments: '/courses',
        grades: '/grades',
        analytics: '/analytics',
    },
    student: {
        projects: '/my-projects',
        courses: '/my-courses',
        assignments: '/my-courses',
        feedback: '/feedback',
        grades: '/grades',
    },
};

const buildQueryPath = (base, query = {}) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
        if (value != null && value !== '') params.set(key, String(value));
    });
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
};

const buildNavigationCatalog = (context, role) => {
    const routes = ROLE_ROUTES[role] || ROLE_ROUTES.admin;
    const lines = [
        'When you mention these records, include the markdown link on the same line.',
        'Always use the exact paths below — they open the detail view directly (not a search list).',
        '',
    ];
    const entityLinks = [];

    (context.projects || []).slice(0, 60).forEach((p) => {
        if (!p._id) return;
        let path;
        if (role === 'student') {
            path = `/projects/${p._id}`;
        } else if (role === 'teacher') {
            path = buildQueryPath(routes.submissions, { project: p._id });
        } else {
            // admin — open project detail modal
            path = buildQueryPath(routes.projects, { id: p._id });
        }
        lines.push(`Project "${p.title}" | student: ${p.studentName} | grade: ${p.grade ?? 'N/A'} → [Open: ${p.title}](${path})`);
        entityLinks.push({
            type: 'project',
            id: String(p._id),
            label: p.title,
            path,
            subtitle: p.studentName,
        });
    });

    (context.studentProjectMap || []).slice(0, 40).forEach((s) => {
        if (!s._id) return;
        let path;
        if (role === 'admin') {
            path = buildQueryPath(routes.users, { id: s._id, role: 'student' });
        } else if (role === 'teacher' && routes.students) {
            path = buildQueryPath(routes.students, { id: s._id });
        } else if (role === 'student') {
            path = routes.projects || '/my-projects';
        } else {
            return;
        }
        lines.push(`Student ${s.name} (${s.department}) → [Open: ${s.name}](${path})`);
        entityLinks.push({
            type: 'student',
            id: String(s._id),
            label: s.name,
            path,
            subtitle: s.department,
        });
    });

    (context.teachers || []).slice(0, 20).forEach((t) => {
        if (role !== 'admin' || !routes.users || !t._id) return;
        const path = buildQueryPath(routes.users, { id: t._id, role: 'teacher' });
        lines.push(`Teacher ${t.name} (${t.department}) → [Open: ${t.name}](${path})`);
        entityLinks.push({
            type: 'teacher',
            id: String(t._id),
            label: t.name,
            path,
            subtitle: t.department,
        });
    });

    (context.courses || []).slice(0, 20).forEach((c) => {
        if (!c._id || !routes.courses) return;
        let path;
        if (role === 'student') {
            path = `/courses/${c._id}`;
        } else if (role === 'teacher') {
            path = `/courses/${c._id}/assignments`;
        } else {
            path = buildQueryPath(routes.courses, { id: c._id });
        }
        lines.push(`Course ${c.courseCode} — ${c.courseName} → [Open: ${c.courseCode}](${path})`);
        entityLinks.push({
            type: 'course',
            id: String(c._id),
            label: c.courseCode,
            path,
            subtitle: c.courseName,
        });
    });

    (context.assignments || []).slice(0, 30).forEach((a) => {
        if (role === 'teacher' && a._id) {
            const path = `/assignments/${a._id}/submissions`;
            lines.push(`Assignment "${a.title}" (${a.courseCode}) → [Open: ${a.title}](${path})`);
            entityLinks.push({
                type: 'assignment',
                id: String(a._id),
                label: a.title,
                path,
                subtitle: a.courseCode,
            });
        } else if (role === 'student' && a.courseId && a._id) {
            const path = `/courses/${a.courseId}/assignments/${a._id}`;
            lines.push(`Assignment "${a.title}" (${a.courseCode}) → [Open: ${a.title}](${path})`);
            entityLinks.push({
                type: 'assignment',
                id: String(a._id),
                label: a.title,
                path,
                subtitle: a.courseCode,
            });
        } else if (role === 'admin' && a._id) {
            // Admin has no assignment detail route — open related submissions filtered by assignment if available
            const path = a.courseId
                ? buildQueryPath(routes.courses, { id: a.courseId })
                : routes.submissions;
            lines.push(`Assignment "${a.title}" (${a.courseCode}) → [Open: ${a.title}](${path})`);
            entityLinks.push({
                type: 'assignment',
                id: String(a._id),
                label: a.title,
                path,
                subtitle: a.courseCode,
            });
        }
    });

    if (role === 'admin') {
        lines.push('', 'Pages: [All Projects](/projects) | [Users](/users) | [Analytics](/analytics) | [Submissions](/submissions)');
    }

    return { catalogText: lines.join('\n'), entityLinks };
};

const pickSuggestedLinks = (text, entityLinks, limit = 6) => {
    const haystack = (text || '').toLowerCase();
    if (!haystack) return [];

    const scored = entityLinks
        .map((link) => {
            const label = link.label?.toLowerCase() || '';
            const subtitle = link.subtitle?.toLowerCase() || '';
            const exactLabel = Boolean(label && haystack.includes(label));
            let score = 0;
            if (exactLabel) score += 10;
            if (subtitle && haystack.includes(subtitle)) score += 1;
            label.split(/\s+/).forEach((word) => {
                if (word.length > 2 && haystack.includes(word)) score += 1;
            });
            return { link, score, exactLabel };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score);

    // If the response names concrete records, do not dilute those links with
    // unrelated records that only share a department/course subtitle.
    const candidates = scored.some(({ exactLabel }) => exactLabel)
        ? scored.filter(({ exactLabel }) => exactLabel)
        : scored;

    const seen = new Set();
    const result = [];
    for (const { link } of candidates) {
        const key = `${link.type}:${link.path}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(link);
        if (result.length >= limit) break;
    }
    return result;
};

module.exports = {
    ROLE_ROUTES,
    buildNavigationCatalog,
    pickSuggestedLinks,
};
