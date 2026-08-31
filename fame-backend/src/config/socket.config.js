const { Server } = require('socket.io');
const TokenUtil = require('../utils/token.util');
const User = require('../models/User.model');
const { setIO, getIO, emitToUser, emitToRole } = require('./socket.io.instance');

const initSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: true,
            credentials: true,
        },
        path: '/socket.io',
    });

    setIO(io);

    io.use(async (socket, next) => {
        try {
            const token =
                socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace('Bearer ', '');

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = TokenUtil.verifyToken(token);
            if (!decoded?.id) {
                return next(new Error('Invalid token'));
            }

            const user = await User.findById(decoded.id).select('_id name email role isActive');
            if (!user || user.isActive === false) {
                return next(new Error('User not found'));
            }

            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket) => {
        const userId = String(socket.user._id);
        socket.join(`user:${userId}`);
        socket.join(`role:${socket.user.role}`);

        // Lazy-load to avoid circular dependency with chat.service
        require('./chat.socket')(io, socket);

        socket.on('disconnect', () => {});
    });

    console.log('🔔 Socket.io ready (notifications + chat)');
    return io;
};

module.exports = { initSocket, getIO, emitToUser, emitToRole };
