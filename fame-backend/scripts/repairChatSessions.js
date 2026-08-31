require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User.model');
const RagChatSession = require('../src/models/RagChatSession.model');

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI is not set');
        process.exit(1);
    }

    await mongoose.connect(uri);

    const users = await User.find({ role: { $in: ['admin', 'teacher', 'student'] } })
        .select('_id name email role')
        .lean();

    let repaired = 0;
    for (const user of users) {
        const email = String(user.email || '').trim();
        if (!email) continue;

        const result = await RagChatSession.updateMany(
            {
                isActive: true,
                userEmail: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
                userId: { $ne: user._id },
            },
            {
                $set: {
                    userId: user._id,
                    userName: user.name || 'Unknown',
                    userRole: user.role,
                },
            }
        );

        repaired += result.modifiedCount || 0;
    }

    const total = await RagChatSession.countDocuments({ isActive: true });
    console.log(`Repaired ${repaired} chat session(s). Active sessions in DB: ${total}.`);
    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error('Repair failed:', error.message);
    await mongoose.disconnect();
    process.exit(1);
});
