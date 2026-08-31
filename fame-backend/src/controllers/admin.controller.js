const UserRepository = require('../repositories/user.repository');
const DepartmentRepository = require('../repositories/department.repository');
const CourseRepository = require('../repositories/course.repository');
const ProjectRepository = require('../repositories/project.repository');
const ProjectVersionRepository = require('../repositories/projectVersion.repository');
const AssignmentRepository = require('../repositories/assignment.repository');
const FeedbackRepository = require('../repositories/feedback.repository');  // ← ADD THIS
const AuditLogRepository = require('../repositories/auditLog.repository');
const CloudinaryService = require('../services/cloudinary.service');
const ApiResponse = require('../utils/apiResponse.util');
const { getMissingSubmissionFiles } = require('../utils/submissionRequirements.util');
const HelperUtil = require('../utils/helper.util');
const { ROLES } = require('../constants/roles.constant');
const { PROJECT_STATUS } = require('../constants/status.constant');
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../constants/messages.constant');
const GeminiRagService = require('../services/geminiRag.service');
const { enrichProjectRecord } = require('../utils/enrichProject.util');
const { enrichFeedbackRecord } = require('../utils/enrichFeedback.util');
const bcrypt = require('bcryptjs');
class AdminController {
    // ==================== USER MANAGEMENT ====================
async trainRagData(req, res, next) {
    try {
        const result = await GeminiRagService.trainAllProjects();
        
        await AuditLogRepository.logAction(
            req.user._id, req.user.email, req.user.role,
            'TRAIN_RAG', 'system', null,
            'RAG Training', null, result,
            'Admin trained RAG data',
            null, req.ip, req.headers['user-agent'], 
            result.success ? 'success' : 'failed'
        );
        
        ApiResponse.success(res, result, result.message);
    } catch (error) {
        next(error);
    }
}

async getTrainingStatus(req, res, next) {
    try {
        const result = await GeminiRagService.getTrainingStatus();
        ApiResponse.success(res, result, result.message);
    } catch (error) {
        next(error);
    }
}

    // @desc    Get all users
    // @route   GET /api/admin/users
async getAllUsers(req, res, next) {
    try {
        const { 
            role, 
            department, 
            isActive, 
            search, 
            page = 1, 
            limit = 20, 
            sort = 'createdAt', 
            order = 'desc' 
        } = req.query;
        
        // Build filter
        const filter = {};
        if (role) filter.role = role;
        if (department) filter.department = department;
        if (isActive !== undefined) filter.isActive = isActive === 'true';
        
        // Build search
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { name: searchRegex },
                { email: searchRegex },
                { studentId: searchRegex },
                { teacherId: searchRegex }
            ];
        }
        
        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);
        
        // Build sort
        const sortOrder = order === 'asc' ? 1 : -1;
        const sortOptions = { [sort]: sortOrder };
        
        // Execute queries
        const [users, total] = await Promise.all([
            UserRepository.findAll(filter, {
                skip,
                limit: limitNum,
                sort: sortOptions,
                select: '-password'
            }),
            UserRepository.count(filter)
        ]);
        
        ApiResponse.paginated(res, users, {
            page: parseInt(page),
            limit: limitNum,
            total
        }, 'Users retrieved successfully');
        
    } catch (error) {
        next(error);
    }
}
    // @desc    Get single user
    // @route   GET /api/admin/users/:id
    async getUserById(req, res, next) {
        try {
            const user = await UserRepository.findById(req.params.id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.USER_NOT_FOUND
                });
            }
            ApiResponse.success(res, user, 'User retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Create student (by admin)
    // @route   POST /api/admin/users/student
    async createStudent(req, res, next) {
        try {
            const { name, email, studentId, department, year, semester, section, password } = req.body;
            const { semesterToYear } = require('../utils/semester.util');
            const resolvedYear = semester ? semesterToYear(semester) : year;
            
            // Check existing user
            const existingUser = await UserRepository.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.EMAIL_ALREADY_EXISTS
                });
            }
            
            const existingStudent = await UserRepository.findByStudentId(studentId);
            if (existingStudent) {
                return res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.STUDENT_ID_EXISTS
                });
            }
            
            const user = await UserRepository.create({
                name,
                email,
                password: await bcrypt.hash(password || studentId, 10), // default password = studentId
                studentId,
                department,
                year: resolvedYear,
                semester,
                section,
                role: ROLES.STUDENT,
                isActive: true
            });
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'CREATE_STUDENT', 'user', user._id,
                user.name, null, user, 'Admin created student account',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.created(res, { id: user._id, name: user.name, email: user.email }, SUCCESS_MESSAGES.USER_CREATED);
        } catch (error) {
            next(error);
        }
    }

    // @desc    Create teacher (by admin)
    // @route   POST /api/admin/users/teacher
    async createTeacher(req, res, next) {
        try {
            const { name, email, teacherId, department, position, password } = req.body;
            
            const existingUser = await UserRepository.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.EMAIL_ALREADY_EXISTS
                });
            }
            
            const existingTeacher = await UserRepository.findByTeacherId(teacherId);
            if (existingTeacher) {
                return res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.TEACHER_ID_EXISTS
                });
            }
            
            const user = await UserRepository.create({
                name,
                email,
                password: await bcrypt.hash(password || 'teacher123', 10),
                teacherId,
                department,
                position: position || '',
                role: ROLES.TEACHER,
                isActive: true
            });
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'CREATE_TEACHER', 'user', user._id,
                user.name, null, user, 'Admin created teacher account',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.created(res, { id: user._id, name: user.name, email: user.email }, SUCCESS_MESSAGES.USER_CREATED);
        } catch (error) {
            next(error);
        }
    }

    // @desc    Update user
    // @route   PUT /api/admin/users/:id
    async updateUser(req, res, next) {
        try {
            const { name, email, department, year, semester, section, position, isActive } = req.body;
            const { semesterToYear } = require('../utils/semester.util');
            const updates = { name, email, department, section, isActive };
            if (semester) {
                updates.semester = semester;
                updates.year = semesterToYear(semester);
            } else if (year !== undefined) {
                updates.year = year;
            }
            if (position !== undefined) updates.position = position;

            const user = await UserRepository.updateById(req.params.id, updates);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.USER_NOT_FOUND
                });
            }
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'UPDATE_USER', 'user', user._id,
                user.name, null, { name, email, department, year, section, isActive },
                'Admin updated user',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.success(res, user, SUCCESS_MESSAGES.USER_UPDATED);
        } catch (error) {
            next(error);
        }
    }

    // @desc    Delete user
    // @route   DELETE /api/admin/users/:id
    async deleteUser(req, res, next) {
        try {
            const user = await UserRepository.findById(req.params.id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.USER_NOT_FOUND
                });
            }
            
            await UserRepository.deleteById(req.params.id);
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'DELETE_USER', 'user', user._id,
                user.name, user, null, 'Admin deleted user',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.success(res, null, SUCCESS_MESSAGES.USER_DELETED);
        } catch (error) {
            next(error);
        }
    }

    // @desc    Upload project files for any student (Admin only)
// @route   POST /api/admin/projects/:id/upload
async uploadProjectFilesForStudent(req, res, next) {
    try {
        const projectId = req.params.id;
        
        const project = await ProjectRepository.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        
        const assignment = project.assignmentId
            ? await AssignmentRepository.findById(project.assignmentId)
            : null;

        const missingFiles = getMissingSubmissionFiles(assignment?.requiredFiles, req.files || {});
        if (missingFiles.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required files: ${missingFiles.join(', ')}`
            });
        }
        
        const newVersionNumber = (project.currentVersion || 0) + 1;
        
        // Upload to Cloudinary
        const uploadedFiles = await CloudinaryService.uploadProjectFiles(
            req.files,
            projectId,
            newVersionNumber
        );
        
        // Create version
        const version = await ProjectVersionRepository.create({
            projectId,
            versionNumber: newVersionNumber,
            codeZipUrl: uploadedFiles.codeZip?.secure_url,
            srsPdfUrl: uploadedFiles.srsPdf?.secure_url,
            designPdfUrl: uploadedFiles.designPdf?.secure_url || null,
            manualPdfUrl: uploadedFiles.manualPdf?.secure_url || null,
            presentationPdfUrl: uploadedFiles.presentationPdf?.secure_url || null,
            videoFileUrl: uploadedFiles.videoFile?.secure_url || null,
            codeFileSize: req.files.codeZip?.[0]?.size || 0,
            pdfFileSize: (req.files.srsPdf?.[0]?.size || 0)
                + (req.files.designPdf?.[0]?.size || 0)
                + (req.files.manualPdf?.[0]?.size || 0)
                + (req.files.presentationPdf?.[0]?.size || 0),
            totalFileSize: Object.values(req.files || {}).reduce((sum, fileList) => {
                const file = fileList?.[0];
                return sum + (file?.size || 0);
            }, 0),
            submittedBy: req.user._id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            isLatest: true
        });
        
        // Update previous versions
        await ProjectVersionRepository.updateMany(
            { projectId, isLatest: true, _id: { $ne: version._id } },
            { isLatest: false }
        );
        
        await ProjectRepository.updateById(projectId, {
            currentVersion: newVersionNumber,
            status: 'pending',
            submittedAt: new Date()
        });
        
        // Dependency check if dependency file provided
        let dependencyResult = null;
        if (req.files.dependencyFile) {
            const GeminiDependencyService = require('../services/geminiDependency.service');
            const depFile = req.files.dependencyFile[0];
            const fileContent = depFile.buffer.toString('utf8');
            const fileName = depFile.originalname;
            const fileResult = await GeminiDependencyService.analyzeFromFile(fileContent, fileName);
            const formatted = GeminiDependencyService.formatAnalysisResponse({
                summary: fileResult.summary,
                dependencies: fileResult.dependencies,
                overallRecommendations: fileResult.overallRecommendations,
                _fallbackReason: fileResult.fallbackReason,
            });

            if (fileResult.hasDependencies !== false) {
                await ProjectVersionRepository.saveAiAnalysis(version._id, formatted);
            }

            dependencyResult = formatted;
        }
        
        await AuditLogRepository.logAction(
            req.user._id, req.user.email, req.user.role,
            'UPLOAD_PROJECT_ADMIN', 'project', project._id,
            project.title, null, { version: newVersionNumber },
            'Admin uploaded project files for student',
            null, req.ip, req.headers['user-agent'], 'success'
        );
        
        ApiResponse.success(res, {
            version,
            project,
            files: {
                codeZip: uploadedFiles.codeZip?.secure_url,
                srsPdf: uploadedFiles.srsPdf?.secure_url
            },
            dependencyCheck: dependencyResult || { message: 'No dependency file provided' }
        }, 'Project files uploaded successfully by Admin');
        
    } catch (error) {
        console.error('Admin upload error:', error);
        next(error);
    }
}

    // @desc    Reset user password
    // @route   POST /api/admin/users/:id/reset-password
    async resetPassword(req, res, next) {
        try {
            const { newPassword } = req.body;
            const user = await UserRepository.findById(req.params.id);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.USER_NOT_FOUND
                });
            }
            
            user.password = newPassword;
            await user.save();
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'RESET_PASSWORD', 'user', user._id,
                user.name, null, null, 'Admin reset user password',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.success(res, null, SUCCESS_MESSAGES.PASSWORD_RESET);
        } catch (error) {
            next(error);
        }
    }

    // ==================== DEPARTMENT MANAGEMENT ====================

    // @desc    Create department
    // @route   POST /api/admin/departments
    async createDepartment(req, res, next) {
        try {
            const { name, fullName, description, establishedYear } = req.body;
            
            const department = await DepartmentRepository.create({
                name, fullName, description, establishedYear, isActive: true
            });
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'CREATE_DEPARTMENT', 'department', department._id,
                department.name, null, department, 'Admin created department',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.created(res, department, SUCCESS_MESSAGES.DEPARTMENT_CREATED);
        } catch (error) {
            next(error);
        }
    }

    // @desc    Get all departments
    // @route   GET /api/admin/departments
    async getAllDepartments(req, res, next) {
        try {
            const departments = await DepartmentRepository.getAllDepartmentsWithCounts();
            ApiResponse.success(res, departments, 'Departments retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    // ==================== COURSE MANAGEMENT ====================

    // @desc    Create course
    // @route   POST /api/admin/courses
    async createCourse(req, res, next) {
        try {
            const { courseCode, courseName, description, department, year, semester, section, credits, teacherId, academicYear } = req.body;
            
            const course = await CourseRepository.create({
                courseCode, courseName, description, department, year, semester, section, credits, teacherId, academicYear, isActive: true
            });
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'CREATE_COURSE', 'course', course._id,
                course.courseCode, null, course, 'Admin created course',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.created(res, course, SUCCESS_MESSAGES.COURSE_CREATED);
        } catch (error) {
            next(error);
        }
    }

    // @desc    Assign teacher to course
    // @route   PUT /api/admin/courses/:courseId/assign-teacher
    async assignTeacher(req, res, next) {
        try {
            const { teacherId } = req.body;
            const course = await CourseRepository.assignTeacher(req.params.courseId, teacherId);
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'ASSIGN_TEACHER', 'course', course._id,
                course.courseCode, null, { teacherId }, 'Admin assigned teacher to course',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.success(res, course, SUCCESS_MESSAGES.TEACHER_ASSIGNED);
        } catch (error) {
            next(error);
        }
    }

    // ==================== PROJECT MANAGEMENT ====================

    // @desc    Get all projects
    // @route   GET /api/admin/projects
    async getAllProjects(req, res, next) {
        try {
            const { department, status, year, page = 1, limit = 20 } = req.query;
            
            const filter = {};
            if (department) filter.department = department;
            if (status) filter.status = status;
            if (year) filter.year = parseInt(year);
            
            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            const projects = await ProjectRepository.findAll(filter, {
                skip,
                limit: parseInt(limit),
                sort: { createdAt: -1 },
                populate: ['studentId', 'courseId']
            });
            
            const total = await ProjectRepository.count(filter);
            
            ApiResponse.paginated(res, projects, {
                page: parseInt(page),
                limit: parseInt(limit),
                total
            }, 'Projects retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Delete project
    // @route   DELETE /api/admin/projects/:id
    async deleteProject(req, res, next) {
        try {
            const project = await ProjectRepository.findById(req.params.id);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.PROJECT_NOT_FOUND
                });
            }
            
            await ProjectRepository.deleteById(req.params.id);
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'DELETE_PROJECT', 'project', project._id,
                project.title, project, null, 'Admin deleted project',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.success(res, null, SUCCESS_MESSAGES.PROJECT_DELETED);
        } catch (error) {
            next(error);
        }
    }

    // ==================== STATISTICS & DASHBOARD ====================

    // @desc    Get dashboard stats
    // @route   GET /api/admin/dashboard/stats
    async getDashboardStats(req, res, next) {
        try {
            const [
                totalStudents,
                totalTeachers,
                totalProjects,
                pendingProjects,
                approvedProjects,
                rejectedProjects,
                revisionProjects,
                gradedProjects,
                userStats,
                avgGradeResult
            ] = await Promise.all([
                UserRepository.count({ role: ROLES.STUDENT, isActive: true }),
                UserRepository.count({ role: ROLES.TEACHER, isActive: true }),
                ProjectRepository.count({ isActive: true }),
                ProjectRepository.count({ status: PROJECT_STATUS.PENDING, isActive: true }),
                ProjectRepository.count({ status: PROJECT_STATUS.APPROVED, isActive: true }),
                ProjectRepository.count({ status: PROJECT_STATUS.REJECTED, isActive: true }),
                ProjectRepository.count({ status: PROJECT_STATUS.REVISION, isActive: true }),
                ProjectRepository.count({ status: PROJECT_STATUS.GRADED, isActive: true }),
                UserRepository.getUserStats(),
                ProjectRepository.aggregate([
                    { $match: { grade: { $ne: null }, isActive: true } },
                    { $group: { _id: null, avg: { $avg: '$grade' } } }
                ])
            ]);

            const averageGrade = avgGradeResult[0]?.avg
                ? Math.round(avgGradeResult[0].avg)
                : 0;

            ApiResponse.success(res, {
                totalStudents,
                totalTeachers,
                totalProjects,
                pendingProjects,
                approvedProjects,
                rejectedProjects,
                revisionProjects,
                gradedProjects,
                averageGrade,
                userStats
            }, 'Dashboard stats retrieved');
        } catch (error) {
            next(error);
        }
    }

    async testGemini(req, res, next) {
    try {
        const result = await GeminiRagService.testConnection();
        ApiResponse.success(res, result, `${require('../utils/fameBrand.util').FAME} connection test`);
    } catch (error) {
        next(error);
    }
}

// ==================== SUBMISSIONS & FEEDBACK (ADMIN VIEW ALL) ====================

// @desc    Get all submissions (all projects from all teachers)
// @route   GET /api/admin/submissions
async getAllSubmissions(req, res, next) {
    try {
        const { 
            search, 
            status, 
            department, 
            year, 
            section,
            page = 1, 
            limit = 20,
            sort = 'submittedAt',
            order = 'desc'
        } = req.query;
        
        let filter = {};
        
        // Search
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { title: searchRegex },
                { description: searchRegex },
                { studentName: searchRegex }
            ];
        }
        
        // Filters
        if (status) filter.status = status;
        if (department) filter.department = department;
        if (year) filter.year = parseInt(year);
        if (section) filter.section = section;
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortOrder = order === 'asc' ? 1 : -1;
        const sortOptions = { [sort]: sortOrder };
        
        const projects = await ProjectRepository.findAll(filter, {
            skip,
            limit: parseInt(limit),
            sort: sortOptions,
            populate: ['studentId', 'courseId', 'gradedBy']
        });

        const enriched = await Promise.all(
            projects.map(async (project) => {
                const latest = await ProjectVersionRepository.getLatestVersion(project._id);
                const data = await enrichProjectRecord(project);
                return {
                    ...data,
                    codeHealthScore: latest?.codeHealthScore ?? null,
                    versionCount: latest?.versionNumber ?? data.currentVersion ?? 0,
                };
            })
        );

        const total = await ProjectRepository.count(filter);

        ApiResponse.paginated(res, enriched, {
            page: parseInt(page),
            limit: parseInt(limit),
            total
        }, 'All submissions retrieved successfully');
    } catch (error) {
        next(error);
    }
}

// @desc    Get all feedbacks (from all teachers)
// @route   GET /api/admin/feedbacks
async getAllFeedbacks(req, res, next) {
    try {
        const {
            search,
            teacherId,
            department,
            year,
            gradeMin,
            page = 1,
            limit = 20,
            sort = 'createdAt',
            order = 'desc'
        } = req.query;

        let filter = {};
        if (teacherId) filter.teacherId = teacherId;

        if (department || year) {
            const projectFilter = {};
            if (department) projectFilter.department = department;
            if (year) projectFilter.year = parseInt(year, 10);
            const projects = await ProjectRepository.findAll(projectFilter, { select: '_id' });
            const projectIds = projects.map((p) => p._id);
            if (projectIds.length === 0) {
                return ApiResponse.paginated(res, [], {
                    page: parseInt(page, 10),
                    limit: parseInt(limit, 10),
                    total: 0
                }, 'All feedbacks retrieved successfully');
            }
            filter.projectId = { $in: projectIds };
        }

        const sortOrder = order === 'asc' ? 1 : -1;
        const sortOptions = { [sort]: sortOrder };

        let feedbacks = await FeedbackRepository.findAll(filter, {
            sort: sortOptions,
            populate: [{ path: 'projectId', populate: ['studentId', 'courseId'] }, 'teacherId']
        });

        if (search && search.trim()) {
            const searchLower = search.trim().toLowerCase();
            feedbacks = feedbacks.filter((f) => {
                const project = f.projectId;
                return (
                    project?.title?.toLowerCase().includes(searchLower) ||
                    project?.studentName?.toLowerCase().includes(searchLower) ||
                    f.teacherName?.toLowerCase().includes(searchLower) ||
                    f.feedbackText?.toLowerCase().includes(searchLower)
                );
            });
        }

        if (gradeMin !== undefined && gradeMin !== '') {
            const min = parseInt(gradeMin, 10);
            feedbacks = feedbacks.filter((f) => (f.grade ?? 0) >= min);
        }

        const total = feedbacks.length;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        const pageItems = feedbacks.slice(skip, skip + limitNum);

        const enriched = await Promise.all(pageItems.map((fb) => enrichFeedbackRecord(fb)));

        ApiResponse.paginated(res, enriched, {
            page: pageNum,
            limit: limitNum,
            total
        }, 'All feedbacks retrieved successfully');
    } catch (error) {
        next(error);
    }
}

// ==================== ANALYTICS ENDPOINTS ====================

// @desc    Get monthly analytics
// @route   GET /api/admin/analytics/monthly
async getMonthlyAnalytics(req, res, next) {
    try {
        const { year = new Date().getFullYear() } = req.query;
        
        const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
        const endDate = new Date(`${year}-12-31T23:59:59.999Z`);
        
        const monthlyData = await ProjectRepository.aggregate([
            {
                $match: {
                    submittedAt: { $gte: startDate, $lte: endDate },
                    isActive: true
                }
            },
            {
                $group: {
                    _id: { $month: '$submittedAt' },
                    projects: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const result = months.map((name, index) => {
            const found = monthlyData.find(d => d._id === index + 1);
            return { name, projects: found?.projects || 0 };
        });
        
        ApiResponse.success(res, result, 'Monthly analytics retrieved');
    } catch (error) {
        next(error);
    }
}

// @desc    Get department statistics
// @route   GET /api/admin/analytics/departments
async getDepartmentAnalytics(req, res, next) {
    try {
        const departments = ['CS', 'IT', 'CT', 'EC'];
        const result = [];
        
        for (const dept of departments) {
            const projects = await ProjectRepository.count({ department: dept, isActive: true });
            const students = await UserRepository.count({ department: dept, role: 'student', isActive: true });
            result.push({ name: dept, projects, students });
        }
        
        ApiResponse.success(res, result, 'Department analytics retrieved');
    } catch (error) {
        next(error);
    }
}

// @desc    Get project status distribution
// @route   GET /api/admin/analytics/status
async getStatusAnalytics(req, res, next) {
    try {
        const statuses = ['pending', 'approved', 'rejected', 'revision', 'graded'];
        const colors = {
            pending: '#FCD34D',
            approved: '#A7F3D0',
            rejected: '#FEE2E2',
            revision: '#DBEAFE',
            graded: '#E9D5FF'
        };
        
        const result = [];
        for (const status of statuses) {
            const count = await ProjectRepository.count({ status, isActive: true });
            result.push({ 
                name: status.charAt(0).toUpperCase() + status.slice(1), 
                value: count, 
                color: colors[status] 
            });
        }
        
        ApiResponse.success(res, result, 'Status analytics retrieved');
    } catch (error) {
        next(error);
    }
}

// @desc    Get top students
// @route   GET /api/admin/analytics/top-students
async getTopStudentsAnalytics(req, res, next) {
    try {
        const { limit = 5 } = req.query;
        
        // Get students who have projects with grades
        const topStudents = await ProjectRepository.aggregate([
            { $match: { grade: { $ne: null }, isActive: true } },
            {
                $group: {
                    _id: '$studentId',
                    studentName: { $first: '$studentName' },
                    department: { $first: '$department' },
                    year: { $first: '$year' },
                    averageGrade: { $avg: '$grade' },
                    projectsCount: { $sum: 1 }
                }
            },
            { $sort: { averageGrade: -1 } },
            { $limit: parseInt(limit) }
        ]);
        
        // Populate student details
        const result = [];
        for (const student of topStudents) {
            const user = await UserRepository.findById(student._id);
            result.push({
                _id: student._id,
                name: student.studentName || user?.name || 'Unknown Student',
                department: student.department || user?.department || 'N/A',
                year: student.year ?? user?.year ?? '—',
                averageGrade: Math.round(student.averageGrade ?? 0),
                projectsCount: student.projectsCount ?? 0,
                studentId: user?.studentId || 'N/A'
            });
        }
        
        ApiResponse.success(res, result, 'Top students retrieved');
    } catch (error) {
        next(error);
    }
}

// @desc    Get teacher performance
// @route   GET /api/admin/analytics/teacher-performance
async getTeacherPerformanceAnalytics(req, res, next) {
    try {
        const teachers = await UserRepository.findAll({ role: 'teacher', isActive: true });
        
        const result = [];
        for (const teacher of teachers) {
            // Get courses taught by this teacher
            const courses = await CourseRepository.findAll({ teacherId: teacher._id });
            const courseIds = courses.map(c => c._id);
            
            // Get projects from those courses
            const projects = await ProjectRepository.findAll({ courseId: { $in: courseIds } });
            const gradedProjects = projects.filter(p => p.grade !== null);
            const avgGrade = gradedProjects.length > 0 
                ? Math.round(gradedProjects.reduce((sum, p) => sum + p.grade, 0) / gradedProjects.length) 
                : 0;
            
            result.push({
                _id: teacher._id,
                name: teacher.name || 'Unknown Teacher',
                department: teacher.department || 'N/A',
                teacherId: teacher.teacherId || 'N/A',
                projectsGraded: gradedProjects.length,
                totalProjects: projects.length,
                avgGrade: avgGrade
            });
        }
        
        // Sort by projects graded
        result.sort((a, b) => b.projectsGraded - a.projectsGraded);
        
        ApiResponse.success(res, result.slice(0, 10), 'Teacher performance retrieved');
    } catch (error) {
        next(error);
    }
}

// @desc    Performance by department, course, or assignment
// @route   GET /api/admin/analytics/performance
async getPerformanceAnalytics(req, res, next) {
    try {
        const { groupBy = 'department', department, courseId, assignmentId } = req.query;
        const match = { isActive: true, grade: { $ne: null } };
        if (department) match.department = department;
        if (courseId) match.courseId = courseId;
        if (assignmentId) match.assignmentId = assignmentId;

        let groupId = '$department';
        if (groupBy === 'course') groupId = '$courseId';
        if (groupBy === 'assignment') groupId = '$assignmentId';

        const rows = await ProjectRepository.aggregate([
            { $match: match },
            {
                $group: {
                    _id: groupId,
                    averageGrade: { $avg: '$grade' },
                    submissions: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
            { $limit: 50 },
        ]);

        const AssignmentRepository = require('../repositories/assignment.repository');
        const result = [];
        for (const row of rows) {
            let name = String(row._id || 'Unknown');
            if (groupBy === 'course' && row._id) {
                const course = await CourseRepository.findById(row._id);
                name = course ? `${course.courseCode} — ${course.courseName}` : name;
            } else if (groupBy === 'assignment' && row._id) {
                const assignment = await AssignmentRepository.findById(row._id);
                name = assignment?.title || name;
            }
            result.push({
                id: row._id,
                name,
                averageGrade: Math.round(row.averageGrade || 0),
                submissions: row.submissions,
            });
        }

        // Alphabetical — peer overview, not a cross-category ranking
        result.sort((a, b) => String(a.name).localeCompare(String(b.name)));

        ApiResponse.success(res, result, 'Performance analytics retrieved');
    } catch (error) {
        next(error);
    }
}
    // @desc    Create new student (Admin only)
    // @route   POST /api/admin/users/student
    async createStudent(req, res, next) {
        try {
            const {
                name,
                email,
                password,
                studentId,
                department,
                year,
                semester,
                section,
                phone,
                address
            } = req.body;
            const { semesterToYear } = require('../utils/semester.util');
            const resolvedYear = semester ? semesterToYear(semester) : parseInt(year, 10);
            
            // Check if user already exists
            const existingUser = await UserRepository.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
            
            // Check if student ID already exists
            const existingStudent = await UserRepository.findByStudentId(studentId);
            if (existingStudent) {
                return res.status(400).json({
                    success: false,
                    message: 'Student ID already exists'
                });
            }
            
            // Hash password (use studentId as default password if not provided)
            const hashedPassword = await bcrypt.hash(password || studentId, 10);
            
            // Create student
            const student = await UserRepository.create({
                name,
                email,
                password: hashedPassword,
                studentId,
                department,
                year: resolvedYear,
                semester,
                section,
                phone: phone || '',
                address: address || '',
                role: 'student',
                isActive: true
            });
            
            // Remove password from response
            const studentData = student.toObject();
            delete studentData.password;
            
            // Log action
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'CREATE_STUDENT', 'user', student._id,
                student.name, null, student,
                `Student ${student.name} created by ${req.user.name}`,
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.created(res, studentData, 'Student created successfully');
            
        } catch (error) {
            next(error);
        }
    }

    // @desc    Bulk create students
    // @route   POST /api/admin/users/students/bulk
    async bulkCreateStudents(req, res, next) {
        try {
            const { students } = req.body;
            
            if (!students || !Array.isArray(students) || students.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide an array of students'
                });
            }
            
            const results = {
                success: [],
                failed: []
            };
            
            for (const studentData of students) {
                try {
                    const { name, email, studentId, department, year, section } = studentData;
                    
                    const existingUser = await UserRepository.findByEmail(email);
                    if (existingUser) {
                        results.failed.push({ ...studentData, reason: 'Email already exists' });
                        continue;
                    }
                    
                    const existingStudent = await UserRepository.findByStudentId(studentId);
                    if (existingStudent) {
                        results.failed.push({ ...studentData, reason: 'Student ID already exists' });
                        continue;
                    }
                    
                    const hashedPassword = await bcrypt.hash(studentId, 10);
                    const student = await UserRepository.create({
                        name,
                        email,
                        password: hashedPassword,
                        studentId,
                        department,
                        year: parseInt(year),
                        section,
                        role: 'student',
                        isActive: true
                    });
                    
                    const studentObj = student.toObject();
                    delete studentObj.password;
                    results.success.push(studentObj);
                    
                } catch (error) {
                    results.failed.push({ ...studentData, reason: error.message });
                }
            }
            
            ApiResponse.success(res, results, `Created ${results.success.length} students, failed ${results.failed.length}`);
            
        } catch (error) {
            next(error);
        }
    }



}


module.exports = new AdminController();