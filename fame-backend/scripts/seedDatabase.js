/**
 * Reset fame_academic_repository and seed meaningful demo data.
 * Usage: node scripts/seedDatabase.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const User = require('../src/models/User.model');
const Department = require('../src/models/Department.model');
const Course = require('../src/models/Course.model');
const Assignment = require('../src/models/Assignment.model');
const GradingCriteria = require('../src/models/GradingCriteria.model');
const Project = require('../src/models/Project.model');
const ProjectVersion = require('../src/models/ProjectVersion.model');
const Feedback = require('../src/models/Feedback.model');
const Submission = require('../src/models/Submission.model');
const Notification = require('../src/models/Notification.model');
const ChatConversation = require('../src/models/ChatConversation.model');
const ChatMessage = require('../src/models/ChatMessage.model');
const RagChatSession = require('../src/models/RagChatSession.model');
const AuditLog = require('../src/models/AuditLog.model');
const SearchHistory = require('../src/models/SearchHistory.model');

const SEED_PASSWORD = process.env.SEED_PASSWORD || 'password';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@fame.edu';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password';

const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
};

const daysFromNow = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
};

const computeWeightedGrade = (criterionScores) =>
    Math.round(
        criterionScores.reduce((sum, c) => sum + (c.score * c.weight) / 100, 0)
    );

const CRITERIA_TEMPLATES = {
    web: [
        { name: 'Code Quality', description: 'Clean structure, naming, and maintainability', weight: 35 },
        { name: 'UI/UX Design', description: 'Responsive layout and user experience', weight: 25 },
        { name: 'Documentation', description: 'README, comments, and setup guide', weight: 20 },
        { name: 'Functionality', description: 'Features work as specified', weight: 20 },
    ],
    database: [
        { name: 'Schema Design', description: 'Normalization and relationships', weight: 40 },
        { name: 'SQL Queries', description: 'Correctness and efficiency', weight: 30 },
        { name: 'Documentation', description: 'ER diagram and report clarity', weight: 20 },
        { name: 'Presentation', description: 'Professional report quality', weight: 10 },
    ],
    capstone: [
        { name: 'System Architecture', description: 'Design patterns and scalability', weight: 30 },
        { name: 'Implementation', description: 'Working features and code quality', weight: 35 },
        { name: 'Testing', description: 'Unit/integration test coverage', weight: 15 },
        { name: 'Documentation & Demo', description: 'SRS, manual, and presentation', weight: 20 },
    ],
};

function buildCriterionScores(template, scores) {
    return template.map((c, i) => ({
        name: c.name,
        weight: c.weight,
        score: scores[i],
        maxScore: 100,
    }));
}

async function clearDatabase() {
    console.log('🗑️  Dropping database...');
    await mongoose.connection.dropDatabase();
    console.log('✅ Database cleared.\n');
}

async function seed() {
    const academicYear = '2025-2026';

    // ── Departments ──────────────────────────────────────────────
    const departments = await Department.insertMany([
        { name: 'CS', fullName: 'Computer Science', description: 'Software development and computing theory', establishedYear: 2010 },
        { name: 'IT', fullName: 'Information Technology', description: 'Applied IT systems and infrastructure', establishedYear: 2012 },
        { name: 'CT', fullName: 'Computer Technology', description: 'Hardware, networking, and embedded systems', establishedYear: 2014 },
        { name: 'EC', fullName: 'Electronics & Communication', description: 'Electronics and communication engineering', establishedYear: 2011 },
    ]);
    console.log(`✅ ${departments.length} departments`);

    // ── Users ────────────────────────────────────────────────────
    const admin = await User.create({
        name: 'FAME Administrator',
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin',
    });

    const teachers = await User.create([
        { name: 'Dr. Kyaw Min Htun', email: 'teacher@fame.edu', password: SEED_PASSWORD, role: 'teacher', teacherId: 'TCH2024001', department: 'CS' },
        { name: 'Ms. Hnin Wai Lin', email: 'hnin.lin@fame.edu', password: SEED_PASSWORD, role: 'teacher', teacherId: 'TCH2024002', department: 'IT' },
        { name: 'Prof. Aung Ko', email: 'aung.ko@fame.edu', password: SEED_PASSWORD, role: 'teacher', teacherId: 'TCH2024003', department: 'CS' },
    ]);

    const [tKyaw, tHnin, tAung] = teachers;

    const students = await User.create([
        { name: 'Min Khant Zaw', email: 'student@student.fame.edu', password: SEED_PASSWORD, role: 'student', studentId: 'STU2024001', department: 'CS', year: 3, section: 'A' },
        { name: 'Thiri Aung', email: 'thiri@student.fame.edu', password: SEED_PASSWORD, role: 'student', studentId: 'STU2024002', department: 'CS', year: 3, section: 'A' },
        { name: 'Htet Paing Soe', email: 'htetpaing@student.fame.edu', password: SEED_PASSWORD, role: 'student', studentId: 'STU2024003', department: 'CS', year: 3, section: 'B' },
        { name: 'Su Mon Lwin', email: 'sumon@student.fame.edu', password: SEED_PASSWORD, role: 'student', studentId: 'STU2024004', department: 'CS', year: 3, section: 'B' },
        { name: 'Zwe Htet', email: 'zwehtet@student.fame.edu', password: SEED_PASSWORD, role: 'student', studentId: 'STU2024005', department: 'CS', year: 4, section: 'A' },
        { name: 'May Thin', email: 'maythin@student.fame.edu', password: SEED_PASSWORD, role: 'student', studentId: 'STU2024006', department: 'CS', year: 4, section: 'A' },
        { name: 'Kaung Myat', email: 'kaungmyat@student.fame.edu', password: SEED_PASSWORD, role: 'student', studentId: 'STU2024007', department: 'IT', year: 2, section: 'A' },
        { name: 'Nyein Chan', email: 'nyeinchan@student.fame.edu', password: SEED_PASSWORD, role: 'student', studentId: 'STU2024008', department: 'IT', year: 2, section: 'A' },
        { name: 'Aye Nandar', email: 'ayenandar@student.fame.edu', password: SEED_PASSWORD, role: 'student', studentId: 'STU2024009', department: 'IT', year: 2, section: 'B' },
        { name: 'Pyae Sone', email: 'pyaesone@student.fame.edu', password: SEED_PASSWORD, role: 'student', studentId: 'STU2024010', department: 'CT', year: 2, section: 'A' },
    ]);

    const [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10] = students;

    await Department.updateOne({ name: 'CS' }, { headOfDepartment: tKyaw._id });
    await Department.updateOne({ name: 'IT' }, { headOfDepartment: tHnin._id });

    console.log(`✅ 1 admin, ${teachers.length} teachers, ${students.length} students`);

    // ── Courses ──────────────────────────────────────────────────
    const courses = await Course.insertMany([
        {
            courseCode: 'CS301',
            courseName: 'Web Application Development',
            description: 'Build modern web apps with React, REST APIs, and deployment workflows.',
            department: 'CS', year: 3, semester: '1st', section: 'A', credits: 3,
            teacherId: tKyaw._id, academicYear,
        },
        {
            courseCode: 'IT210',
            courseName: 'Database Management Systems',
            description: 'Relational modeling, SQL, normalization, and database administration.',
            department: 'IT', year: 2, semester: '1st', section: 'A', credits: 3,
            teacherId: tHnin._id, academicYear,
        },
        {
            courseCode: 'CS401',
            courseName: 'Software Engineering Capstone',
            description: 'Team-based capstone: requirements, design, implementation, and defense.',
            department: 'CS', year: 4, semester: '2nd', section: 'A', credits: 6,
            teacherId: tAung._id, academicYear,
        },
        {
            courseCode: 'CT205',
            courseName: 'Computer Networks',
            description: 'TCP/IP, routing, switching, and network security fundamentals.',
            department: 'CT', year: 2, semester: '1st', section: 'A', credits: 3,
            teacherId: tKyaw._id, academicYear,
        },
    ]);

    const [cWeb, cDb, cCap, cNet] = courses;

    // Enroll students in courses
    const enroll = async (student, courseIds) => {
        await User.updateOne({ _id: student._id }, { $set: { assignedCourses: courseIds } });
    };

    await enroll(s1, [cWeb._id, cCap._id]);
    await enroll(s2, [cWeb._id, cCap._id]);
    await enroll(s3, [cWeb._id]);
    await enroll(s4, [cWeb._id]);
    await enroll(s5, [cCap._id]);
    await enroll(s6, [cCap._id]);
    await enroll(s7, [cDb._id]);
    await enroll(s8, [cDb._id]);
    await enroll(s9, [cDb._id]);
    await enroll(s10, [cNet._id]);

    console.log(`✅ ${courses.length} courses with student enrollments`);

    // ── Assignments ──────────────────────────────────────────────
    const assignments = await Assignment.insertMany([
        {
            courseId: cWeb._id,
            title: 'Personal Portfolio Website',
            description: 'Create a responsive portfolio using React. Include About, Projects, and Contact sections with a working contact form.',
            openDate: daysAgo(30), dueDate: daysFromNow(14), status: 'published',
            requiredFiles: ['code', 'srs', 'design'],
        },
        {
            courseId: cWeb._id,
            title: 'React E-Commerce Frontend',
            description: 'Build a product catalog with cart, filters, and checkout UI. Use component-based architecture and state management.',
            openDate: daysAgo(10), dueDate: daysFromNow(25), status: 'published',
            requiredFiles: ['code', 'srs', 'manual'],
        },
        {
            courseId: cDb._id,
            title: 'Library Management ER Design',
            description: 'Design a normalized ER diagram for a university library system. Submit ER diagram and data dictionary.',
            openDate: daysAgo(25), dueDate: daysFromNow(10), status: 'published',
            requiredFiles: ['design', 'manual'],
        },
        {
            courseId: cDb._id,
            title: 'SQL Query Optimization Lab',
            description: 'Write and optimize SQL queries for inventory tracking. Include execution plan analysis.',
            openDate: daysAgo(5), dueDate: daysFromNow(20), status: 'published',
            requiredFiles: ['code', 'manual'],
        },
        {
            courseId: cCap._id,
            title: 'Capstone Project Proposal',
            description: 'Submit SRS, system architecture, and project timeline for your capstone system.',
            openDate: daysAgo(45), dueDate: daysAgo(5), status: 'published',
            requiredFiles: ['srs', 'design', 'presentation'],
        },
        {
            courseId: cCap._id,
            title: 'Final System Delivery',
            description: 'Deliver complete working system with tests, user manual, and demo video.',
            openDate: daysAgo(3), dueDate: daysFromNow(30), status: 'published',
            requiredFiles: ['code', 'srs', 'manual', 'video'],
        },
        {
            courseId: cNet._id,
            title: 'Network Topology Design',
            description: 'Design a campus network with VLANs, subnetting, and firewall rules. Submit topology diagram and config notes.',
            openDate: daysAgo(15), dueDate: daysFromNow(18), status: 'published',
            requiredFiles: ['design', 'manual'],
        },
    ]);

    const [aPortfolio, aEcommerce, aLibEr, aSqlLab, aCapProposal, aCapFinal, aNetTopo] = assignments;

    console.log(`✅ ${assignments.length} assignments`);

    // ── Grading Criteria ───────────────────────────────────────────
    const criteriaDocs = await GradingCriteria.insertMany([
        { assignmentId: aPortfolio._id, criteria: CRITERIA_TEMPLATES.web, totalWeight: 100, passingGrade: 60, createdBy: tKyaw._id },
        { assignmentId: aEcommerce._id, criteria: CRITERIA_TEMPLATES.web, totalWeight: 100, passingGrade: 60, createdBy: tKyaw._id },
        { assignmentId: aLibEr._id, criteria: CRITERIA_TEMPLATES.database, totalWeight: 100, passingGrade: 60, createdBy: tHnin._id },
        { assignmentId: aSqlLab._id, criteria: CRITERIA_TEMPLATES.database, totalWeight: 100, passingGrade: 60, createdBy: tHnin._id },
        { assignmentId: aCapProposal._id, criteria: CRITERIA_TEMPLATES.capstone, totalWeight: 100, passingGrade: 60, createdBy: tAung._id },
        { assignmentId: aCapFinal._id, criteria: CRITERIA_TEMPLATES.capstone, totalWeight: 100, passingGrade: 60, createdBy: tAung._id },
        { assignmentId: aNetTopo._id, criteria: CRITERIA_TEMPLATES.database, totalWeight: 100, passingGrade: 60, createdBy: tKyaw._id },
    ]);

    console.log(`✅ ${criteriaDocs.length} grading criteria sets`);

    // ── Projects, Versions, Feedback ───────────────────────────────
    const projectDefs = [
        {
            student: s1, course: cWeb, assignment: aPortfolio, teacher: tKyaw,
            title: 'Min Khant Portfolio — React SPA',
            description: 'Personal portfolio with dark mode, project gallery, and contact form integrated with EmailJS.',
            status: 'graded', scores: [88, 85, 80, 90],
            feedback: 'Excellent component structure. Consider adding unit tests for form validation.',
            submittedDaysAgo: 12,
        },
        {
            student: s2, course: cWeb, assignment: aPortfolio, teacher: tKyaw,
            title: 'Thiri Aung Developer Portfolio',
            description: 'Portfolio showcasing internship projects and skills timeline.',
            status: 'graded', scores: [75, 70, 72, 78],
            feedback: 'Good visual design. Improve mobile navigation and add alt text for accessibility.',
            submittedDaysAgo: 14,
        },
        {
            student: s3, course: cWeb, assignment: aPortfolio, teacher: tKyaw,
            title: 'Htet Paing Portfolio Site',
            description: 'Bootstrap-based portfolio with animated hero section.',
            status: 'revision', scores: [60, 65, 55, 58],
            feedback: 'Resubmit with responsive fixes on tablet view and complete SRS section 3.',
            revision: true, submittedDaysAgo: 10,
        },
        {
            student: s4, course: cWeb, assignment: aPortfolio, teacher: tKyaw,
            title: 'Su Mon Lwin — Creative Portfolio',
            description: 'Design-focused portfolio with case studies for UI/UX work.',
            status: 'pending', submittedDaysAgo: 3,
        },
        {
            student: s1, course: cWeb, assignment: aEcommerce, teacher: tKyaw,
            title: 'ShopEase — React Storefront',
            description: 'E-commerce UI with product filters, wishlist, and mock checkout flow.',
            status: 'pending', submittedDaysAgo: 2,
        },
        {
            student: s7, course: cDb, assignment: aLibEr, teacher: tHnin,
            title: 'University Library ER Model',
            description: '3NF schema covering books, members, loans, fines, and reservations.',
            status: 'graded', scores: [92, 88, 90, 85],
            feedback: 'Outstanding normalization. Minor suggestion: document cascade rules for deletions.',
            submittedDaysAgo: 8,
        },
        {
            student: s8, course: cDb, assignment: aLibEr, teacher: tHnin,
            title: 'Public Library Database Design',
            description: 'ER diagram with 12 entities and relationship cardinalities documented.',
            status: 'graded', scores: [78, 80, 75, 70],
            feedback: 'Solid work. Tighten attribute definitions in the data dictionary.',
            submittedDaysAgo: 9,
        },
        {
            student: s9, course: cDb, assignment: aSqlLab, teacher: tHnin,
            title: 'Inventory SQL Optimization',
            description: 'Indexed queries for stock alerts, reorder points, and supplier reports.',
            status: 'pending', submittedDaysAgo: 1,
        },
        {
            student: s5, course: cCap, assignment: aCapProposal, teacher: tAung,
            title: 'Smart Campus Navigation System',
            description: 'Mobile app for indoor navigation using BLE beacons and floor maps.',
            status: 'graded', scores: [85, 82, 78, 88],
            feedback: 'Strong proposal. Include risk mitigation for hardware procurement delays.',
            submittedDaysAgo: 20,
        },
        {
            student: s6, course: cCap, assignment: aCapProposal, teacher: tAung,
            title: 'AI-Powered Attendance Tracker',
            description: 'Face recognition attendance with admin dashboard and export reports.',
            status: 'graded', scores: [80, 85, 70, 82],
            feedback: 'Good scope. Address privacy compliance in the SRS security section.',
            submittedDaysAgo: 18,
        },
        {
            student: s10, course: cNet, assignment: aNetTopo, teacher: tKyaw,
            title: 'FAME Campus Network Design',
            description: 'Three-building topology with core/distribution/access layers and VLAN segmentation.',
            status: 'pending', submittedDaysAgo: 4,
        },
    ];

    const assignmentGradeMap = {};
    let projectCount = 0;
    let feedbackCount = 0;

    for (const def of projectDefs) {
        const { student, course, assignment, teacher, title, description, status, submittedDaysAgo } = def;

        const project = await Project.create({
            title,
            description,
            studentId: student._id,
            studentName: student.name,
            assignmentId: assignment._id,
            courseId: course._id,
            department: student.department,
            year: student.year,
            section: student.section,
            semester: course.semester,
            status,
            submittedAt: daysAgo(submittedDaysAgo),
            currentVersion: 1,
            isLatest: true,
        });

        const version = await ProjectVersion.create({
            projectId: project._id,
            versionNumber: 1,
            codeZipUrl: `/uploads/seed/${student.studentId}-${assignment._id}-code.zip`,
            srsPdfUrl: `/uploads/seed/${student.studentId}-${assignment._id}-srs.pdf`,
            designPdfUrl: `/uploads/seed/${student.studentId}-${assignment._id}-design.pdf`,
            codeFileSize: 2_500_000,
            pdfFileSize: 800_000,
            totalFileSize: 3_300_000,
            codeHealthScore: status === 'graded' ? 82 : 70,
            dependencies: [
                { name: 'react', version: '18.2.0', isDeprecated: false, latestVersion: '19.0.0', severity: 'low' },
                { name: 'express', version: '4.18.2', isDeprecated: false, latestVersion: '5.0.0', severity: 'medium' },
            ],
            submittedBy: student._id,
            submittedAt: daysAgo(submittedDaysAgo),
            isLatest: true,
        });

        await Submission.create({
            assignmentId: assignment._id,
            studentId: student._id,
            projectId: project._id,
            submittedAt: daysAgo(submittedDaysAgo),
            isLate: false,
            files: {
                codeZipUrl: version.codeZipUrl,
                srsPdfUrl: version.srsPdfUrl,
                designPdfUrl: version.designPdfUrl,
            },
            status: status === 'graded' ? 'graded' : status === 'revision' ? 'revision' : 'submitted',
        });

        if (def.scores) {
            const template =
                assignment._id.equals(aLibEr._id) || assignment._id.equals(aSqlLab._id)
                    ? CRITERIA_TEMPLATES.database
                    : assignment._id.equals(aCapProposal._id) || assignment._id.equals(aCapFinal._id)
                      ? CRITERIA_TEMPLATES.capstone
                      : CRITERIA_TEMPLATES.web;

            const criterionScores = buildCriterionScores(template, def.scores);
            const grade = computeWeightedGrade(criterionScores);

            await Feedback.create({
                projectId: project._id,
                versionId: version._id,
                teacherId: teacher._id,
                teacherName: teacher.name,
                feedbackText: def.feedback,
                grade,
                criterionScores,
                codeQualityScore: def.scores[0],
                documentationScore: def.scores[2] ?? def.scores[1],
                isFinal: !def.revision,
                isPublished: !def.revision,
                publishedAt: def.revision ? null : daysAgo(submittedDaysAgo - 2),
                revisionRequested: !!def.revision,
                revisionNotes: def.revision ? def.feedback : null,
            });

            if (!def.revision) {
                await Project.updateOne(
                    { _id: project._id },
                    {
                        grade,
                        teacherFeedback: def.feedback,
                        gradedBy: teacher._id,
                        gradedAt: daysAgo(submittedDaysAgo - 2),
                        status: 'graded',
                    }
                );

                const key = assignment._id.toString();
                if (!assignmentGradeMap[key]) assignmentGradeMap[key] = [];
                assignmentGradeMap[key].push(grade);
            }

            feedbackCount++;
        }

        projectCount++;
    }

    for (const [assignmentId, grades] of Object.entries(assignmentGradeMap)) {
        const avg = Math.round(grades.reduce((a, b) => a + b, 0) / grades.length);
        await Assignment.updateOne(
            { _id: assignmentId },
            { totalSubmissions: grades.length, avgGrade: avg }
        );
    }

    // Count all submissions per assignment
    for (const a of assignments) {
        const count = await Project.countDocuments({ assignmentId: a._id });
        if (count > 0) {
            await Assignment.updateOne({ _id: a._id }, { totalSubmissions: count });
        }
    }

    console.log(`✅ ${projectCount} projects, ${feedbackCount} feedback records`);

    // ── Notifications ────────────────────────────────────────────
    await Notification.insertMany([
        {
            recipientId: s1._id, senderId: tKyaw._id, senderName: tKyaw.name,
            type: 'grade', title: 'Portfolio assignment graded',
            message: 'Your Personal Portfolio Website has been graded. Score: 86/100. View feedback in the Feedback page.',
            read: true, readAt: daysAgo(1),
            metadata: { projectTitle: 'Min Khant Portfolio — React SPA', grade: 86 },
        },
        {
            recipientId: s3._id, senderId: tKyaw._id, senderName: tKyaw.name,
            type: 'revision', title: 'Revision requested',
            message: 'Please resubmit your portfolio with responsive fixes on tablet view.',
            read: false,
            metadata: { assignmentTitle: 'Personal Portfolio Website' },
        },
        {
            recipientId: s7._id, senderId: tHnin._id, senderName: tHnin.name,
            type: 'grade', title: 'Library ER assignment graded',
            message: 'Great work on your ER design! You scored 89/100.',
            read: true, readAt: daysAgo(2),
        },
        {
            recipientId: s4._id, type: 'system', title: 'Assignment deadline reminder',
            message: 'Personal Portfolio Website is due in 14 days. Make sure to upload code and SRS.',
            read: false,
        },
        {
            recipientId: tKyaw._id, type: 'submission', title: 'New submission',
            message: 'Su Mon Lwin submitted Creative Portfolio for review.',
            read: false,
            metadata: { studentName: 'Su Mon Lwin' },
        },
    ]);

    console.log('✅ 5 notifications');

    // ── Chat ───────────────────────────────────────────────────────
    const conv = await ChatConversation.create({
        type: 'direct',
        participants: [
            { userId: s1._id, userName: s1.name, userRole: 'student', userEmail: s1.email },
            { userId: tKyaw._id, userName: tKyaw.name, userRole: 'teacher', userEmail: tKyaw.email },
        ],
        participantIds: [s1._id, tKyaw._id],
        lastMessage: { text: 'Thank you for the feedback, sir!', senderId: s1._id, type: 'text', createdAt: daysAgo(1) },
        lastMessageAt: daysAgo(1),
    });

    await ChatMessage.insertMany([
        {
            conversationId: conv._id, senderId: s1._id, senderName: s1.name,
            type: 'text', content: 'Hello Dr. Kyaw, I have a question about the e-commerce assignment requirements.',
            createdAt: daysAgo(2),
        },
        {
            conversationId: conv._id, senderId: tKyaw._id, senderName: tKyaw.name,
            type: 'text', content: 'Hi Min Khant — make sure your cart state persists during navigation. Check the rubric for UI/UX weight.',
            createdAt: daysAgo(2),
            readBy: [{ userId: s1._id, readAt: daysAgo(2) }],
        },
        {
            conversationId: conv._id, senderId: s1._id, senderName: s1.name,
            type: 'text', content: 'Thank you for the feedback, sir!',
            createdAt: daysAgo(1),
            readBy: [{ userId: tKyaw._id, readAt: daysAgo(1) }],
        },
    ]);

    console.log('✅ 1 chat conversation with 3 messages');

    // ── RAG Chat Session ─────────────────────────────────────────
    await RagChatSession.create({
        userId: s1._id,
        userName: s1.name,
        userEmail: s1.email,
        userRole: 'student',
        title: 'React portfolio tips',
        messages: [
            { role: 'user', content: 'What should I include in my portfolio SRS document?' },
            { role: 'assistant', content: 'Include functional requirements, tech stack justification, page wireframes, and non-functional requirements like performance and accessibility targets.', source: 'seed' },
        ],
    });

    console.log('✅ 1 RAG chat session');

    // ── Audit Logs ─────────────────────────────────────────────────
    await AuditLog.insertMany([
        { userId: admin._id, userEmail: admin.email, userRole: 'admin', action: 'SEED_DATABASE', entityType: 'System', details: 'Database reset and seeded with demo data', status: 'success' },
        { userId: tKyaw._id, userEmail: tKyaw.email, userRole: 'teacher', action: 'GRADE_PROJECT', entityType: 'Project', details: 'Graded portfolio submission for Min Khant Zaw', status: 'success', createdAt: daysAgo(2) },
        { userId: s1._id, userEmail: s1.email, userRole: 'student', action: 'SUBMIT_PROJECT', entityType: 'Project', details: 'Submitted ShopEase e-commerce frontend', status: 'success', createdAt: daysAgo(2) },
    ]);

    console.log('✅ 3 audit log entries');

    // ── Search History ─────────────────────────────────────────────
    await SearchHistory.insertMany([
        { userId: s1._id, userRole: 'student', queryText: 'React portfolio examples', queryType: 'basic', resultsCount: 5 },
        { userId: tKyaw._id, userRole: 'teacher', queryText: 'pending submissions CS301', queryType: 'basic', resultsCount: 2 },
        { userId: admin._id, userRole: 'admin', queryText: 'active students CS department', queryType: 'basic', resultsCount: 6 },
    ]);

    console.log('✅ 3 search history entries');

    return { admin, teachers, students, courses, assignments };
}

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI is not set in .env');
        process.exit(1);
    }

    console.log('\n🌱 FAME Database Reset & Seed');
    console.log(`   Target: ${uri}\n`);

    try {
        await mongoose.connect(uri);
        await clearDatabase();
        await seed();

        console.log('\n' + '═'.repeat(55));
        console.log('🎉 Seed complete! Login credentials:\n');
        console.log(`   Admin:   ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
        console.log(`   Teacher: kyaw.htun@fame.edu / ${SEED_PASSWORD}`);
        console.log(`   Teacher: hnin.lin@fame.edu / ${SEED_PASSWORD}`);
        console.log(`   Student: minkhant@student.fame.edu / ${SEED_PASSWORD}`);
        console.log(`   Student: kaungmyat@student.fame.edu / ${SEED_PASSWORD}`);
        console.log('═'.repeat(55) + '\n');
    } catch (err) {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

main();
