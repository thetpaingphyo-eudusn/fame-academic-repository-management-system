require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User.model');
const RagContextService = require('../src/services/ragContext.service');

const email = process.argv[2] || 'nandar@ucsmtla.edu.mm';

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fame_academic_repository');
  const teacher = await User.findOne({ email: email.toLowerCase() }).select('-password');
  if (!teacher) {
    console.log('User not found');
    process.exit(1);
  }

  const context = await RagContextService.buildRoleContext(teacher);
  console.log('Stats:', context.stats);
  console.log('\nStudents:');
  context.studentProjectMap.forEach((s) => {
    console.log(`  - ${s.name} (${s.studentId}) — projects: ${s.projects.length}`);
  });

  const myQuery = 'ငါ့ရဲ့ကျောင်းသားများကိုပေးပါ';
  const answer = RagContextService.buildContextAnswer(myQuery, context, [], 'my');
  console.log('\nFAME local answer (my):');
  console.log(answer);

  const local = RagContextService.localAnswer(myQuery, context, []);
  console.log('\nFAME localAnswer:');
  console.log(local);

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
