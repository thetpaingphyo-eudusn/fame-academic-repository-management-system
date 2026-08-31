require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User.model');
const RagContextService = require('../src/services/ragContext.service');

const queries = [
  'ငါ့ရဲ့ကျောင်းသားများကိုပေးပါ',
  'ကျောင်းသား ဘယ်နှစ်ယောက်',
  'hi',
  'Explain in detail why database projects are important for students career development',
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fame_academic_repository');
  const teacher = await User.findOne({ email: 'nandar@ucsmtla.edu.mm' }).select('-password');
  const context = await RagContextService.buildRoleContext(teacher);

  for (const q of queries) {
    const quick = RagContextService.isQuickQuery(q);
    const t0 = Date.now();
    const answer = RagContextService.tryFastAnswer(q, context, []);
    const ms = Date.now() - t0;
    console.log(`\nQ: ${q}`);
    console.log(`  quick=${quick} fast=${!!answer} ${ms}ms`);
    if (answer) console.log(`  → ${answer.split('\n')[0]}`);
  }

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
