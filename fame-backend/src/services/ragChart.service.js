const { detectConversationLanguage } = require('../utils/detectUserLanguage.util');

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const wantsChart = (query, chartMode = false) => {
    if (chartMode) return true;
    const q = String(query || '');
    return /chart|graph|plot|visuali|diagram|pie chart|bar chart|line chart|donut|ဇယား|ပုံ|ဆွဲ|ပြပ|graph mode|chart mode|draw.*chart|show.*chart/i.test(
        q
    );
};

const prefersPie = (query) => /pie|donut|percent|ratio|share|ခွဲ|ရာခိုင်နှုန်း/i.test(String(query || ''));

const prefersLine = (query) => /line|trend|over time|timeline|ခေတ်ရွေ့/i.test(String(query || ''));

const countBy = (items, keyFn) => {
    const map = new Map();
    items.forEach((item) => {
        const key = keyFn(item);
        if (!key || key === 'N/A') return;
        map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()]
        .map(([name, value]) => ({ name: String(name), value }))
        .sort((a, b) => b.value - a.value);
};

const makeChart = ({ id, type, title, data, description = '' }) => {
    const rows = (data || []).filter((row) => row && Number(row.value) > 0);
    if (!rows.length) return null;
    return {
        id,
        type,
        title,
        description,
        nameKey: 'name',
        dataKey: 'value',
        data: rows,
        colors: PALETTE.slice(0, rows.length),
    };
};

const buildProjectStatusChart = (context, query, lang) => {
    const isMy = lang === 'my';
    const data = [
        { name: isMy ? 'Pending' : 'Pending', value: context.stats.pendingProjects },
        { name: isMy ? 'Approved' : 'Approved', value: context.stats.approvedProjects },
        { name: isMy ? 'Graded' : 'Graded', value: context.stats.gradedProjects },
        { name: isMy ? 'Rejected' : 'Rejected', value: context.stats.rejectedProjects },
        { name: isMy ? 'Revision' : 'Revision', value: context.stats.revisionProjects },
    ];
    return makeChart({
        id: 'project-status',
        type: prefersPie(query) ? 'pie' : 'bar',
        title: isMy ? 'Project status' : 'Projects by Status',
        data,
    });
};

const buildDepartmentChart = (context, query, lang) => {
    const isMy = lang === 'my';
    const data = countBy(context.projects || [], (p) => p.department);
    return makeChart({
        id: 'projects-by-department',
        type: prefersPie(query) ? 'pie' : 'bar',
        title: isMy ? 'Department အလိုက် projects' : 'Projects by Department',
        data,
    });
};

const buildGradeChart = (context, lang) => {
    const isMy = lang === 'my';
    const buckets = [
        { name: '90-100', min: 90, max: 100, value: 0 },
        { name: '80-89', min: 80, max: 89, value: 0 },
        { name: '70-79', min: 70, max: 79, value: 0 },
        { name: '60-69', min: 60, max: 69, value: 0 },
        { name: '<60', min: 0, max: 59, value: 0 },
    ];
    (context.projects || []).forEach((p) => {
        const grade = p.grade;
        if (grade == null || Number.isNaN(Number(grade))) return;
        const g = Number(grade);
        const bucket = buckets.find((b) => g >= b.min && g <= b.max);
        if (bucket) bucket.value += 1;
    });
    const data = buckets.map(({ name, value }) => ({ name, value }));
    return makeChart({
        id: 'grade-distribution',
        type: 'bar',
        title: isMy ? 'Grade distribution' : 'Grade Distribution',
        data,
    });
};

const buildStudentsByYearChart = (context, query, lang) => {
    const isMy = lang === 'my';
    const data = countBy(context.studentProjectMap || [], (s) =>
        s.year != null ? `Year ${s.year}` : null
    );
    return makeChart({
        id: 'students-by-year',
        type: prefersPie(query) ? 'pie' : 'bar',
        title: isMy ? 'Year အလိုက် ကျောင်းသား' : 'Students by Year',
        data,
    });
};

const buildStudentsByDeptChart = (context, query, lang) => {
    const isMy = lang === 'my';
    const data = countBy(context.studentProjectMap || [], (s) => s.department);
    return makeChart({
        id: 'students-by-department',
        type: prefersPie(query) ? 'pie' : 'bar',
        title: isMy ? 'Department အလိုက် ကျောင်းသား' : 'Students by Department',
        data,
    });
};

const buildTopGradesChart = (context, lang) => {
    const isMy = lang === 'my';
    const data = [...(context.projects || [])]
        .filter((p) => p.grade != null)
        .sort((a, b) => b.grade - a.grade)
        .slice(0, 8)
        .map((p) => ({
            name: (p.studentName || p.title || 'Project').slice(0, 18),
            value: Number(p.grade),
        }));
    return makeChart({
        id: 'top-grades',
        type: 'bar',
        title: isMy ? 'Top grades' : 'Top Grades',
        data,
        description: isMy ? 'Project / student အလိုက်' : 'By project or student',
    });
};

const buildGradeTimelineChart = (context, lang) => {
    const isMy = lang === 'my';
    const byMonth = new Map();
    (context.projects || []).forEach((p) => {
        if (p.grade == null || !p.submittedAt) return;
        const d = new Date(p.submittedAt);
        if (Number.isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!byMonth.has(key)) byMonth.set(key, { total: 0, count: 0 });
        const row = byMonth.get(key);
        row.total += Number(p.grade);
        row.count += 1;
    });
    const data = [...byMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, row]) => ({
            name,
            value: Math.round(row.total / row.count),
        }));
    return makeChart({
        id: 'grade-timeline',
        type: 'line',
        title: isMy ? 'Average grade over time' : 'Average Grade Over Time',
        data,
    });
};

const buildCoursesChart = (context, query, lang) => {
    const isMy = lang === 'my';
    const data = (context.courses || []).map((c) => ({
        name: c.courseCode || c.courseName?.slice(0, 12) || 'Course',
        value: (context.studentProjectMap || []).filter((s) =>
            (context.projects || []).some(
                (p) => p.courseCode === c.courseCode && p.studentName === s.name
            )
        ).length || (context.projects || []).filter((p) => p.courseCode === c.courseCode).length,
    }));
    if (!data.some((d) => d.value > 0)) {
        return makeChart({
            id: 'courses-overview',
            type: 'bar',
            title: isMy ? 'သင်တန်းများ' : 'Courses Overview',
            data: (context.courses || []).map((c) => ({ name: c.courseCode, value: 1 })),
        });
    }
    return makeChart({
        id: 'courses-activity',
        type: prefersPie(query) ? 'pie' : 'bar',
        title: isMy ? 'Course activity' : 'Activity by Course',
        data,
    });
};

const pickCharts = (query, context, lang) => {
    const q = String(query || '').toLowerCase();
    const charts = [];
    const push = (chart) => {
        if (chart && !charts.some((c) => c.id === chart.id)) charts.push(chart);
    };

    if (/grade|score|mark|အမှတ/i.test(q)) {
        push(buildGradeChart(context, lang));
        push(buildTopGradesChart(context, lang));
        if (prefersLine(q)) push(buildGradeTimelineChart(context, lang));
    }

    if (/student|learner|ကျောင်းသား/i.test(q)) {
        push(buildStudentsByYearChart(context, query, lang));
        push(buildStudentsByDeptChart(context, query, lang));
    }

    if (/course|subject|class|သင်တန်း/i.test(q)) {
        push(buildCoursesChart(context, query, lang));
    }

    if (/department|dept|cs|it|fis/i.test(q)) {
        push(buildDepartmentChart(context, query, lang));
    }

    if (/status|pending|approved|graded|reject|revision|project|submission/i.test(q)) {
        push(buildProjectStatusChart(context, query, lang));
    }

    if (!charts.length) {
        push(buildProjectStatusChart(context, query, lang));
        push(buildDepartmentChart(context, query, lang));
        push(buildGradeChart(context, lang));
        push(buildStudentsByYearChart(context, query, lang));
    }

    return charts.filter(Boolean).slice(0, 2);
};

class RagChartService {
    wantsChart(query, chartMode = false) {
        return wantsChart(query, chartMode);
    }

    buildCharts(query, context, history = [], chartMode = false) {
        if (!wantsChart(query, chartMode)) return [];
        const lang = detectConversationLanguage(query, history);
        return pickCharts(query, context, lang);
    }

    chartPromptBlock(query, chartMode = false) {
        if (!wantsChart(query, chartMode)) return '';
        return `CHART / GRAPH MODE
- The UI will render interactive chart(s) from DATABASE CONTEXT after your reply.
- Reply with a short summary only (1-3 lines). Do NOT draw ASCII art or markdown tables for the chart data.
- Mention what the chart shows. All numbers must match DATABASE CONTEXT.\n\n`;
    }
}

module.exports = new RagChartService();
