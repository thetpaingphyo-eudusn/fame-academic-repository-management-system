require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User.model');
const RagContextService = require('../src/services/ragContext.service');
const RagAccessService = require('../src/services/ragAccess.service');

const history = [
  { role: 'user', content: 'ကျောင်းသားစာရင်းပေးပါ' },
  {
    role: 'assistant',
    content: '• **Mg Thet Paing Phyo** (FIS, Y5) — Projects: No projects',
  },
];

const tests = [
  'how many student in my course?',
  'သူ့ရဲ့ email ပေးပါ',
  'သူ့ရဲ့ ခုံနံပါတ်ပေးပါ',
  'Mg Thet Paing Phyo',
  'ကျောင်းသားစာရင်းပေးပါ',
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fame_academic_repository');
  const teacher = await User.findOne({ email: 'nandar@ucsmtla.edu.mm' }).select('-password');
  const context = await RagContextService.buildRoleContext(teacher);

  for (const q of tests) {
    const access = RagAccessService.validateQuery(q, 'teacher', context);
    const answer = RagContextService.tryFastAnswer(q, context, history) || RagContextService.localAnswer(q, context, history);
    console.log(`\nQ: ${q}`);
    console.log(`  access=${access.allowed}`);
    console.log(`  → ${String(answer).split('\n').join(' | ')}`);
  }

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
