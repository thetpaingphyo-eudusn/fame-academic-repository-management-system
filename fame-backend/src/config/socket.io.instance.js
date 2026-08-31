let io = null;

const setIO = (instance) => {
    io = instance;
};

const getIO = () => io;

const emitToUser = (userId, event, payload) => {
    if (!io) return;
    io.to(`user:${userId}`).emit(event, payload);
};

const emitToRole = (role, event, payload) => {
    if (!io) return;
    io.to(`role:${role}`).emit(event, payload);
};

module.exports = { setIO, getIO, emitToUser, emitToRole };
