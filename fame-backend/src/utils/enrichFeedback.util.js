const { enrichProjectRecord } = require('./enrichProject.util');

const enrichFeedbackRecord = async (feedbackDoc) => {
    const fb = feedbackDoc?.toObject ? feedbackDoc.toObject() : { ...feedbackDoc };
    const teacher = fb.teacherId;
    let project = fb.projectId;

    fb.teacherName = fb.teacherName || teacher?.name || 'Unknown Teacher';
    fb.teacherEmail = teacher?.email || null;
    fb.feedbackText = fb.feedbackText || 'No feedback provided.';
    fb.grade = fb.grade ?? null;

    if (project && typeof project === 'object' && project._id) {
        project = await enrichProjectRecord(project);
        fb.projectId = project;
        fb.projectTitle = project.title || 'Untitled Project';
        fb.studentName = project.studentName || 'Unknown Student';
        fb.studentEmail = project.studentEmail || null;
        fb.department = project.department || 'N/A';
        fb.year = project.year ?? null;
        fb.section = project.section || 'N/A';
        fb.courseCode = project.courseCode || 'N/A';
        fb.courseName = project.courseName || 'N/A';
        fb.projectStatus = project.status || 'N/A';
    } else {
        fb.projectTitle = 'Untitled Project';
        fb.studentName = 'Unknown Student';
        fb.studentEmail = null;
        fb.department = 'N/A';
        fb.year = null;
        fb.section = 'N/A';
        fb.courseCode = 'N/A';
        fb.courseName = 'N/A';
        fb.projectStatus = 'N/A';
    }

    return fb;
};

module.exports = { enrichFeedbackRecord };
