const ProjectRepository = require('../repositories/project.repository');
const ProjectVersionRepository = require('../repositories/projectVersion.repository');
const FeedbackRepository = require('../repositories/feedback.repository');
const AuditLogRepository = require('../repositories/auditLog.repository');
const ApiResponse = require('../utils/apiResponse.util');
const { enrichProjectRecord } = require('../utils/enrichProject.util');
const { PROJECT_STATUS } = require('../constants/status.constant');

class ProjectController {
    // ==================== ADMIN ONLY ====================
    
    // @desc    Delete project - Admin only
    // @route   DELETE /api/projects/admin/:id
    async deleteProject(req, res, next) {
        try {
            const project = await ProjectRepository.deleteById(req.params.id);
            
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Project not found'
                });
            }
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'DELETE_PROJECT', 'project', project._id,
                project.title, project, null,
                'Admin deleted project',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.success(res, null, 'Project deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    // ==================== TEACHER & ADMIN ====================
    
    // @desc    Get projects assigned to teacher
    // @route   GET /api/projects/teacher
    async getTeacherProjects(req, res, next) {
        try {
            const { status, page = 1, limit = 20 } = req.query;
            
            // Get courses taught by this teacher
            const CourseRepository = require('../repositories/course.repository');
            const courses = await CourseRepository.getCoursesByTeacher(req.user._id);
            const courseIds = courses.map(c => c._id);
            
            const filter = { courseId: { $in: courseIds } };
            if (status) filter.status = status;
            
            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            const projects = await ProjectRepository.findAll(filter, {
                skip,
                limit: parseInt(limit),
                sort: { submittedAt: -1 },
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

    // @desc    Grade a project
    // @route   PUT /api/projects/teacher/:id/grade
    async gradeProject(req, res, next) {
        try {
            const { grade, feedback, codeQualityScore, documentationScore, libraryUsageScore } = req.body;
            
            const project = await ProjectRepository.findById(req.params.id);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Project not found'
                });
            }
            
            // Get latest version
            const latestVersion = await ProjectVersionRepository.getLatestVersion(project._id);
            
            // Save feedback
            const feedbackData = await FeedbackRepository.saveFeedback(
                project._id,
                latestVersion?._id,
                req.user._id,
                {
                    teacherName: req.user.name,
                    feedbackText: feedback,
                    grade,
                    codeQualityScore,
                    documentationScore,
                    libraryUsageScore,
                    isFinal: true,
                    isPublished: true,
                    publishedAt: new Date()
                }
            );
            
            // Update project with grade
            await ProjectRepository.updateById(project._id, {
                grade,
                teacherFeedback: feedback,
                gradedBy: req.user._id,
                gradedAt: new Date(),
                status: 'graded'
            });
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'GRADE_PROJECT', 'project', project._id,
                project.title, null, { grade, feedback },
                'Teacher graded project',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.success(res, feedbackData, 'Grade saved successfully');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Approve project
    // @route   PUT /api/projects/teacher/:id/approve
    async approveProject(req, res, next) {
        try {
            const { notes } = req.body;
            
            const project = await ProjectRepository.updateStatus(req.params.id, 'approved', req.user._id);
            
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Project not found'
                });
            }
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'APPROVE_PROJECT', 'project', project._id,
                project.title, null, { status: 'approved', notes },
                'Teacher approved project',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.success(res, project, 'Project approved successfully');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Reject project
    // @route   PUT /api/projects/teacher/:id/reject
    async rejectProject(req, res, next) {
        try {
            const { reason } = req.body;
            
            const project = await ProjectRepository.updateStatus(req.params.id, 'rejected', req.user._id);
            
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Project not found'
                });
            }
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'REJECT_PROJECT', 'project', project._id,
                project.title, null, { status: 'rejected', reason },
                'Teacher rejected project',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.success(res, project, 'Project rejected successfully');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Request revision
    // @route   PUT /api/projects/teacher/:id/revision
    async requestRevision(req, res, next) {
        try {
            const { revisionNotes } = req.body;
            
            const project = await ProjectRepository.updateStatus(req.params.id, 'revision', req.user._id);
            
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Project not found'
                });
            }
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'REQUEST_REVISION', 'project', project._id,
                project.title, null, { status: 'revision', revisionNotes },
                'Teacher requested revision',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.success(res, { project, revisionNotes }, 'Revision requested successfully');
        } catch (error) {
            next(error);
        }
    }

    // ==================== ALL AUTHENTICATED USERS ====================
    
    // @desc    Get all projects (with filters)
    // @route   GET /api/projects
    async getAllProjects(req, res, next) {
        try {
            const { 
                search,
                department, 
                year, 
                section, 
                status, 
                page = 1, 
                limit = 20,
                sort = 'submittedAt',
                order = 'desc'
            } = req.query;
            
            let filter = {};
            
            // Search functionality
            if (search && search.trim()) {
                const searchRegex = new RegExp(search.trim(), 'i');
                filter.$or = [
                    { title: searchRegex },
                    { description: searchRegex },
                    { studentName: searchRegex }
                ];
            }
            
            // Filters
            if (department) filter.department = department;
            if (year) filter.year = parseInt(year);
            if (section) filter.section = section;
            if (status) filter.status = status;
            
            // Pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const limitNum = parseInt(limit);
            
            // Sorting
            const sortOrder = order === 'asc' ? 1 : -1;
            const sortOptions = { [sort]: sortOrder };
            
            const projects = await ProjectRepository.findAll(filter, {
                skip,
                limit: limitNum,
                sort: sortOptions,
                populate: ['studentId', 'courseId']
            });

            const enrichedProjects = await Promise.all(
                projects.map(async (project) => {
                    const latest = await ProjectVersionRepository.getLatestVersion(project._id);
                    const data = await enrichProjectRecord(project);
                    return {
                        ...data,
                        codeHealthScore: latest?.codeHealthScore ?? null,
                        versionCount: latest?.versionNumber ?? data.currentVersion ?? 0,
                        latestCodeZipUrl: latest?.codeZipUrl ?? null,
                    };
                })
            );

            let filteredProjects = enrichedProjects;
            const { minHealth, maxHealth } = req.query;
            if (minHealth !== undefined || maxHealth !== undefined) {
                filteredProjects = enrichedProjects.filter((project) => {
                    const score = project.codeHealthScore ?? 100;
                    if (minHealth !== undefined && score < parseInt(minHealth, 10)) return false;
                    if (maxHealth !== undefined && score > parseInt(maxHealth, 10)) return false;
                    return true;
                });
            }

            const total = await ProjectRepository.count(filter);

            ApiResponse.paginated(res, filteredProjects, {
                page: parseInt(page),
                limit: limitNum,
                total
            }, 'Projects retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Get single project
    // @route   GET /api/projects/:id
    async getProjectById(req, res, next) {
        try {
            const project = await ProjectRepository.findById(req.params.id, {
                populate: ['studentId', 'courseId', 'assignmentId', 'gradedBy']
            });
            
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Project not found'
                });
            }
            
            const versions = await ProjectVersionRepository.getVersionsByProject(project._id);
            const feedback = await FeedbackRepository.getFinalFeedback(project._id);
            const enrichedProject = await enrichProjectRecord(project);
            const latestVersion = versions.find((v) => v.isLatest) || versions[0] || null;

            if (latestVersion) {
                enrichedProject.codeHealthScore = latestVersion.codeHealthScore ?? null;
                enrichedProject.versionCount = versions.length || enrichedProject.currentVersion || 0;
            }

            if (feedback) {
                enrichedProject.teacherFeedback =
                    enrichedProject.teacherFeedback || feedback.feedbackText || null;
                enrichedProject.grade = enrichedProject.grade ?? feedback.grade ?? null;
                enrichedProject.gradedByName =
                    enrichedProject.gradedByName || feedback.teacherName || null;
            }

            ApiResponse.success(res, {
                project: enrichedProject,
                versions,
                feedback,
                latestVersion,
            }, 'Project retrieved');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Download project files (admin/teacher: any project; student: own only)
    // @route   GET /api/projects/:id/download
    async downloadProject(req, res, next) {
        try {
            const project = await ProjectRepository.findById(req.params.id);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Project not found'
                });
            }

            if (req.user.role === 'student') {
                const ownerId = project.studentId?.toString?.() || String(project.studentId);
                if (ownerId !== req.user._id.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: 'You can only download your own projects'
                    });
                }
            }

            const latestVersion = await ProjectVersionRepository.getLatestVersion(project._id);
            const versions = await ProjectVersionRepository.getVersionsByProject(project._id);

            ApiResponse.success(res, {
                projectId: project._id,
                title: project.title,
                latestVersion: latestVersion?.versionNumber ?? null,
                codeZipUrl: latestVersion?.codeZipUrl ?? null,
                srsPdfUrl: latestVersion?.srsPdfUrl ?? null,
                designPdfUrl: latestVersion?.designPdfUrl ?? null,
                manualPdfUrl: latestVersion?.manualPdfUrl ?? null,
                versions: versions.map((v) => ({
                    versionNumber: v.versionNumber,
                    isLatest: v.isLatest,
                    submittedAt: v.submittedAt,
                    codeZipUrl: v.codeZipUrl,
                    srsPdfUrl: v.srsPdfUrl,
                    designPdfUrl: v.designPdfUrl,
                    manualPdfUrl: v.manualPdfUrl,
                })),
            }, 'Download links ready');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Compare two versions
    // @route   POST /api/projects/:projectId/compare
    async compareVersions(req, res, next) {
        try {
            const { versionA, versionB } = req.body;
            
            const comparison = await ProjectVersionRepository.compareVersions(
                req.params.projectId,
                versionA,
                versionB
            );
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'COMPARE_VERSIONS', 'project', req.params.projectId,
                null, null, { versionA, versionB },
                'User compared project versions',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.success(res, comparison, 'Version comparison completed');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Get project statistics
    // @route   GET /api/projects/stats/summary
    async getProjectStats(req, res, next) {
        try {
            const { department } = req.query;
            
            const stats = await ProjectRepository.getProjectStats(department);
            const totalProjects = await ProjectRepository.count(department ? { department } : {});
            
            ApiResponse.success(res, {
                totalProjects,
                statusBreakdown: stats,
                department: department || 'all'
            }, 'Project statistics retrieved');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Search projects
    // @route   GET /api/projects/search/:keyword
    async searchProjects(req, res, next) {
        try {
            const { keyword } = req.params;
            const { department, year, section, status } = req.query;
            
            const filters = {};
            if (department) filters.department = department;
            if (year) filters.year = parseInt(year);
            if (section) filters.section = section;
            if (status) filters.status = status;
            
            const projects = await ProjectRepository.searchProjects(keyword, filters);
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'SEARCH_PROJECTS', 'project', null,
                keyword, null, { keyword, filters, resultCount: projects.length },
                'User searched projects',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.success(res, projects, `Found ${projects.length} projects matching "${keyword}"`);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ProjectController();