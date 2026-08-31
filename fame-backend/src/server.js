const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database.config');
const { initSocket } = require('./config/socket.config');
const { notFound, errorHandler } = require('./middleware/error.middleware');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());

// Serve locally uploaded files when FILE_STORAGE_PROVIDER=local
const localUploadDir = process.env.LOCAL_UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(localUploadDir));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/teacher', require('./routes/teacher.routes'));
app.use('/api/student', require('./routes/student.routes'));
app.use('/api/projects', require('./routes/project.routes.js'));
app.use('/api/search', require('./routes/search.routes'));
app.use('/api/upload', require('./routes/upload.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/departments', require('./routes/department.routes'));
app.use('/api/courses', require('./routes/course.routes'));  // ← ADD THIS LINE
app.use('/api/assignments', require('./routes/assignment.routes'));
app.use('/api/ai', require('./routes/ai.routes'));
app.use('/api/rag', require('./routes/rag.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/chat', require('./routes/chat.routes'));

// API root + health (avoids noisy 404 when hitting /api directly)
app.get('/api', (req, res) => {
    res.json({
        status: 'OK',
        message: 'FAME API',
        health: '/api/health',
        timestamp: new Date().toISOString()
    });
});
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server — bind 127.0.0.1 so VPN does not break local access
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '127.0.0.1';
const server = http.createServer(app);
initSocket(server);

server.listen(PORT, HOST, () => {
    const storageProvider = process.env.FILE_STORAGE_PROVIDER === 'local' ? 'local' : 'cloudinary';
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`📡 API URL: http://${HOST}:${PORT}/api`);
    console.log(`📂 File storage: ${storageProvider}${storageProvider === 'local' ? ` (${localUploadDir})` : ''}`);
});