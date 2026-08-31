/** Normalize populated or plain MongoDB ids to strings */
export const toId = (value) => {
  if (!value) return '';
  if (typeof value === 'object') return String(value._id || value);
  return String(value);
};

  export const getStudentDisplayName = (student) => {
  if (!student) return 'Unknown';
  if (typeof student.name === 'object' && student.name !== null) {
    return student.name?.name || 'Unknown';
  }
  if (typeof student.name === 'string' && student.name) {
    return student.name;
  }
  return 'Unknown';
};

export const getStudentName = (project) => {
  if (!project) return 'Unknown';
  if (project.studentId && typeof project.studentId === 'object') {
    return project.studentId.name || 'Unknown';
  }
  if (typeof project.studentName === 'string' && project.studentName) {
    return project.studentName;
  }
  if (typeof project.studentName === 'object' && project.studentName !== null) {
    return project.studentName.name || 'Unknown';
  }
  return 'Unknown';
};

export const getStudentRollId = (project) => {
  if (!project) return '';
  if (typeof project.studentId === 'object' && project.studentId !== null) {
    return project.studentId.studentId || '';
  }
  return '';
};

export const getProjectOwnerId = (project) => toId(project?.studentId);

export const getCourseName = (project) => {
  if (!project) return 'N/A';
  if (project.courseId && typeof project.courseId === 'object') {
    return project.courseId.courseName || project.courseId.name || 'N/A';
  }
  if (typeof project.courseName === 'string' && project.courseName) {
    return project.courseName;
  }
  if (typeof project.courseName === 'object' && project.courseName !== null) {
    return project.courseName.name || 'N/A';
  }
  return 'N/A';
};

export const getAssignmentTitle = (project) => {
  if (!project) return 'N/A';
  if (project.assignmentId && typeof project.assignmentId === 'object') {
    return project.assignmentId.title || 'N/A';
  }
  if (typeof project.assignmentTitle === 'string' && project.assignmentTitle) {
    return project.assignmentTitle;
  }
  if (typeof project.assignmentTitle === 'object' && project.assignmentTitle !== null) {
    return project.assignmentTitle.title || 'N/A';
  }
  return 'N/A';
};

export const getCourseId = (project) => toId(project?.courseId);

export const matchesCourse = (project, courseId) => getCourseId(project) === toId(courseId);

export const filterProjectsByStudent = (projects, studentId) =>
  projects.filter((p) => getProjectOwnerId(p) === toId(studentId));

export const averageGrade = (projects) => {
  const graded = projects.filter((p) => p.grade != null);
  if (!graded.length) return 0;
  return Math.round(graded.reduce((sum, p) => sum + p.grade, 0) / graded.length);
};
