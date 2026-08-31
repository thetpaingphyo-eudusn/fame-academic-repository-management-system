require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User.model');
const Course = require('../src/models/Course.model');
const Project = require('../src/models/Project.model');

const email = process.argv[2] || 'nandar@ucsmtla.edu.mm';

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fame_academic_repository');
  const teacher = await User.findOne({ email: email.toLowerCase() }).select('-password');
  if (!teacher) {
    console.log('TEACHER NOT FOUND:', email);
    process.exit(0);
  }
  console.log('Teacher:', {
    id: String(teacher._id),
    name: teacher.name,
    email: teacher.email,
    department: teacher.department,
    assignedCoursesOnTeacher: teacher.assignedCourses?.length || 0,
  });

  const courses = await Course.find({ teacherId: teacher._id });
  console.log('\nCourses (teacherId):', courses.length);
  courses.forEach((c) => console.log(`  - ${c.courseCode} ${c.courseName} (${c._id})`));

  const courseIds = courses.map((c) => c._id);
  const enrolled = await User.find({
    role: 'student',
    isActive: true,
    assignedCourses: { $in: courseIds },
  }).select('name email studentId assignedCourses');

  console.log('\nEnrolled students:', enrolled.length);
  enrolled.forEach((s) => {
    const inTeacherCourses = (s.assignedCourses || []).filter((id) =>
      courseIds.some((cid) => String(cid) === String(id))
    ).length;
    console.log(`  - ${s.name} <${s.email}> (${s.studentId}) — ${inTeacherCourses} course(s) with this teacher`);
  });

  const projects =
    courseIds.length > 0
      ? await Project.find({ courseId: { $in: courseIds }, isActive: true }).select('title studentName status')
      : [];
  console.log('\nProjects in teacher courses:', projects.length);
  projects.slice(0, 10).forEach((p) => console.log(`  - ${p.title} by ${p.studentName} (${p.status})`));

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
