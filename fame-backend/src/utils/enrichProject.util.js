const AssignmentRepository = require('../repositories/assignment.repository');

const enrichProjectRecord = async (projectDoc) => {
    const projectObj = projectDoc?.toObject ? projectDoc.toObject() : { ...projectDoc };
    const student = projectObj.studentId;
    const course = projectObj.courseId;
    const gradedBy = projectObj.gradedBy;

    if (student && typeof student === 'object' && student._id) {
        projectObj.studentName = projectObj.studentName || student.name || 'Unknown Student';
        projectObj.studentEmail = student.email || null;
        projectObj.studentRollNumber = student.studentId || null;
    } else {
        projectObj.studentName = projectObj.studentName || 'Unknown Student';
        projectObj.studentEmail = projectObj.studentEmail || null;
        projectObj.studentRollNumber = projectObj.studentRollNumber || null;
    }

    if (course && typeof course === 'object' && course._id) {
        projectObj.courseName = course.courseName || 'N/A';
        projectObj.courseCode = course.courseCode || 'N/A';
    } else {
        projectObj.courseName = projectObj.courseName || 'N/A';
        projectObj.courseCode = projectObj.courseCode || 'N/A';
    }

    if (gradedBy && typeof gradedBy === 'object' && gradedBy._id) {
        projectObj.gradedByName = gradedBy.name || 'N/A';
    } else {
        projectObj.gradedByName = projectObj.gradedByName || null;
    }

    if (projectObj.assignmentId) {
        const assignmentId =
            typeof projectObj.assignmentId === 'object'
                ? projectObj.assignmentId._id
                : projectObj.assignmentId;
        const assignment = await AssignmentRepository.findById(assignmentId);
        projectObj.assignmentTitle = assignment?.title || 'N/A';
    } else {
        projectObj.assignmentTitle = projectObj.assignmentTitle || 'N/A';
    }

    projectObj.department = projectObj.department || 'N/A';
    projectObj.section = projectObj.section || 'N/A';

    return projectObj;
};

module.exports = { enrichProjectRecord };
