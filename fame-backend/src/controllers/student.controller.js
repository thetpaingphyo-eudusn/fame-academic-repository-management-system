const ProjectRepository = require('../repositories/project.repository');
const ProjectVersionRepository = require('../repositories/projectVersion.repository');
const CourseRepository = require('../repositories/course.repository');
const AssignmentRepository = require('../repositories/assignment.repository');
const SubmissionRepository = require('../repositories/submission.repository');
const FeedbackRepository = require('../repositories/feedback.repository');
const GradingCriteriaRepository = require('../repositories/criteria.repository');
const UserRepository = require('../repositories/user.repository');
const AuditLogRepository = require('../repositories/auditLog.repository');
const ApiResponse = require('../utils/apiResponse.util');
const { getMissingSubmissionFiles } = require('../utils/submissionRequirements.util');
const { PROJECT_STATUS } = require('../constants/status.constant');
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../constants/messages.constant');
const cloudinaryService = require('../services/cloudinary.service');
const localStorageService = require('../services/localStorage.service');
const GeminiDependencyService = require('../services/geminiDependency.service');

const mapVersionAiAnalysis = (version) => {
    const saved = version.dependencyAnalysis;
    const hasAnalysis = saved || version.codeHealthScore != null || version.dependencies?.length;
    if (!hasAnalysis) return null;

    const recommendationMessages = saved?.recommendations?.length
        ? saved.recommendations
        : (version.healthWarnings || []);

    const recommendations = recommendationMessages.map((item) => {
        if (typeof item === 'string') {
            return { type: 'info', message: item, action: '' };
        }
        return item;
    });

    return {
        versionId: version._id,
        versionNumber: version.versionNumber,
        submittedAt: version.submittedAt,
        isLatest: version.isLatest,
        source: saved?.source || 'gemini',
        healthScore: version.codeHealthScore ?? saved?.summary?.healthScore ?? null,
        summary: saved?.summary || {
            total: version.dependencies?.length || 0,
            healthScore: version.codeHealthScore ?? null
        },
        recommendations,
        dependencies: saved?.dependencies?.length ? saved.dependencies : (version.dependencies || []),
        analyzedAt: saved?.analyzedAt || version.updatedAt,
        error: saved?.error || null
    };
};

class StudentController {
    // ==================== COURSE MANAGEMENT ====================

    // @desc    Get courses for logged in student
    // @route   GET /api/student/courses
// @desc    Get courses for logged in student
// @route   GET /api/student/courses
async getMyCourses(req, res, next) {
    try {
        const enrolledCourseIds = (req.user.assignedCourses || []).map((id) => id.toString());

        if (enrolledCourseIds.length === 0) {
            return ApiResponse.success(res, [], 'No enrolled courses');
        }

        const courses = await CourseRepository.findAll(
            { _id: { $in: enrolledCourseIds }, isActive: true },
            { sort: { courseCode: 1 }, populate: ['teacherId'] }
        );

        const coursesWithDetails = await Promise.all(courses.map(async (course) => {
            const assignments = await AssignmentRepository.findByCourseId(course._id);
            const assignmentIds = assignments.map((a) => a._id);
            const projects = await ProjectRepository.findAll({
                studentId: req.user._id,
                assignmentId: { $in: assignmentIds },
                isActive: true,
                isLatest: true
            });

            const submittedCount = projects.length;
            const gradedCount = projects.filter((p) => p.grade).length;
            const avgGrade = gradedCount > 0
                ? Math.round(projects.filter((p) => p.grade).reduce((sum, p) => sum + p.grade, 0) / gradedCount)
                : 0;

            return {
                ...course.toObject(),
                isEnrolled: true,
                stats: {
                    totalAssignments: assignments.length,
                    submittedProjects: submittedCount,
                    gradedProjects: gradedCount,
                    averageGrade: avgGrade,
                    completionRate: assignments.length > 0
                        ? Math.round((submittedCount / assignments.length) * 100)
                        : 0
                },
                recentAssignments: assignments.slice(0, 3).map((a) => ({
                    _id: a._id,
                    title: a.title,
                    dueDate: a.dueDate,
                    status: a.status,
                    submitted: projects.some((p) => p.assignmentId?.toString() === a._id.toString())
                }))
            };
        }));

        ApiResponse.success(res, coursesWithDetails, 'Courses retrieved successfully');
    } catch (error) {
        console.error('Error in getMyCourses:', error);
        next(error);
    }
}

    // @desc    Get assignments for a specific course
    // @route   GET /api/student/courses/:courseId/assignments
    async getAssignmentsByCourse(req, res, next) {
        try {
            const { courseId } = req.params;
            
            // Verify student is enrolled in this course
            const course = await CourseRepository.findById(courseId);
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'Course not found'
                });
            }
            
            const enrolledCourseIds = (req.user.assignedCourses || []).map((id) => id.toString());
            if (!enrolledCourseIds.includes(courseId.toString())) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not enrolled in this course'
                });
            }

            // Get assignments for the course
            const assignments = await AssignmentRepository.findByCourseId(courseId);
            
            // Get student's submissions for these assignments
            const assignmentIds = assignments.map(a => a._id);
            const criteriaDocs = await GradingCriteriaRepository.findByAssignmentIds(assignmentIds);
            const criteriaByAssignment = new Map(
                criteriaDocs.map((doc) => [doc.assignmentId.toString(), doc])
            );
            const submissions = await ProjectRepository.findAll({
                studentId: req.user._id,
                assignmentId: { $in: assignmentIds },
                isLatest: true
            });
            
            // Map submission status to each assignment
            const assignmentsWithStatus = assignments.map(assignment => {
                const submission = submissions.find(s => s.assignmentId?.toString() === assignment._id.toString());
                const now = new Date();
                const dueDate = new Date(assignment.dueDate);
                const openDate = new Date(assignment.openDate);
                
                let submissionStatus = 'not_started';
                if (submission) {
                    submissionStatus = submission.status;
                } else if (now > dueDate) {
                    submissionStatus = 'missed';
                } else if (now < openDate) {
                    submissionStatus = 'not_open';
                } else {
                    submissionStatus = 'open';
                }
                
                const criteriaDoc = criteriaByAssignment.get(assignment._id.toString());
                const criteriaList = criteriaDoc?.criteria || [];

                return {
                    _id: assignment._id,
                    title: assignment.title,
                    description: assignment.description,
                    openDate: assignment.openDate,
                    dueDate: assignment.dueDate,
                    allowLate: assignment.allowLate,
                    latePenalty: assignment.latePenalty,
                    maxFileSize: assignment.maxFileSize,
                    requiredFiles: assignment.requiredFiles,
                    submissionStatus,
                    gradingCriteria: {
                        hasCriteria: criteriaList.length > 0,
                        count: criteriaList.length,
                        passingGrade: criteriaDoc?.passingGrade ?? 60
                    },
                    submission: submission ? {
                        _id: submission._id,
                        title: submission.title,
                        status: submission.status,
                        grade: submission.grade,
                        submittedAt: submission.submittedAt,
                        teacherFeedback: submission.teacherFeedback
                    } : null
                };
            });
            
            ApiResponse.success(res, {
                course: {
                    _id: course._id,
                    name: course.courseName,
                    code: course.courseCode
                },
                assignments: assignmentsWithStatus,
                summary: {
                    total: assignments.length,
                    submitted: assignmentsWithStatus.filter(a => a.submissionStatus === 'submitted' || a.submissionStatus === 'graded').length,
                    pending: assignmentsWithStatus.filter(a => a.submissionStatus === 'pending').length,
                    graded: assignmentsWithStatus.filter(a => a.submissionStatus === 'graded').length,
                    notStarted: assignmentsWithStatus.filter(a => a.submissionStatus === 'not_started').length,
                    missed: assignmentsWithStatus.filter(a => a.submissionStatus === 'missed').length
                }
            }, 'Assignments retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Get grading criteria for an assignment (read-only)
    // @route   GET /api/student/assignments/:assignmentId/criteria
    async getAssignmentGradingCriteria(req, res, next) {
        try {
            const { assignmentId } = req.params;

            const assignment = await AssignmentRepository.findById(assignmentId);
            if (!assignment) {
                return res.status(404).json({
                    success: false,
                    message: 'Assignment not found'
                });
            }

            const enrolledCourseIds = (req.user.assignedCourses || []).map((id) => id.toString());
            if (!enrolledCourseIds.includes(assignment.courseId.toString())) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not enrolled in this course'
                });
            }

            const criteriaDoc = await GradingCriteriaRepository.findByAssignmentId(assignmentId);

            ApiResponse.success(res, {
                assignmentId,
                criteria: criteriaDoc?.criteria || [],
                totalWeight: criteriaDoc?.totalWeight || 0,
                passingGrade: criteriaDoc?.passingGrade ?? 60
            }, 'Grading criteria retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Get single course with details
    // @route   GET /api/student/courses/:courseId
    async getCourseById(req, res, next) {
        try {
            const { courseId } = req.params;
            
            const course = await CourseRepository.findById(courseId, {
                populate: ['teacherId']
            });
            
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'Course not found'
                });
            }
            
            // Get assignments
            const assignments = await AssignmentRepository.findByCourseId(courseId);
            
            // Get student's projects
            const assignmentIds = assignments.map(a => a._id);
            const projects = await ProjectRepository.findAll({
                studentId: req.user._id,
                assignmentId: { $in: assignmentIds },
                isLatest: true
            }, {
                populate: ['assignmentId']
            });
            
            ApiResponse.success(res, {
                course,
                assignments,
                projects,
                stats: {
                    totalAssignments: assignments.length,
                    submittedProjects: projects.length,
                    gradedProjects: projects.filter(p => p.grade).length,
                    averageGrade: projects.filter(p => p.grade).length > 0 
                        ? Math.round(projects.filter(p => p.grade).reduce((sum, p) => sum + p.grade, 0) / projects.filter(p => p.grade).length)
                        : 0
                }
            }, 'Course details retrieved');
        } catch (error) {
            next(error);
        }
    }

    // ==================== PROJECT MANAGEMENT ====================

    // @desc    Get my projects
    // @route   GET /api/student/projects
    async getMyProjects(req, res, next) {
        try {
            const { status, assignmentId, page = 1, limit = 20 } = req.query;
            
            const filter = { 
                studentId: req.user._id,
                isLatest: true,
                isActive: true
            };
            if (status) filter.status = status;
            if (assignmentId) filter.assignmentId = assignmentId;
            
            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            const projects = await ProjectRepository.findAll(filter, {
                skip,
                limit: parseInt(limit),
                sort: { submittedAt: -1 },
                populate: ['assignmentId', 'courseId']
            });
            
            // Add assignment and course details
            const assignmentIds = [...new Set(
                projects.map((p) => p.assignmentId?._id || p.assignmentId).filter(Boolean)
            )];
            const criteriaDocs = await GradingCriteriaRepository.findByAssignmentIds(assignmentIds);
            const criteriaByAssignment = new Map(
                criteriaDocs.map((doc) => [doc.assignmentId.toString(), doc])
            );

            const projectsWithDetails = await Promise.all(projects.map(async (project) => {
                const assignment = project.assignmentId;
                const assignmentKey = (assignment?._id || assignment)?.toString();
                const criteriaDoc = assignmentKey ? criteriaByAssignment.get(assignmentKey) : null;
                const criteriaList = criteriaDoc?.criteria || [];

                let criterionScoreCount = 0;
                if (project.grade) {
                    const feedback = await FeedbackRepository.getFinalFeedback(project._id);
                    criterionScoreCount = feedback?.criterionScores?.length || 0;
                }

                return {
                    ...project.toObject(),
                    assignmentTitle: assignment?.title || 'N/A',
                    courseName: project.courseId?.courseName || 'N/A',
                    courseId: project.courseId?._id || project.courseId,
                    assignmentId: assignment?._id || project.assignmentId,
                    hasFeedback: !!project.teacherFeedback,
                    canResubmit: project.status === 'revision' || project.status === 'rejected',
                    gradingCriteria: {
                        hasCriteria: criteriaList.length > 0,
                        count: criteriaList.length,
                        passingGrade: criteriaDoc?.passingGrade ?? 60
                    },
                    criterionScoreCount
                };
            }));
            
            const total = await ProjectRepository.count(filter);
            
            ApiResponse.paginated(res, projectsWithDetails, {
                page: parseInt(page),
                limit: parseInt(limit),
                total
            }, 'My projects retrieved');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Get single project detail
    // @route   GET /api/student/projects/:id
// @desc    Get single project detail
// @route   GET /api/student/projects/:id
// @desc    Get single project detail
// @route   GET /api/student/projects/:id
async getProjectById(req, res, next) {
    try {
        // First get the project
        const project = await ProjectRepository.findById(req.params.id);
        
        if (!project) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.PROJECT_NOT_FOUND
            });
        }
        
        // Check ownership - student can only view their own projects
        if (project.studentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only view your own projects'
            });
        }
        
        // Manually populate course and assignment data
        const course = await CourseRepository.findById(project.courseId);
        const assignment = await AssignmentRepository.findById(project.assignmentId);
        
        // Get all versions
        const versions = await ProjectVersionRepository.getVersionsByProject(project._id);
        
        // Get feedback
        const feedback = await FeedbackRepository.getFinalFeedback(project._id);

        const criteriaDoc = await GradingCriteriaRepository.findByAssignmentId(project.assignmentId);
        const criteriaList = criteriaDoc?.criteria || [];
        
        // Create enriched project object
        const projectObj = project.toObject();
        projectObj.courseName = course?.courseName || 'N/A';
        projectObj.courseCode = course?.courseCode || 'N/A';
        projectObj.assignmentTitle = assignment?.title || 'N/A';
        
        ApiResponse.success(res, { 
            project: projectObj, 
            versions, 
            feedback,
            course: course,
            assignment: assignment,
            gradingCriteria: {
                criteria: criteriaList,
                totalWeight: criteriaDoc?.totalWeight || 0,
                passingGrade: criteriaDoc?.passingGrade ?? 60,
                hasCriteria: criteriaList.length > 0
            }
        }, 'Project detail retrieved');
    } catch (error) {
        console.error('Get project by ID error:', error);
        next(error);
    }
}



    // @desc    Create new project (linked to assignment)
    // @route   POST /api/student/projects
    async createProject(req, res, next) {
        try {
            const { title, description, assignmentId, department, year, section } = req.body;
            
            // Verify assignment exists
            const assignment = await AssignmentRepository.findById(assignmentId);
            if (!assignment) {
                return res.status(404).json({
                    success: false,
                    message: 'Assignment not found'
                });
            }
            
            // Get course from assignment
            const course = await CourseRepository.findById(assignment.courseId);

            const enrolledCourseIds = (req.user.assignedCourses || []).map((id) => id.toString());
            if (!enrolledCourseIds.includes(assignment.courseId.toString())) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not enrolled in this course'
                });
            }
            
            // Check if assignment is open
            const now = new Date();
            const openDate = new Date(assignment.openDate);
            const dueDate = new Date(assignment.dueDate);
            
            if (now < openDate) {
                return res.status(400).json({
                    success: false,
                    message: `Assignment opens on ${openDate.toLocaleDateString()}`
                });
            }
            
            // Check if student has already submitted
            const existingProject = await ProjectRepository.findOne({
                assignmentId: assignmentId,
                studentId: req.user._id,
                isActive: true,
                isLatest: true
            });
            
            if (existingProject) {
                // Create new version for resubmission
                const newVersionNumber = (existingProject.currentVersion || 0) + 1;
                
                const project = await ProjectRepository.create({
                    title,
                    description,
                    studentId: req.user._id,
                    studentName: req.user.name,
                    assignmentId: assignmentId,
                    courseId: assignment.courseId,
                    department: department || req.user.department,
                    year: year || req.user.year,
                    section: section || req.user.section,
                    semester: course?.semester,
                    status: 'pending',
                    currentVersion: newVersionNumber,
                    isLatest: true,
                    originalProjectId: existingProject._id,
                    isResubmission: true
                });
                
                // Mark old version as not latest
                await ProjectRepository.updateById(existingProject._id, { isLatest: false });
                
                ApiResponse.created(res, project, 'Resubmission created. Please upload files.');
                return;
            }
            
            // Create new project
            const project = await ProjectRepository.create({
                title,
                description,
                studentId: req.user._id,
                studentName: req.user.name,
                assignmentId: assignmentId,
                courseId: assignment.courseId,
                department: department || req.user.department,
                year: year || req.user.year,
                section: section || req.user.section,
                semester: course?.semester,
                status: 'pending',
                currentVersion: 1,
                isLatest: true,
                isResubmission: false
            });
            
            // Update assignment submission count
            await AssignmentRepository.updateById(assignmentId, {
                $inc: { totalSubmissions: 1 }
            });
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'CREATE_PROJECT', 'project', project._id,
                project.title, null, project,
                'Student created new project',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.created(res, project, 'Project created. Please upload files.');
        } catch (error) {
            console.error('Create project error:', error);
            next(error);
        }
    }

    // @desc    Update project metadata
    // @route   PUT /api/student/projects/:id
    // @desc    Update project metadata
// @route   PUT /api/student/projects/:id
async updateProject(req, res, next) {
    try {
        const { title, description } = req.body;
        
        const project = await ProjectRepository.findById(req.params.id);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.PROJECT_NOT_FOUND
            });
        }
        
        // ✅ FIX: Safely check student ownership
        const studentId = project.studentId?._id || project.studentId;
        if (studentId && studentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only update your own projects'
            });
        }
        
        const updated = await ProjectRepository.updateById(req.params.id, {
            title,
            description
        });
        
        ApiResponse.success(res, updated, 'Project updated successfully');
    } catch (error) {
        next(error);
    }
}

    // @desc    Delete project (soft delete)
    // @route   DELETE /api/student/projects/:id
    // @desc    Delete project (soft delete)
// @route   DELETE /api/student/projects/:id
async deleteProject(req, res, next) {
    try {
        const project = await ProjectRepository.findById(req.params.id);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.PROJECT_NOT_FOUND
            });
        }
        
        // ✅ FIX: Safely check student ownership
        const studentId = project.studentId?._id || project.studentId;
        if (studentId && studentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own projects'
            });
        }
        
        await ProjectRepository.updateById(req.params.id, { isActive: false });
        
        ApiResponse.success(res, null, SUCCESS_MESSAGES.PROJECT_DELETED);
    } catch (error) {
        next(error);
    }
}

    // ==================== FILE UPLOAD ====================

    // @desc    Upload project files
    // @route   POST /api/student/projects/:id/upload
async uploadProjectFiles(req, res, next) {
    try {
        const projectId = req.params.id;
        
        const project = await ProjectRepository.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        
        if (project.studentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const assignment = await AssignmentRepository.findById(project.assignmentId);
        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        const missingFiles = getMissingSubmissionFiles(assignment.requiredFiles, req.files || {});
        if (missingFiles.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required files: ${missingFiles.join(', ')}`
            });
        }
        
        const newVersionNumber = (project.currentVersion || 0) + 1;

        // Decide where to store files: Cloudinary (default) or local storage.
        // We **do not** modify Cloudinary's implementation, only choose which service to call.
        const useLocalStorage = process.env.FILE_STORAGE_PROVIDER === 'local';
        const uploadedFiles = useLocalStorage
            ? await localStorageService.uploadProjectFiles(req.files, projectId, newVersionNumber)
            : await cloudinaryService.uploadProjectFiles(req.files, projectId, newVersionNumber);
        
        // ==================== AI DEPENDENCY CHECK ====================
        let dependencyAnalysis = null;
        let healthScore = 100;
        let healthWarnings = [];
        
        // Check if dependency file was uploaded
        if (req.files.dependencyFile) {
            try {
                const depFile = req.files.dependencyFile[0];
                const fileContent = depFile.buffer.toString('utf8');
                const fileName = depFile.originalname;
                
                // Use GeminiDependencyService for analysis
                const GeminiDependencyService = require('../services/geminiDependency.service');
                const analysis = await GeminiDependencyService.analyzeFromFile(fileContent, fileName);
                const formatted = GeminiDependencyService.formatAnalysisResponse({
                    summary: analysis.summary,
                    dependencies: analysis.dependencies,
                    overallRecommendations: analysis.overallRecommendations,
                    _fallbackReason: analysis.fallbackReason,
                });

                if (analysis && analysis.success) {
                    dependencyAnalysis = {
                        source: formatted.source || analysis.source || 'ai',
                        hasDependencies: analysis.hasDependencies,
                        fileType: analysis.fileType,
                        summary: formatted.summary || analysis.summary,
                        dependencies: formatted.dependencies || analysis.dependencies,
                        recommendations: formatted.recommendations || [],
                        analyzedAt: formatted.analyzedAt || new Date(),
                        fallbackReason: formatted.fallbackReason || null,
                    };

                    healthScore = formatted.healthScore ?? analysis.summary?.healthScore ?? 100;
                    healthWarnings = (formatted.recommendations || []).map((r) =>
                        typeof r === 'string' ? r : r.message
                    );
                }
            } catch (depError) {
                console.error('Dependency analysis error:', depError);
                const normalized = GeminiDependencyService.normalizeDependencies(
                    GeminiDependencyService.parseDependencyFile(
                        req.files.dependencyFile[0].buffer.toString('utf8'),
                        req.files.dependencyFile[0].originalname
                    ) || []
                );
                const fallback = GeminiDependencyService.getEnhancedFallbackAnalysis(normalized);
                const formatted = GeminiDependencyService.formatAnalysisResponse(fallback);
                dependencyAnalysis = {
                    source: 'local-fallback',
                    hasDependencies: normalized.length > 0,
                    summary: formatted.summary,
                    dependencies: formatted.dependencies,
                    recommendations: formatted.recommendations,
                    analyzedAt: new Date(),
                    error: depError.message,
                };
                healthScore = formatted.healthScore ?? 100;
                healthWarnings = formatted.recommendations.map((r) => r.message);
            }
        } else {
            healthWarnings.push('No dependency file provided. Recommended: package.json or requirements.txt');
        }
        
        // Create version with dependency analysis
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
            isLatest: true,
            // ✅ Add dependency analysis to version
            dependencies: (dependencyAnalysis?.dependencies || []).map((d) => ({
                name: d.name,
                version: d.currentVersion || d.version,
                isDeprecated: d.status && d.status !== 'up_to_date',
                latestVersion: d.latestVersion,
                suggestion: d.recommendation || d.fixCommand,
                severity: d.status === 'up_to_date' ? 'low' : d.status,
            })),
            codeHealthScore: dependencyAnalysis ? healthScore : null,
            healthWarnings: healthWarnings,
            dependencyAnalysis: dependencyAnalysis || null,
        });
        
        await ProjectVersionRepository.updateMany(
            { projectId, isLatest: true, _id: { $ne: version._id } },
            { isLatest: false }
        );
        
        // Create or update submission record for teacher view
        const Submission = require('../models/Submission.model');
        
        // Calculate if submission is late
        let isLate = false;
        let daysLate = 0;
        
        if (assignment) {
            const dueDate = new Date(assignment.dueDate);
            const now = new Date();
            if (now > dueDate) {
                isLate = true;
                const diffTime = Math.abs(now - dueDate);
                daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
        }
        
        // Check if submission already exists
        let submission = await Submission.findOne({
            assignmentId: project.assignmentId,
            studentId: req.user._id
        });
        
        if (submission) {
            // Update existing submission
            submission.projectId = projectId;
            submission.submittedAt = new Date();
            submission.status = 'submitted';
            submission.versionNumber = newVersionNumber;
            submission.isLate = isLate;
            submission.daysLate = daysLate;
            submission.files = {
                codeZipUrl: uploadedFiles.codeZip?.secure_url || null,
                srsPdfUrl: uploadedFiles.srsPdf?.secure_url || null,
                designPdfUrl: uploadedFiles.designPdf?.secure_url || null,
                manualPdfUrl: uploadedFiles.manualPdf?.secure_url || null,
                presentationPdfUrl: uploadedFiles.presentationPdf?.secure_url || null,
                videoFileUrl: uploadedFiles.videoFile?.secure_url || null
            };
            await submission.save();
        } else {
            // Create new submission
            submission = await Submission.create({
                assignmentId: project.assignmentId,
                studentId: req.user._id,
                projectId: projectId,
                submittedAt: new Date(),
                isLate: isLate,
                daysLate: daysLate,
                files: {
                    codeZipUrl: uploadedFiles.codeZip?.secure_url || null,
                    srsPdfUrl: uploadedFiles.srsPdf?.secure_url || null,
                    designPdfUrl: uploadedFiles.designPdf?.secure_url || null,
                    manualPdfUrl: uploadedFiles.manualPdf?.secure_url || null,
                    presentationPdfUrl: uploadedFiles.presentationPdf?.secure_url || null,
                    videoFileUrl: uploadedFiles.videoFile?.secure_url || null
                },
                status: 'submitted',
                versionNumber: newVersionNumber
            });
        }
        
        // Update project
        await ProjectRepository.updateById(projectId, {
            currentVersion: newVersionNumber,
            status: 'submitted',
            submittedAt: new Date(),
            codeHealthScore: healthScore,
            healthWarnings: healthWarnings
        });
        
        // Update assignment submission count
        if (assignment) {
            await AssignmentRepository.updateById(project.assignmentId, {
                $inc: { totalSubmissions: 1 }
            });
        }
        
        ApiResponse.success(res, {
            version,
            project,
            submission,
            files: {
                codeZip: uploadedFiles.codeZip?.secure_url,
                srsPdf: uploadedFiles.srsPdf?.secure_url
            },
            // ✅ Include AI analysis in response
            aiAnalysis: {
                hasDependencies: dependencyAnalysis?.hasDependencies || false,
                healthScore: healthScore,
                recommendations: healthWarnings,
                details: dependencyAnalysis
            }
        }, 'Project uploaded successfully with AI dependency check');
        
    } catch (error) {
        console.error('Upload error:', error);
        next(error);
    }
}

    // ==================== VERSION MANAGEMENT ====================

    // @desc    Get project versions
    // @route   GET /api/student/projects/:id/versions
// @desc    Get project versions
// @route   GET /api/student/projects/:id/versions
async getProjectVersions(req, res, next) {
    try {
        const project = await ProjectRepository.findById(req.params.id);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.PROJECT_NOT_FOUND
            });
        }
        
        // Check ownership
        if (project.studentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        const versions = await ProjectVersionRepository.getVersionsByProject(project._id);
        ApiResponse.success(res, versions, 'Versions retrieved');
    } catch (error) {
        console.error('Get project versions error:', error);
        next(error);
    }
}

    // ==================== FEEDBACK & GRADE ====================

    // @desc    Get my feedback
    // @route   GET /api/student/feedback
    async getMyFeedback(req, res, next) {
        try {
            const feedbacks = await FeedbackRepository.getFeedbackByStudent(req.user._id);

            const courseIds = [...new Set(
                feedbacks.map((fb) => fb.project?.courseId).filter(Boolean)
            )];
            const assignmentIds = [...new Set(
                feedbacks.map((fb) => fb.project?.assignmentId).filter(Boolean)
            )];

            const [courses, assignments] = await Promise.all([
                courseIds.length
                    ? CourseRepository.findAll({ _id: { $in: courseIds } })
                    : [],
                assignmentIds.length
                    ? AssignmentRepository.findAll({ _id: { $in: assignmentIds } })
                    : []
            ]);

            const courseMap = new Map(courses.map((c) => [c._id.toString(), c]));
            const assignmentMap = new Map(assignments.map((a) => [a._id.toString(), a]));

            const enriched = feedbacks.map((fb) => {
                const project = fb.project || {};
                const courseId = project.courseId?.toString?.() || project.courseId;
                const assignmentId = project.assignmentId?.toString?.() || project.assignmentId;
                const course = courseId ? courseMap.get(courseId.toString()) : null;
                const assignment = assignmentId ? assignmentMap.get(assignmentId.toString()) : null;

                return {
                    _id: fb._id,
                    projectId: project._id || fb.projectId,
                    grade: fb.grade,
                    feedbackText: fb.feedbackText,
                    criterionScores: fb.criterionScores || [],
                    teacherName: fb.teacherName,
                    createdAt: fb.createdAt,
                    codeQualityScore: fb.codeQualityScore,
                    documentationScore: fb.documentationScore,
                    libraryUsageScore: fb.libraryUsageScore,
                    revisionRequested: fb.revisionRequested,
                    revisionNotes: fb.revisionNotes,
                    project: {
                        _id: project._id || fb.projectId,
                        title: project.title || 'Untitled Project',
                        status: project.status,
                        courseName: course?.courseName || 'N/A',
                        courseCode: course?.courseCode || '',
                        courseId: course?._id || courseId,
                        assignmentTitle: assignment?.title || 'N/A',
                        assignmentId: assignment?._id || assignmentId
                    }
                };
            });

            ApiResponse.success(res, enriched, 'Feedback retrieved');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Get feedback for specific project
    // @route   GET /api/student/projects/:id/feedback
// @desc    Get feedback for specific project
// @route   GET /api/student/projects/:id/feedback
async getProjectFeedback(req, res, next) {
    try {
        const project = await ProjectRepository.findById(req.params.id);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.PROJECT_NOT_FOUND
            });
        }
        
        // Check ownership
        if (project.studentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        const feedback = await FeedbackRepository.getFinalFeedback(project._id);
        ApiResponse.success(res, feedback, 'Feedback retrieved');
    } catch (error) {
        console.error('Get project feedback error:', error);
        next(error);
    }
}
    // ==================== SEARCH ====================

    // @desc    Search my projects
    // @route   GET /api/student/search
    async searchMyProjects(req, res, next) {
        try {
            const { keyword } = req.query;
            
            const projects = await ProjectRepository.searchProjects(keyword, {
                studentId: req.user._id
            });
            
            ApiResponse.success(res, projects, 'Search results');
        } catch (error) {
            next(error);
        }
    }

    // ==================== DOWNLOAD ====================

    // @desc    Download project files
    // @route   GET /api/student/projects/:id/download
// @desc    Download project files
// @route   GET /api/student/projects/:id/download
async downloadProject(req, res, next) {
    try {
        const project = await ProjectRepository.findById(req.params.id);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.PROJECT_NOT_FOUND
            });
        }
        
        // Check ownership
        if (project.studentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only download your own projects'
            });
        }
        
        const latestVersion = await ProjectVersionRepository.getLatestVersion(project._id);
        
        ApiResponse.success(res, {
            codeZipUrl: latestVersion?.codeZipUrl,
            srsPdfUrl: latestVersion?.srsPdfUrl,
            designPdfUrl: latestVersion?.designPdfUrl,
            manualPdfUrl: latestVersion?.manualPdfUrl
        }, 'Download links ready');
    } catch (error) {
        console.error('Download project error:', error);
        next(error);
    }
}

// @desc    Get student profile
// @route   GET /api/student/profile
async getProfile(req, res, next) {
    try {
        const student = await UserRepository.findById(req.user._id, { select: '-password' });
        ApiResponse.success(res, student, 'Profile retrieved successfully');
    } catch (error) {
        next(error);
    }
}

// @desc    Update student profile
// @route   PUT /api/student/profile
async updateProfile(req, res, next) {
    try {
        const { name, phone, address, department, year, section } = req.body;
        
        const updatedUser = await UserRepository.updateById(req.user._id, {
            name: name || req.user.name,
            phone: phone || req.user.phone,
            address: address || req.user.address,
            department: department || req.user.department,
            year: year || req.user.year,
            section: section || req.user.section
        });
        
        const userData = updatedUser.toObject();
        delete userData.password;
        
        ApiResponse.success(res, userData, 'Profile updated successfully');
    } catch (error) {
        next(error);
    }
}

// @desc    Get student stats
// @route   GET /api/student/stats
async getStats(req, res, next) {
    try {
        const projects = await ProjectRepository.findAll({
            studentId: req.user._id,
            isActive: true
        });
        
        const graded = projects.filter(p => p.grade);
        const avgGrade = graded.length > 0 
            ? Math.round(graded.reduce((sum, p) => sum + p.grade, 0) / graded.length)
            : 0;
        
        ApiResponse.success(res, {
            totalProjects: projects.length,
            averageGrade: avgGrade,
            completedProjects: projects.filter(p => p.status === 'approved' || p.status === 'graded').length,
            pendingProjects: projects.filter(p => p.status === 'pending').length,
            revisionProjects: projects.filter(p => p.status === 'revision').length,
            gradedProjects: graded.length
        }, 'Stats retrieved successfully');
    } catch (error) {
        next(error);
    }
}

    // @desc    Get saved AI analyses for all project versions
    // @route   GET /api/student/projects/:id/ai-analyses
    async getProjectAiAnalyses(req, res, next) {
        try {
            const project = await ProjectRepository.findById(req.params.id);
            if (!project) {
                return res.status(404).json({ success: false, message: ERROR_MESSAGES.PROJECT_NOT_FOUND });
            }
            if (project.studentId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            const versions = await ProjectVersionRepository.getVersionsByProject(project._id);
            const analyses = versions
                .map(mapVersionAiAnalysis)
                .filter(Boolean);

            ApiResponse.success(res, analyses, 'AI analyses retrieved');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Run Gemini analysis for a version and save result
    // @route   POST /api/student/projects/:id/versions/:versionId/analyze
    async analyzeProjectVersion(req, res, next) {
        try {
            const { id: projectId, versionId } = req.params;

            const project = await ProjectRepository.findById(projectId);
            if (!project) {
                return res.status(404).json({ success: false, message: ERROR_MESSAGES.PROJECT_NOT_FOUND });
            }
            if (project.studentId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            const version = await ProjectVersionRepository.findById(versionId);
            if (!version || version.projectId.toString() !== projectId) {
                return res.status(404).json({ success: false, message: 'Version not found for this project' });
            }

            const rawDependencies = version.dependencies || [];
            if (!rawDependencies.length) {
                return res.status(400).json({
                    success: false,
                    message: 'No dependency data in this version. Upload package.json or requirements.txt with your project files.'
                });
            }

            const normalizedDependencies = GeminiDependencyService.normalizeDependencies(rawDependencies);

            let rawAnalysis;
            try {
                rawAnalysis = await GeminiDependencyService.analyzeWithAi(normalizedDependencies);
            } catch (error) {
                if (!(await GeminiDependencyService._allowsLocalFallback())) throw error;
                rawAnalysis = GeminiDependencyService.getEnhancedFallbackAnalysis(normalizedDependencies);
                rawAnalysis._fallbackReason = error.message;
            }

            const formatted = GeminiDependencyService.formatAnalysisResponse(rawAnalysis);

            await ProjectVersionRepository.saveAiAnalysis(versionId, formatted);

            if (version.isLatest) {
                await ProjectRepository.updateById(projectId, {
                    codeHealthScore: formatted.healthScore,
                    healthWarnings: formatted.recommendations.map((r) => r.message)
                });
            }

            ApiResponse.success(res, {
                ...formatted,
                versionId,
                versionNumber: version.versionNumber,
                submittedAt: version.submittedAt,
                isLatest: version.isLatest
            }, 'AI analysis saved successfully');
        } catch (error) {
            console.error('Analyze project version error:', error);
            const status = error.code?.startsWith('AI_') || error.code?.startsWith('GEMINI') ? 503 : 500;
            return res.status(status).json({
                success: false,
                message: error.message || `${require('../utils/fameBrand.util').FAME} analysis failed`
            });
        }
    }


}

module.exports = new StudentController();