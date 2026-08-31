const UserRepository = require('../repositories/user.repository');
const ProjectRepository = require('../repositories/project.repository');
const CourseRepository = require('../repositories/course.repository');
const AssignmentRepository = require('../repositories/assignment.repository');
const SubmissionRepository = require('../repositories/submission.repository');
const { buildNavigationCatalog } = require('../utils/ragNavigation.util');
const { detectConversationLanguage } = require('../utils/detectUserLanguage.util');
const mongoose = require('mongoose');

const LOCAL_MSG = {
    en: {
        greetingTeacher:
            'Hello! Ask about **your courses**, **assignments**, **students**, and **projects** in your classes — English or Myanmar.',
        greetingStudent:
            'Hello! Ask about **your courses**, **assignments**, **projects**, and **grades** — English or Myanmar.',
        greetingAdmin: (role) =>
            `Hello! Ask me about **projects**, **students**, **teachers**, **courses**, or **statistics** in your ${role} data.`,
        gibberish: 'I did not understand that. Please ask a clear question about projects, students, teachers, courses, or stats.',
        noTeachersAccess:
            "You don't have access to other teachers' data. Ask about **your courses**, **assignments**, **students**, or **projects** in your scope.",
        noProjects: (role) => `No projects found for your question in the ${role} data.`,
        noStudents: (query, role) => `No students match "${query}" in your ${role} data.`,
        noCourses: (role) => `No courses match your question in the ${role} data.`,
        noAssignments: (role) => `No assignments found in your ${role} data.`,
        noMatch: (query, role, stats) =>
            `I could not find a specific match for "${query}" in your ${role} data.\n\nAvailable: **${stats.totalProjects}** projects, **${stats.totalStudents}** students, **${stats.totalTeachers || 0}** teachers, **${stats.pendingProjects}** pending, **${stats.gradedProjects}** graded.`,
        countStudents: (n, role) => `There are **${n}** student(s) in your ${role} view.`,
        countCourses: (n, role) => `There are **${n}** course(s) in your ${role} view.`,
        countProjects: (n, label, role) => `There are **${n}** project(s)${label} in your ${role} view.`,
        followUp:
            'My last reply was data from your FAME database. Each project line shows **title**, **student**, **status**, and **grade**.\n\nAsk me to narrow it down — e.g. by student name, department, status, or ask for teachers/students instead.',
        noProjectsAccessible: 'No projects found in your accessible data.',
        noStudentsAccessible: 'No students found in your accessible data.',
        noPending: 'No pending projects in your accessible data.',
        pendingHeader: (n) => `There are **${n}** pending project(s):`,
        statsHeader: (role) => `**Summary (${role} view):**`,
        noMyProjects: 'You have not submitted any projects yet.',
        gradeNA: 'N/A',
        gradeNotYet: 'Not graded yet',
        onTime: 'On time',
        late: 'Late',
        notGraded: 'Not graded',
        studentEmail: (name, email) => `**${name}** — email: ${email}`,
        studentRoll: (name, id) => `**${name}** — student ID: ${id}`,
        studentSection: (name, section) => `**${name}** — section: ${section}`,
        studentFieldMissing: (name, field) => `No ${field} is stored for **${name}** in your accessible data.`,
    },
    my: {
        greetingTeacher:
            'မင်္ဂလာပါ! **သင်တန်းများ**၊ **အလုပ်ပေးစာများ**၊ **ကျောင်းသားများ** နဲ့ **project များ** အကြောင်း မေးနိုင်ပါတယ် — မြန်မာလိုလည်း အင်္ဂလိပ်လိုလည်း မေးပါ။',
        greetingStudent:
            'မင်္ဂလာပါ! **သင်တန်းများ**၊ **အလုပ်ပေးစာများ**၊ **project များ** နဲ့ **အမှတ်များ** အကြောင်း မေးနိုင်ပါတယ် — မြန်မာလိုလည်း အင်္ဂလိပ်လိုလည်း မေးပါ။',
        greetingAdmin: () =>
            'မင်္ဂလာပါ! **project**၊ **ကျောင်းသား**၊ **ဆရာ**၊ **သင်တန်း** သို့မဟုတ် **စာရင်းအင်းများ** အကြောင်း မေးနိုင်ပါတယ်။',
        gibberish:
            'နားမလည်ပါ။ project၊ ကျောင်းသား၊ ဆရာ၊ သင်တန်း သို့မဟုတ် စာရင်းအင်းများအကြောင်း ရှင်းရှင်းလင်းလင်း မေးပါ။',
        noTeachersAccess:
            'အခြား ဆရာများ၏ ဒေတာကို မကြည့်နိုင်ပါ။ **သင်၏ သင်တန်းများ**၊ **အလုပ်ပေးစာများ**၊ **ကျောင်းသားများ** သို့မဟုတ် **project များ** အကြောင်း မေးပါ။',
        noProjects: () => 'မေးခွန်းနှင့် ကိုက်ညီသော project မတွေ့ပါ။',
        noStudents: (query) => `"${query}" နှင့် ကိုက်ညီသော ကျောင်းသား မတွေ့ပါ။`,
        noCourses: () => 'မေးခွန်းနှင့် ကိုက်ညီသော သင်တန်း မတွေ့ပါ။',
        noAssignments: () => 'အလုပ်ပေးစာ မတွေ့ပါ။',
        noMatch: (query, role, stats) =>
            `"${query}" အတွက် ${role} ဒေတာထဲတွင် မတွေ့ပါ။\n\nရရှိနိုင်သည် — project **${stats.totalProjects}** ခု၊ ကျောင်းသား **${stats.totalStudents}** ယောက်၊ ဆရာ **${stats.totalTeachers || 0}** ယောက်၊ pending **${stats.pendingProjects}**၊ graded **${stats.gradedProjects}**`,
        countStudents: (n) => `ကျောင်းသား **${n}** ယောက် ရှိပါတယ်။`,
        countCourses: (n) => `သင်တန်း **${n}** ခု ရှိပါတယ်။`,
        countProjects: (n, label) => `project **${n}** ခု${label} ရှိပါတယ်။`,
        followUp:
            'ယခင် အဖြေသည် FAME ဒေတာဘေ့စ်မှ ရယူထားသော အချက်အလက်များဖြစ်ပါတယ်။ project တစ်ခုချင်းစီတွင် **ခေါင်းစဉ်**၊ **ကျောင်းသား**၊ **status** နဲ့ **grade** ပါဝင်ပါတယ်။\n\nကျောင်းသားအမည်၊ department၊ status အလိုက် ပိုမိုတိကျစွာ မေးနိုင်ပါတယ်။',
        noProjectsAccessible: 'ကြည့်ရှုခွင့်ရှိသော project မရှိပါ။',
        noStudentsAccessible: 'ကြည့်ရှုခွင့်ရှိသော ကျောင်းသား မရှိပါ။',
        noPending: 'pending project မရှိပါ။',
        pendingHeader: (n) => `pending project **${n}** ခု ရှိပါတယ် —`,
        statsHeader: () => '**အကျဉ်းချုပ်:**',
        noMyProjects: 'သင် project တင်သွင်းထားခြင်း မရှိသေးပါ။',
        gradeNA: 'မရှိ',
        gradeNotYet: 'အမှတ်မချသေးပါ',
        onTime: 'အချိန်မှန်',
        late: 'နောက်ကျ',
        notGraded: 'အမှတ်မချသေးပါ',
        studentEmail: (name, email) => `**${name}** — email: ${email}`,
        studentRoll: (name, id) => `**${name}** — ခုံနံပါတ် / student ID: ${id}`,
        studentSection: (name, section) => `**${name}** — section: ${section}`,
        studentFieldMissing: (name, field) => `**${name}** အတွက် ${field} ဒေတာမရှိပါ။`,
    },
};

const t = (lang, key, ...args) => {
    const pack = LOCAL_MSG[lang === 'my' ? 'my' : 'en'];
    const val = pack[key];
    return typeof val === 'function' ? val(...args) : val;
};

const isComplexQuery = (query) =>
    /explain|why|compare|analyze|analysis|detail|describe|advantage|benefit|how does|tell me about|summary of|overview|ကောင်းကျိုး|ဘာကြောင့်|ရှင်းပြ|အသေးစိတ်|နှိုင်းယှဉ်|ဘာလဲ|ဘယ်လို/i.test(
        String(query || '')
    );

const isQuickQuery = (query) => {
    const q = String(query || '').trim();
    if (!q || isComplexQuery(q)) return false;

    if (/^(hi|hello|hey|hlo|mingalaba|mingalabar|မင်္ဂလာပါ|good morning|good evening|good afternoon)/i.test(q)) {
        return true;
    }

    const words = q.split(/\s+/).filter(Boolean);
    const isShort = q.length <= 72 || words.length <= 12;
    if (!isShort) return false;

    return /(\bstudent|\bcourse|\bproject|\bassignment|\bteacher|\bpending|\bstats|\bcount|\bhow many|\btotal|\blist|\btop\s*\d+|\bgrade|\bmy\b|\bmine\b|email|e-mail|ကျောင်းသား|သင်တန်း|project|အလုပ်ပေးစာ|ဆရာ|pending|စာရင်း|ရှိ|ဘယ်လောက်|ပေးပါ|ပြ|အားလုံး|အမှတ်|ငါ|ကျွန်|ခုံ|နံပါတ်|မေးလ်)/i.test(
        q
    );
};

const isFallbackLocalAnswer = (answer) => {
    if (!answer?.trim()) return true;
    const a = answer.toLowerCase();
    return (
        a.includes('could not find a specific match') ||
        a.includes('ဒေတာထဲတွင် မတွေ့ပါ') ||
        a.includes('did not understand') ||
        a.includes('နားမလည်ပါ') ||
        a.includes("my last reply was data from your fame") ||
        a.includes('ယခင် အဖြေသည် fame')
    );
};

const compactQuickAnswer = (answer, query, lang = 'en') => {
    if (!answer || !isQuickQuery(query)) return answer;

    const lines = answer.split('\n');
    const bulletLines = lines.filter((line) => /^[\s]*([•\-*]|\d+\.)\s/.test(line));
    if (bulletLines.length <= 5) return answer;

    const intro = lines.filter((line) => line.trim() && !/^[\s]*([•\-*]|\d+\.)\s/.test(line));
    const kept = bulletLines.slice(0, 5);
    const rest = bulletLines.length - 5;
    const more = lang === 'my' ? `(နောက် ${rest} ခု)` : `(+${rest} more)`;
    return [...intro, ...kept, more].filter(Boolean).join('\n');
};

const toPlain = (doc) => (doc?.toObject ? doc.toObject() : doc);

/** Drop null/undefined and invalid values so Mongo $in queries never receive "null". */
const toObjectIdList = (...lists) => {
    const flat = lists.flat().filter((id) => id != null && id !== '');
    const unique = [...new Set(flat.map((id) => String(id)))];
    return unique.filter((id) => mongoose.Types.ObjectId.isValid(id));
};

const assignmentSummary = (assignment, course) => {
    const a = toPlain(assignment);
    const c = course ? toPlain(course) : a.courseId;
    return {
        _id: a._id,
        title: a.title || 'Untitled',
        description: (a.description || '').slice(0, 400),
        courseId: c?._id || a.courseId,
        courseCode: c?.courseCode || 'N/A',
        courseName: c?.courseName || 'N/A',
        dueDate: a.dueDate,
        openDate: a.openDate,
        status: a.status || 'draft',
        totalSubmissions: a.totalSubmissions || 0,
        avgGrade: a.avgGrade ?? null,
        allowLate: a.allowLate,
    };
};

const submissionSummary = (submission, assignment) => {
    const s = toPlain(submission);
    const a = assignment ? toPlain(assignment) : s.assignmentId;
    return {
        _id: s._id,
        assignmentTitle: a?.title || 'Assignment',
        assignmentId: a?._id || s.assignmentId,
        grade: s.grade ?? null,
        status: s.status || 'submitted',
        submittedAt: s.submittedAt,
        isLate: s.isLate,
        feedback: (s.feedback || '').slice(0, 200),
    };
};

const mergeCoursesById = (lists) => {
    const map = new Map();
    lists.flat().forEach((course) => {
        const c = toPlain(course);
        if (c?._id) map.set(String(c._id), c);
    });
    return Array.from(map.values());
};

const projectSummary = (project) => {
    const p = toPlain(project);
    const student = p.studentId;
    return {
        _id: p._id,
        title: p.title || 'Untitled',
        description: (p.description || '').slice(0, 800),
        studentName: p.studentName || student?.name || 'Unknown',
        studentId: student?._id || p.studentId,
        department: p.department || 'N/A',
        year: p.year,
        section: p.section || 'N/A',
        status: p.status || 'pending',
        grade: p.grade ?? null,
        submittedAt: p.submittedAt,
        courseCode: p.courseId?.courseCode || 'N/A',
        courseName: p.courseId?.courseName || 'N/A',
    };
};

const buildStudentProjectMap = (projects, students = []) => {
    const map = new Map();

    students.forEach((student) => {
        const s = toPlain(student);
        map.set(String(s._id), {
            _id: s._id,
            name: s.name || 'Unknown',
            email: s.email,
            studentId: s.studentId,
            department: s.department || 'N/A',
            year: s.year,
            section: s.section || 'N/A',
            projects: [],
        });
    });

    projects.forEach((project) => {
        const summary = projectSummary(project);
        const key = String(summary.studentId || '');
        if (!key) return;

        if (!map.has(key)) {
            map.set(key, {
                _id: summary.studentId,
                name: summary.studentName,
                department: summary.department,
                year: summary.year,
                section: summary.section,
                projects: [],
            });
        }
        map.get(key).projects.push({
            title: summary.title,
            status: summary.status,
            grade: summary.grade,
        });
    });

    return Array.from(map.values());
};

const formatStudentLine = (student, lang, { includeProjects = true } = {}) => {
    const s = student;
    const idPart = s.studentId ? `ID: ${s.studentId}` : 'ID: N/A';
    const emailPart = s.email || 'N/A';
    const meta = `${s.department} Y${s.year ?? '?'} section ${s.section || 'N/A'}`;
    let line = `• **${s.name}** — ${idPart} — ${emailPart} — ${meta}`;
    if (includeProjects) {
        const proj =
            s.projects?.length > 0
                ? s.projects.map((p) => `"${p.title}" (${p.status})`).join(', ')
                : lang === 'my'
                  ? 'project မရှိ'
                  : 'No projects';
        line += ` — Projects: ${proj}`;
    }
    return line;
};

const formatContextText = (context) => {
    const lines = [
        `User role: ${context.role}`,
        `Total projects: ${context.stats.totalProjects}`,
        `Total students: ${context.stats.totalStudents}`,
        `Pending: ${context.stats.pendingProjects} | Approved: ${context.stats.approvedProjects} | Graded: ${context.stats.gradedProjects}`,
        '',
        '--- TOP PROJECTS (by grade) ---',
    ];

    context.topProjects.forEach((p, index) => {
        lines.push(
            `${index + 1}. [id:${p._id}] "${p.title}" — ${p.studentName} (${p.department}, Y${p.year ?? '?'}) — Grade: ${p.grade ?? 'N/A'} — Status: ${p.status}`
        );
        if (p.description) {
            lines.push(`   Description: ${p.description}`);
        }
    });

    lines.push('', '--- ALL PROJECTS (detail) ---');
    context.projects.slice(0, 80).forEach((p) => {
        lines.push(
            `[id:${p._id}] "${p.title}" | ${p.studentName} | ${p.department} Y${p.year ?? '?'} | ${p.status} | grade:${p.grade ?? 'N/A'} | course:${p.courseCode}`
        );
        if (p.description) {
            lines.push(`   About: ${p.description}`);
        }
    });

    lines.push('', '--- STUDENTS & THEIR PROJECTS ---');
    context.studentProjectMap.slice(0, 40).forEach((student) => {
        const projectList =
            student.projects.length > 0
                ? student.projects.map((p) => `"${p.title}" (${p.status}, grade: ${p.grade ?? 'N/A'})`).join('; ')
                : 'No projects';
        lines.push(
            `[id:${student._id}] ${student.name} | studentId: ${student.studentId || 'N/A'} | email: ${student.email || 'N/A'} | ${student.department} Y${student.year ?? '?'} section:${student.section || 'N/A'} | ${projectList}`
        );
    });

    if (context.courses?.length) {
        lines.push('', '--- COURSES ---');
        context.courses.slice(0, 20).forEach((course) => {
            lines.push(
                `${course.courseCode} — ${course.courseName} | Teacher: ${course.teacherName || 'N/A'} | Dept: ${course.department || 'N/A'}`
            );
        });
    }

    if (context.teachers?.length) {
        lines.push('', '--- TEACHERS ---');
        context.teachers.slice(0, 30).forEach((teacher) => {
            lines.push(
                `${teacher.name} | ${teacher.department} | ID: ${teacher.teacherId || 'N/A'} | Courses: ${teacher.coursesCount} | Projects: ${teacher.totalProjects} | Graded: ${teacher.projectsGraded} | Avg grade: ${teacher.avgGrade ?? 'N/A'}`
            );
        });
    }

    if (context.assignments?.length) {
        lines.push('', '--- ASSIGNMENTS ---');
        context.assignments.slice(0, 30).forEach((a) => {
            lines.push(
                `[id:${a._id}] "${a.title}" | ${a.courseCode} | due: ${a.dueDate ? new Date(a.dueDate).toISOString().slice(0, 10) : 'N/A'} | status: ${a.status} | submissions: ${a.totalSubmissions}`
            );
            if (a.description) lines.push(`   About: ${a.description}`);
        });
    }

    if (context.submissions?.length) {
        lines.push('', '--- SUBMISSIONS (scoped) ---');
        context.submissions.slice(0, 30).forEach((s) => {
            lines.push(
                `"${s.assignmentTitle}" | grade: ${s.grade ?? 'N/A'} | status: ${s.status} | late: ${s.isLate ? 'yes' : 'no'}`
            );
        });
    }

    return lines.join('\n');
};

const STOP_WORDS = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one',
    'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old',
    'see', 'two', 'way', 'who', 'boy', 'did', 'let', 'put', 'say', 'she', 'too', 'use', 'give',
    'show', 'tell', 'what', 'when', 'where', 'which', 'with', 'have', 'from', 'they', 'this',
    'that', 'will', 'your', 'about', 'please', 'want', 'need', 'like', 'just', 'also', 'their',
    'there', 'would', 'could', 'should', 'been', 'being', 'does', 'doing', 'into', 'some',
    'than', 'them', 'then', 'these', 'those', 'very', 'much', 'many', 'any', 'each', 'every',
]);

const extractTokens = (query) =>
    query
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

const scoreProject = (project, tokens) => {
    const haystack = [
        project.title,
        project.studentName,
        project.department,
        project.status,
        project.courseCode,
        project.courseName,
        project.description,
        String(project.year),
        project.section,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    return tokens.reduce((score, token) => (haystack.includes(token) ? score + 1 : score), 0);
};

const scoreStudent = (student, tokens) => {
    const haystack = [student.name, student.email, student.studentId, student.department, String(student.year), student.section]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    return tokens.reduce((score, token) => (haystack.includes(token) ? score + 1 : score), 0);
};

const buildTeacherSummaries = (teachers, courses, projects) => {
    return (teachers || []).map((teacher) => {
        const t = toPlain(teacher);
        const teacherCourses = (courses || []).filter(
            (c) => String(toPlain(c).teacherId?._id || toPlain(c).teacherId) === String(t._id)
        );
        const courseIds = new Set(teacherCourses.map((c) => String(toPlain(c)._id)));
        const teacherProjects = (projects || []).filter((p) => {
            const plain = toPlain(p);
            const courseId = String(plain.courseId?._id || plain.courseId || '');
            return courseIds.has(courseId);
        });
        const graded = teacherProjects.filter((p) => projectSummary(p).grade != null);
        const avgGrade =
            graded.length > 0
                ? Math.round(graded.reduce((sum, p) => sum + projectSummary(p).grade, 0) / graded.length)
                : null;

        return {
            _id: t._id,
            name: t.name || 'Unknown',
            email: t.email,
            department: t.department || 'N/A',
            teacherId: t.teacherId || 'N/A',
            coursesCount: teacherCourses.length,
            courseCodes: teacherCourses.map((c) => toPlain(c).courseCode).filter(Boolean),
            totalProjects: teacherProjects.length,
            projectsGraded: graded.length,
            avgGrade,
        };
    });
};

class RagContextService {
    async buildRoleContext(user) {
        const role = user.role;

        if (role === 'admin') {
            const [projects, students, courses, teachers] = await Promise.all([
                ProjectRepository.findAll(
                    { isActive: true },
                    { populate: ['studentId', 'courseId'], sort: { submittedAt: -1 }, limit: 300 }
                ),
                UserRepository.findAll(
                    { role: 'student', isActive: true },
                    { select: '-password', sort: { name: 1 }, limit: 500 }
                ),
                CourseRepository.findAll({}, { populate: 'teacherId', sort: { courseCode: 1 } }),
                UserRepository.findAll(
                    { role: 'teacher', isActive: true },
                    { select: '-password', sort: { name: 1 } }
                ),
            ]);

            return this._assembleContext(role, projects, students, courses, teachers);
        }

        if (role === 'teacher') {
            const profile = await UserRepository.findById(user._id, { select: '-password' });
            const assignedCourseIds = toObjectIdList(profile?.assignedCourses || []);
            const [coursesByTeacher, coursesByAssigned] = await Promise.all([
                CourseRepository.findAll({ teacherId: user._id }, { populate: 'teacherId' }),
                assignedCourseIds.length
                    ? CourseRepository.findAll({ _id: { $in: assignedCourseIds } }, { populate: 'teacherId' })
                    : [],
            ]);
            const courses = mergeCoursesById([coursesByTeacher, coursesByAssigned]);
            const courseIds = courses.map((c) => c._id);

            const [projects, assignments] = await Promise.all([
                courseIds.length > 0
                    ? ProjectRepository.findAll(
                          { courseId: { $in: courseIds }, isActive: true },
                          { populate: ['studentId', 'courseId'], sort: { submittedAt: -1 } }
                      )
                    : [],
                courseIds.length > 0
                    ? AssignmentRepository.findAll(
                          { courseId: { $in: courseIds }, status: { $in: ['published', 'closed'] } },
                          { sort: { dueDate: 1 } }
                      )
                    : [],
            ]);

            let scopedSubmissions = [];
            if (courseIds.length > 0) {
                const assignmentIds = (assignments || []).map((a) => a._id);
                if (assignmentIds.length) {
                    scopedSubmissions = await SubmissionRepository.findAll(
                        { assignmentId: { $in: assignmentIds } },
                        { populate: ['assignmentId', 'studentId'], sort: { submittedAt: -1 }, limit: 200 }
                    );
                }
            }

            const projectStudentIds = toObjectIdList(projects.map((p) => p.studentId?._id || p.studentId));
            const [enrolledStudents, projectStudents] = await Promise.all([
                courseIds.length > 0
                    ? UserRepository.findAll(
                          {
                              role: 'student',
                              isActive: true,
                              assignedCourses: { $in: courseIds },
                          },
                          { select: '-password', sort: { name: 1 } }
                      )
                    : [],
                projectStudentIds.length > 0
                    ? UserRepository.findAll({ _id: { $in: projectStudentIds } }, { select: '-password' })
                    : [],
            ]);

            const studentMap = new Map();
            [...enrolledStudents, ...projectStudents].forEach((student) => {
                const s = toPlain(student);
                studentMap.set(String(s._id), s);
            });
            const students = Array.from(studentMap.values());

            return this._assembleContext(role, projects, students, courses, [], {
                assignments,
                submissions: scopedSubmissions,
                userName: profile?.name || user.name,
            });
        }

        // student
        const profile = await UserRepository.findById(user._id, { select: '-password' });
        const projects = await ProjectRepository.findAll(
            { studentId: user._id, isActive: true },
            { populate: ['courseId', 'assignmentId'], sort: { submittedAt: -1 } }
        );
        const allCourseIds = toObjectIdList(
            projects.map((p) => p.courseId?._id || p.courseId),
            profile?.assignedCourses || []
        );

        const courses =
            allCourseIds.length > 0
                ? await CourseRepository.findAll({ _id: { $in: allCourseIds } }, { populate: 'teacherId' })
                : [];

        const courseIds = courses.map((c) => c._id);
        const assignments =
            courseIds.length > 0
                ? await AssignmentRepository.findAll(
                      { courseId: { $in: courseIds }, status: { $in: ['published', 'closed'] } },
                      { sort: { dueDate: 1 } }
                  )
                : [];

        const submissions = await SubmissionRepository.findAll(
            { studentId: user._id },
            { populate: ['assignmentId'], sort: { submittedAt: -1 } }
        );

        const students = [profile].filter(Boolean);

        return this._assembleContext(role, projects, students, courses, [], {
            assignments,
            submissions,
            userName: profile?.name || user.name,
        });
    }

    _assembleContext(role, projects, students, courses, teachers = [], extras = {}) {
        const summaries = projects.map(projectSummary);
        const topProjects = [...summaries]
            .sort((a, b) => (b.grade ?? -1) - (a.grade ?? -1))
            .slice(0, 10);

        const studentProjectMap = buildStudentProjectMap(projects, students);
        const courseRows = (courses || []).map((c) => {
            const course = toPlain(c);
            return {
                _id: course._id,
                courseCode: course.courseCode,
                courseName: course.courseName,
                department: course.department,
                teacherName: course.teacherId?.name || 'N/A',
            };
        });

        const courseMap = new Map((courses || []).map((c) => [String(toPlain(c)._id), toPlain(c)]));
        const assignmentRows = (extras.assignments || []).map((a) =>
            assignmentSummary(a, courseMap.get(String(toPlain(a).courseId)))
        );
        const submissionRows = (extras.submissions || []).map((s) =>
            submissionSummary(s, toPlain(s.assignmentId))
        );

        const stats = {
            totalProjects: summaries.length,
            totalStudents: studentProjectMap.length,
            totalTeachers: teachers.length,
            totalAssignments: assignmentRows.length,
            totalSubmissions: submissionRows.length,
            pendingProjects: summaries.filter((p) => p.status === 'pending').length,
            approvedProjects: summaries.filter((p) => p.status === 'approved').length,
            gradedProjects: summaries.filter((p) => p.status === 'graded' || p.grade != null).length,
            rejectedProjects: summaries.filter((p) => p.status === 'rejected').length,
            revisionProjects: summaries.filter((p) => p.status === 'revision').length,
        };

        const teacherSummaries = buildTeacherSummaries(teachers, courses, projects).sort(
            (a, b) => b.projectsGraded - a.projectsGraded || (b.avgGrade ?? 0) - (a.avgGrade ?? 0)
        );

        const context = {
            role,
            userName: extras.userName || '',
            stats,
            projects: summaries,
            topProjects,
            studentProjectMap,
            courses: courseRows,
            assignments: assignmentRows,
            submissions: submissionRows,
            teachers: teacherSummaries,
            topTeachers: teacherSummaries.slice(0, 10),
        };

        context.contextText = formatContextText(context);
        const nav = buildNavigationCatalog(context, role);
        context.navigationCatalog = nav.catalogText;
        context.entityLinks = nav.entityLinks;
        return context;
    }

    _formatTeachersList(teachers, intro = '') {
        if (!teachers?.length) {
            return 'No teachers found in your accessible data.';
        }
        const lines = teachers.map(
            (t, i) =>
                `${i + 1}. **${t.name}** — ${t.department} — Courses: ${t.coursesCount} — Projects graded: ${t.projectsGraded} — Avg grade: ${t.avgGrade ?? 'N/A'}`
        );
        return intro ? `${intro}\n\n${lines.join('\n')}` : lines.join('\n');
    }

    _isGreeting(query) {
        const q = query.trim();
        return (
            /^(hi|hello|hey|hlo|good morning|good evening|good afternoon)(\s+fame)?[!.?]*$/i.test(q) ||
            /^(mingalaba|mingalabar|မင်္ဂလာပါ)(\s+fame)?[!.?]*$/i.test(q)
        );
    }

    isGreeting(query) {
        return this._isGreeting(String(query || ''));
    }

    isQuickQuery(query) {
        return isQuickQuery(query);
    }

    tryFastAnswer(query, context, history = []) {
        const trimmed = String(query || '').trim();
        if (!trimmed) return null;
        if (!isQuickQuery(trimmed) && !this.isGreeting(trimmed)) return null;

        const lang = detectConversationLanguage(trimmed, history);
        let answer = this.localAnswer(trimmed, context, history);
        if (isFallbackLocalAnswer(answer)) return null;

        answer = compactQuickAnswer(answer, trimmed, lang);
        return answer?.trim() || null;
    }

    _isQualityFollowUp(query) {
        return /ကောင်းကျိုး|အားသာချက်|အားနည်းချက်|ဘာကောင်း|ဘယ်လိုကောင်း|benefits?|advantages?|strengths?|good about|quality/i.test(
            String(query || '')
        );
    }

    isQualityFollowUp(query) {
        return this._isQualityFollowUp(query);
    }

    _findReferencedProject(query, context, history = []) {
        const projects = context.projects || [];
        const direct = projects.find(
            (project) =>
                String(query).includes(project.title) ||
                (project.studentName && String(query).includes(project.studentName))
        );
        if (direct) return direct;

        const lastAssistant = [...(history || [])].reverse().find((item) => item.role === 'assistant');
        const text = String(lastAssistant?.content || '');
        return projects
            .map((project) => ({ project, index: text.indexOf(project.title) }))
            .filter((item) => item.index >= 0)
            .sort((a, b) => a.index - b.index)[0]?.project || null;
    }

    _findReferencedStudent(query, context, history = []) {
        const students = context.studentProjectMap || [];
        const q = String(query || '');

        for (const student of students) {
            if (student.name && q.includes(student.name)) return student;
            const parts = (student.name || '').split(/\s+/).filter((part) => part.length > 3);
            if (parts.some((part) => q.includes(part))) return student;
            if (student.studentId && q.includes(student.studentId)) return student;
        }

        const historyText = [...(history || [])]
            .slice(-6)
            .map((item) => String(item.content || ''))
            .join('\n');
        for (const student of students) {
            if (student.name && historyText.includes(student.name)) return student;
            const parts = (student.name || '').split(/\s+/).filter((part) => part.length > 3);
            if (parts.some((part) => historyText.includes(part))) return student;
        }

        if (/သူ|him|her|his|their|that student|this student|the student/i.test(q) && students.length === 1) {
            return students[0];
        }

        return students.length === 1 ? students[0] : null;
    }

    _answerStudentDetail(query, context, history = [], lang = 'en') {
        const q = String(query || '').toLowerCase();
        const wantsEmail = /email|e-mail|@|မေးလ်/.test(q);
        const wantsRoll =
            /student\s*id|roll|reg(istration)?|student\s*number|\bid\b|ခုံ|နံပါတ်/.test(q) ||
            (/[\u1000-\u109F]/.test(q) && /ခုံ|နံပါတ်/.test(q));
        const wantsSection = /section|ခွဲ/.test(q) && !wantsRoll;
        if (!wantsEmail && !wantsRoll && !wantsSection) return null;

        const student = this._findReferencedStudent(query, context, history);
        if (!student) return null;

        if (wantsEmail) {
            return student.email
                ? t(lang, 'studentEmail', student.name, student.email)
                : t(lang, 'studentFieldMissing', student.name, 'email');
        }
        if (wantsRoll) {
            return student.studentId
                ? t(lang, 'studentRoll', student.name, student.studentId)
                : t(lang, 'studentFieldMissing', student.name, lang === 'my' ? 'ခုံနံပါတ်' : 'student ID');
        }
        if (wantsSection) {
            return student.section
                ? t(lang, 'studentSection', student.name, student.section)
                : t(lang, 'studentFieldMissing', student.name, 'section');
        }
        return null;
    }

    _answerQualityFollowUp(query, context, history = [], lang = 'en') {
        const project = this._findReferencedProject(query, context, history);
        if (!project) return null;

        const description = project.description || '';
        const text = `${project.title} ${description}`.toLowerCase();
        let benefits;
        if (/database|sql|schema|library|er model/.test(text)) {
            benefits = [
                'ဒေတာထပ်နေမှုကို လျှော့ချပြီး data consistency ပိုကောင်းစေတယ်',
                'စာအုပ်၊ အသင်းဝင်၊ ငှားရမ်းမှု၊ ဒဏ်ကြေးနဲ့ reservation များကို စနစ်တကျ စီမံနိုင်တယ်',
                'ရှာဖွေမှု၊ report ထုတ်မှုနဲ့ နောက်ပိုင်း feature တိုးချဲ့မှု ပိုလွယ်စေတယ်',
            ];
        } else if (/portfolio|react|frontend|website/.test(text)) {
            benefits = [
                'ကျောင်းသားရဲ့ skill နဲ့ project များကို တစ်နေရာတည်းမှာ ပြသနိုင်တယ်',
                'Responsive UI နဲ့ အသုံးပြုသူအတွေ့အကြုံကို လက်တွေ့လေ့ကျင့်နိုင်တယ်',
                'အလုပ်လျှောက်ခြင်းနဲ့ internship portfolio အဖြစ် အသုံးချနိုင်တယ်',
            ];
        } else if (/navigation|map|beacon|network/.test(text)) {
            benefits = [
                'တည်နေရာနဲ့ လမ်းကြောင်းရှာဖွေမှုကို ပိုမြန်ဆန်စေတယ်',
                'Campus အတွင်း resources များကို စနစ်တကျ ချိတ်ဆက်အသုံးပြုနိုင်တယ်',
                'နေ့စဉ်လုပ်ငန်းစဉ်မှာ အချိန်နဲ့ အမှားများကို လျှော့ချနိုင်တယ်',
            ];
        } else {
            benefits = [
                'လက်တွေ့ပြဿနာတစ်ခုကို software ဖြင့် ဖြေရှင်းထားမှုကို ပြသနိုင်တယ်',
                'စနစ်တကျ စီမံခန့်ခွဲမှုနဲ့ အသုံးပြုရလွယ်ကူမှုကို တိုးတက်စေတယ်',
                'နောက်ပိုင်း feature များ ထပ်တိုးရန် အခြေခံကောင်းတစ်ခု ရရှိစေတယ်',
            ];
        }

        if (lang !== 'my') {
            return `**${project.title}** — ${description || 'No description is stored.'}\n\nBenefits:\n${benefits
                .map((benefit) => `- ${benefit}`)
                .join('\n')}\n\nDatabase status: ${project.status}; grade: ${project.grade ?? 'N/A'}.`;
        }
        return `**${project.title}** — ${description || 'ဒေတာဘေ့စ်တွင် ဖော်ပြချက် မရှိသေးပါ။'}\n\nကောင်းကျိုးများ:\n${benefits
            .map((benefit) => `- ${benefit}`)
            .join('\n')}\n\nဒေတာဘေ့စ်အရ အခြေအနေ: ${project.status}၊ အမှတ်: ${project.grade ?? 'မချရသေး'}။`;
    }

    _isFollowUp(query) {
        return /^(what is that|what's that|what was that|explain that|meaning|what do you mean|huh|why)/i.test(
            query.trim()
        );
    }

    _isLikelyGibberish(query) {
        const q = query.trim();
        if (q.length <= 2) return true;
        if (q.length <= 5 && !/[aeiou]/i.test(q)) return true;
        if (/^(.)\1{2,}$/.test(q)) return true;
        return false;
    }

    _answerTeachers(query, context) {
        const q = query.toLowerCase();
        const wordLimit = /\b(only\s+one|one|single|a)\s+teacher\b/.test(q) ? 1 : null;
        const topN = Math.min(parseInt(q.match(/\b(\d{1,2})\b/)?.[1] || String(wordLimit || 10), 10), 50);
        let teachers = [...(context.teachers || [])];

        if (!teachers.length) {
            return 'No teacher records in your accessible data.';
        }

        const tokens = extractTokens(q);
        if (tokens.length) {
            teachers = teachers.filter((t) => {
                const haystack = [t.name, t.department, t.teacherId, t.email, ...(t.courseCodes || [])]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                return tokens.some((token) => haystack.includes(token));
            });
        }

        if (/top|best|highest|most|rank/.test(q)) {
            const sorted = [...(teachers.length ? teachers : context.topTeachers || [])].sort(
                (a, b) => b.projectsGraded - a.projectsGraded || (b.avgGrade ?? 0) - (a.avgGrade ?? 0)
            );
            return this._formatTeachersList(
                sorted.slice(0, topN),
                `Top ${Math.min(topN, sorted.length)} teacher(s) by projects graded:`
            );
        }

        return this._formatTeachersList(
            (teachers.length ? teachers : context.teachers).slice(0, topN),
            teachers.length ? undefined : `All teachers (${context.teachers.length}):`
        );
    }

    buildContextAnswer(query, context, history = [], lang = 'en') {
        const q = query.toLowerCase().trim();

        if (this._isGreeting(query)) {
            if (context.role === 'teacher') return t(lang, 'greetingTeacher');
            if (context.role === 'student') return t(lang, 'greetingStudent');
            return t(lang, 'greetingAdmin', context.role);
        }

        if (this._isQualityFollowUp(query)) {
            const qualityAnswer = this._answerQualityFollowUp(query, context, history, lang);
            if (qualityAnswer) return qualityAnswer;
        }

        const studentDetail = this._answerStudentDetail(query, context, history, lang);
        if (studentDetail) return studentDetail;

        if (this._isFollowUp(query) && history?.length) {
            const lastAssistant = [...history].reverse().find((h) => h.role === 'assistant');
            if (lastAssistant) return t(lang, 'followUp');
        }

        if (this._isLikelyGibberish(query)) return t(lang, 'gibberish');

        const tokens = extractTokens(q);
        const quick = isQuickQuery(query);
        const explicitLimit = q.match(/\b(\d{1,2})\b/)?.[1];
        const defaultLimit = quick
            ? /\ball\b|give\s+me\s+all|အားလုံး/.test(q)
                ? 20
                : 5
            : /\ball\b|give\s+me\s+all|အားလုံး/.test(q)
              ? 50
              : 10;
        const topN = Math.min(parseInt(explicitLimit || String(defaultLimit), 10), 50);

        const wantsTeachers = /\bteacher|teachers|professor|instructor|faculty|lecturer\b/.test(q);
        const wantsStudents = /\bstudent|students|learner|learners|enrolled\b|ကျောင်းသား/.test(q);
        const wantsCourses = /\bcourse|courses|subject|subjects|class|classes\b/.test(q);
        const wantsProjects = /\bproject|projects|submission|submissions\b/.test(q);
        const wantsAssignments = /\bassignment|assignments|homework|task|due date|deadline\b/.test(q);

        if (context.role !== 'admin' && wantsTeachers) {
            return t(lang, 'noTeachersAccess');
        }

        if (wantsTeachers) {
            return this._answerTeachers(query, context);
        }

        if (wantsAssignments) {
            const assignments = context.assignments || [];
            if (!assignments.length) {
                return t(lang, 'noAssignments', context.role);
            }
            let filtered = [...assignments];
            if (tokens.length) {
                filtered = filtered.filter((a) => {
                    const hay = [a.title, a.courseCode, a.courseName, a.description].join(' ').toLowerCase();
                    return tokens.some((t) => hay.includes(t));
                });
            }
            if (/due|deadline|upcoming|open/.test(q)) {
                const now = Date.now();
                filtered = filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                return filtered
                    .slice(0, topN)
                    .map(
                        (a) =>
                            `• **${a.title}** (${a.courseCode}) — due ${a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'N/A'} — ${a.status}${new Date(a.dueDate) < now ? ' (past due)' : ''}`
                    )
                    .join('\n');
            }
            return filtered
                .slice(0, topN)
                .map(
                    (a) =>
                        `• **${a.title}** — ${a.courseCode} — due ${a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'N/A'} — ${a.status} — ${a.totalSubmissions} submission(s)`
                )
                .join('\n');
        }

        let projects = [...context.projects];

        const statusMatch = q.match(/\b(pending|approved|rejected|revision|graded|submitted)\b/);
        if (statusMatch) {
            projects = projects.filter((p) => p.status === statusMatch[1]);
        }

        const deptMatch = q.match(/\b(cs|it|ct|ec|computer|information|electronics)\b/i);
        if (deptMatch) {
            const dept = deptMatch[1].toUpperCase().slice(0, 2);
            projects = projects.filter((p) => (p.department || '').toUpperCase().includes(dept));
        }

        const yearMatch = q.match(/\b(?:year|y)\s*(\d)\b/i) || q.match(/\b(\d)(?:st|nd|rd|th)\s*year\b/i);
        if (yearMatch) {
            projects = projects.filter((p) => String(p.year) === yearMatch[1]);
        }

        if (/how many|count|total|number of|ဘယ်လောက်|ရှိ|几/.test(q) || /[\u1000-\u109F]/.test(q) && /ရှိ|ဘယ်|နှုန်း|အရေအတွက်/.test(q)) {
            if (wantsStudents) {
                return t(lang, 'countStudents', context.stats.totalStudents, context.role);
            }
            if (wantsCourses) {
                return t(lang, 'countCourses', context.courses?.length || 0, context.role);
            }
            const label = statusMatch ? ` ${statusMatch[1]}` : deptMatch ? ` in ${deptMatch[1].toUpperCase()}` : '';
            const labelMy =
                lang === 'my'
                    ? statusMatch
                        ? ` (${statusMatch[1]})`
                        : deptMatch
                          ? ` (${deptMatch[1].toUpperCase()} department)`
                          : ''
                    : label;
            return t(lang, 'countProjects', projects.length, labelMy, context.role);
        }

        if (/top|best|highest|lowest|worst|rank/.test(q) && !wantsStudents && !wantsCourses) {
            const sorted = [...projects].sort((a, b) => (b.grade ?? -1) - (a.grade ?? -1));
            const top = sorted.slice(0, topN);
            if (!top.length) return t(lang, 'noProjects', context.role);
            return top
                .map(
                    (p, i) =>
                        `${i + 1}. **${p.title}** — ${p.studentName} (${p.department}) — Grade: ${p.grade ?? 'N/A'} — ${p.status}`
                )
                .join('\n');
        }

        if (wantsStudents) {
            let students = [...context.studentProjectMap];
            if (tokens.length) {
                students = students
                    .map((s) => ({ s, score: scoreStudent(s, tokens) }))
                    .filter(({ score }) => score > 0)
                    .sort((a, b) => b.score - a.score)
                    .map(({ s }) => s);
            }
            if (!students.length && tokens.length) {
                return t(lang, 'noStudents', query, context.role);
            }
            if (!students.length) {
                students = context.studentProjectMap.slice(0, topN);
            }
            return students
                .slice(0, topN)
                .map((s) => formatStudentLine(s, lang))
                .join('\n');
        }

        if (wantsCourses) {
            const courses = (context.courses || []).filter((c) =>
                tokens.length
                    ? tokens.some(
                          (t) =>
                              c.courseCode?.toLowerCase().includes(t) ||
                              c.courseName?.toLowerCase().includes(t) ||
                              c.department?.toLowerCase().includes(t) ||
                              c.teacherName?.toLowerCase().includes(t)
                      )
                    : true
            );
            if (!courses.length) return t(lang, 'noCourses', context.role);
            return courses
                .slice(0, topN)
                .map((c) => `• **${c.courseCode}** — ${c.courseName} (Teacher: ${c.teacherName}, ${c.department})`)
                .join('\n');
        }

        if (tokens.length) {
            const scored = projects
                .map((p) => ({ p, score: scoreProject(p, tokens) }))
                .filter(({ score }) => score > 0)
                .sort((a, b) => b.score - a.score);
            if (scored.length) {
                return scored
                    .slice(0, topN)
                    .map(({ p }) => `• **${p.title}** — ${p.studentName} — ${p.status} — Grade: ${p.grade ?? 'N/A'}`)
                    .join('\n');
            }
        }

        if (wantsProjects) {
            return projects
                .slice(0, topN)
                .map((p) => `• **${p.title}** — ${p.studentName} — ${p.status} — Grade: ${p.grade ?? 'N/A'}`)
                .join('\n');
        }

        return t(lang, 'noMatch', query, context.role, context.stats);
    }

    localAnswer(query, context, history = []) {
        const lang = detectConversationLanguage(query, history);
        const q = query.toLowerCase().trim();

        if (this._isQualityFollowUp(query)) {
            const qualityAnswer = this._answerQualityFollowUp(query, context, history, lang);
            if (qualityAnswer) return qualityAnswer;
        }

        const studentDetail = this._answerStudentDetail(query, context, history, lang);
        if (studentDetail) return studentDetail;

        const namedStudent = this._findReferencedStudent(query, context, history);
        if (
            namedStudent &&
            !/project|assignment|course|grade|email|ခုံ|section|pending|stats|count|how many|ဘယ်လောက်/.test(q)
        ) {
            const nameParts = (namedStudent.name || '').toLowerCase().split(/\s+/).filter((part) => part.length > 2);
            if (nameParts.some((part) => q.includes(part))) {
                return formatStudentLine(namedStudent, lang);
            }
        }

        if (/top\s*\d*\s*(?:grading|graded|grade)?\s*project|best\s*project|highest\s*grade/.test(q) && !/\bteacher/.test(q)) {
            const n = parseInt(q.match(/top\s*(\d+)/)?.[1] || '3', 10);
            const top = context.topProjects.slice(0, n);
            if (!top.length) {
                return t(lang, 'noProjectsAccessible');
            }
            const lines = top.map(
                (p, i) =>
                    `${i + 1}. **${p.title}** — ${p.studentName} (${p.department}) — Grade: ${p.grade ?? 'N/A'} — Status: ${p.status}`
            );
            return lines.join('\n');
        }

        const wantsCount =
            /how many|count|total|number of|ဘယ်လောက်|နှုန်း|အရေအတွက်|ဘယ်နှစ်/.test(q) ||
            (/[\u1000-\u109F]/.test(q) && /ဘယ်|နှုန်း|အရေအတွက်/.test(q));

        if (wantsCount && /student|students|ကျောင်းသား/.test(q)) {
            return t(lang, 'countStudents', context.stats.totalStudents, context.role);
        }
        if (wantsCount && /course|courses|subject|သင်တန်း/.test(q)) {
            return t(lang, 'countCourses', context.courses?.length || 0, context.role);
        }
        if (wantsCount && /project|projects|submission/.test(q)) {
            return t(lang, 'countProjects', context.stats.totalProjects, '', context.role);
        }

        if (
            /student.*list|list.*student|students and|student.*project|(?:ကျောင်းသား|student).*(?:ပေးပါ|ပြ|list|show|give)|(?:ပေးပါ|list|show).*(?:ကျောင်းသား|student)/.test(
                q
            )
        ) {
            if (!context.studentProjectMap.length) {
                return t(lang, 'noStudentsAccessible');
            }
            return context.studentProjectMap
                .slice(0, 20)
                .map((s) => formatStudentLine(s, lang))
                .join('\n');
        }

        if (/pending|awaiting review|စောင့်|pending/.test(q)) {
            const pending = context.projects.filter((p) => p.status === 'pending');
            return pending.length
                ? `${t(lang, 'pendingHeader', pending.length)}\n${pending.slice(0, 10).map((p) => `• ${p.title} — ${p.studentName}`).join('\n')}`
                : t(lang, 'noPending');
        }

        if (/how many|total|count|statistics|stats|စာရင်း|ရှိ/.test(q)) {
            return (
                `${t(lang, 'statsHeader', context.role)}\n` +
                `• Projects: ${context.stats.totalProjects}\n` +
                `• Students: ${context.stats.totalStudents}\n` +
                `• Teachers: ${context.stats.totalTeachers || 0}\n` +
                `• Pending: ${context.stats.pendingProjects}\n` +
                `• Approved: ${context.stats.approvedProjects}\n` +
                `• Graded: ${context.stats.gradedProjects}`
            );
        }

        if (/my project|my grade|my submission|my assignment/.test(q) && context.role === 'student') {
            if (/assignment|due|deadline/.test(q) && context.assignments?.length) {
                return context.assignments
                    .map(
                        (a) =>
                            `• **${a.title}** (${a.courseCode}) — due ${a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'N/A'}`
                    )
                    .join('\n');
            }
            if (context.submissions?.length && /submission|submitted|grade/.test(q)) {
                return context.submissions
                    .map(
                        (s) =>
                            `• **${s.assignmentTitle}** — Grade: ${s.grade ?? 'Not graded'} — ${s.isLate ? 'Late' : 'On time'}`
                    )
                    .join('\n');
            }
            if (!context.projects.length) {
                return t(lang, 'noMyProjects');
            }
            return context.projects
                .map(
                    (p) =>
                        `• **${p.title}** — Status: ${p.status} — Grade: ${p.grade ?? t(lang, 'gradeNotYet')}`
                )
                .join('\n');
        }

        return this.buildContextAnswer(query, context, history, lang);
    }
}

module.exports = new RagContextService();
