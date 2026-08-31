const ProjectRepository = require('../repositories/project.repository');
const ProjectVersionRepository = require('../repositories/projectVersion.repository');
const CourseRepository = require('../repositories/course.repository');
const FeedbackRepository = require('../repositories/feedback.repository');
const UserRepository = require('../repositories/user.repository');
const AuditLogRepository = require('../repositories/auditLog.repository');
const AssignmentRepository = require('../repositories/assignment.repository');
const SubmissionRepository = require('../repositories/submission.repository');
const GradingCriteriaRepository = require('../repositories/criteria.repository');
const ApiResponse = require('../utils/apiResponse.util');
const GeminiDependencyService = require('../services/geminiDependency.service');
const { PROJECT_STATUS } = require('../constants/status.constant');
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../constants/messages.constant');

class TeacherController {
    // ==================== PROJECT MANAGEMENT ====================

async getMyProjects(req, res, next) {
    try {
        const { status, assignmentId, studentId, page = 1, limit = 20 } = req.query;
        
        // Get courses taught by this teacher
        const courses = await CourseRepository.getCoursesByTeacher(req.user._id);
        const courseIds = courses.map(c => c._id);
        
        // Get assignments for these courses
        const assignments = await AssignmentRepository.findAll(
            { courseId: { $in: courseIds } },
            { select: '_id' }
        );
        const assignmentIds = assignments.map(a => a._id);
        
        if (assignmentIds.length === 0) {
            return ApiResponse.paginated(res, [], { page: 1, limit: 20, total: 0 }, 'No projects assigned');
        }
        
        const filter = { assignmentId: { $in: assignmentIds }, isLatest: true };
        if (status) filter.status = status;
        if (assignmentId) filter.assignmentId = assignmentId;
        if (studentId) filter.studentId = studentId;
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const projects = await ProjectRepository.findAll(filter, {
            skip,
            limit: parseInt(limit),
            sort: { submittedAt: -1 },
            populate: ['studentId', 'assignmentId', 'courseId']
        });
        
        // Add assignment title to each project
        const projectsWithDetails = await Promise.all(projects.map(async (project) => {
            const assignment = await AssignmentRepository.findById(project.assignmentId);
            return {
                ...project.toObject(),
                assignmentTitle: assignment?.title || 'N/A'
            };
        }));
        
        const total = await ProjectRepository.count(filter);
        
        ApiResponse.paginated(res, projectsWithDetails, {
            page: parseInt(page),
            limit: parseInt(limit),
            total
        }, 'Projects retrieved successfully');
    } catch (error) {
        console.error('Error in getMyProjects:', error);
        next(error);
    }
}


    async getProjectById(req, res, next) {
        try {
            const project = await ProjectRepository.findById(req.params.id, {
                populate: ['studentId', 'courseId', 'assignmentId']
            });
            
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.PROJECT_NOT_FOUND
                });
            }
            
            const course = await CourseRepository.findById(project.courseId);
            if (course && course.teacherId.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to this project'
                });
            }

            const latestFeedback = await FeedbackRepository.getLatestFeedback(project._id);
            const assignment = await AssignmentRepository.findById(project.assignmentId);
            const projectData = project.toObject ? project.toObject() : project;

            ApiResponse.success(res, {
                ...projectData,
                assignmentTitle: assignment?.title || null,
                latestFeedback: latestFeedback ? {
                    grade: latestFeedback.grade,
                    feedbackText: latestFeedback.feedbackText,
                    criterionScores: latestFeedback.criterionScores || []
                } : null
            }, 'Project retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getProjectHealth(req, res, next) {
        try {
            const project = await ProjectRepository.findById(req.params.id);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.PROJECT_NOT_FOUND
                });
            }
            
            const latestVersion = await ProjectVersionRepository.findOne({ 
                projectId: project._id, 
                isLatest: true 
            });
            
            ApiResponse.success(res, {
                healthScore: latestVersion?.codeHealthScore || project.codeHealthScore || 100,
                dependencies: latestVersion?.dependencies || project.dependencies || [],
                warnings: latestVersion?.healthWarnings || project.healthWarnings || []
            }, 'Project health report');
        } catch (error) {
            next(error);
        }
    }

    // ==================== GRADING & FEEDBACK ====================

    async gradeProject(req, res, next) {
        try {
            const { feedback, criterionScores } = req.body;
            
            const project = await ProjectRepository.findById(req.params.id);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.PROJECT_NOT_FOUND
                });
            }

            const course = await CourseRepository.findById(project.courseId);
            if (course && course.teacherId.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to grade this project'
                });
            }

            const criteriaDoc = await GradingCriteriaRepository.findByAssignmentId(project.assignmentId);
            if (!criteriaDoc?.criteria?.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Grading criteria must be set up for this assignment before grading projects'
                });
            }

            if (!Array.isArray(criterionScores) || criterionScores.length !== criteriaDoc.criteria.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Scores are required for every grading criterion'
                });
            }

            let grade = 0;
            const normalizedScores = [];
            for (const criterion of criteriaDoc.criteria) {
                const submitted = criterionScores.find((s) => s.name === criterion.name);
                if (!submitted || submitted.score == null) {
                    return res.status(400).json({
                        success: false,
                        message: `Missing score for criterion: ${criterion.name}`
                    });
                }
                const score = Number(submitted.score);
                if (Number.isNaN(score) || score < 0 || score > 100) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid score for criterion: ${criterion.name}`
                    });
                }
                grade += (score * criterion.weight) / 100;
                normalizedScores.push({
                    name: criterion.name,
                    weight: criterion.weight,
                    score,
                    maxScore: criterion.maxScore || 100
                });
            }
            grade = Math.round(grade);
            
            let latestVersion = await ProjectVersionRepository.findOne({ 
                projectId: project._id, 
                isLatest: true 
            });
            
            let versionId;
            if (latestVersion) {
                versionId = latestVersion._id;
            } else {
                const newVersion = await ProjectVersionRepository.create({
                    projectId: project._id,
                    versionNumber: 1,
                    codeZipUrl: null,
                    srsPdfUrl: null,
                    submittedBy: req.user._id,
                    isLatest: true,
                    submittedAt: new Date()
                });
                versionId = newVersion._id;
            }
            
            const feedbackData = await FeedbackRepository.saveFeedback(
                project._id,
                versionId,
                req.user._id,
                {
                    teacherName: req.user.name,
                    feedbackText: feedback,
                    grade,
                    criterionScores: normalizedScores,
                    isFinal: true,
                    isPublished: true,
                    publishedAt: new Date()
                }
            );
            
            await ProjectRepository.updateGradeAndFeedback(
                project._id,
                grade,
                feedback,
                req.user._id
            );
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'GRADE_PROJECT', 'project', project._id,
                project.title, null, { grade, feedback, criterionScores: normalizedScores },
                'Teacher graded project',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.success(res, feedbackData, SUCCESS_MESSAGES.GRADE_SAVED);
        } catch (error) {
            console.error('Grade project error:', error);
            next(error);
        }
    }

    async approveProject(req, res, next) {
        try {
            const { notes } = req.body;
            
            const project = await ProjectRepository.updateStatus(req.params.id, PROJECT_STATUS.APPROVED, req.user._id);
            
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.PROJECT_NOT_FOUND
                });
            }
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'APPROVE_PROJECT', 'project', project._id,
                project.title, null, { status: PROJECT_STATUS.APPROVED, notes },
                'Teacher approved project',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.success(res, project, SUCCESS_MESSAGES.PROJECT_APPROVED);
        } catch (error) {
            next(error);
        }
    }

    async rejectProject(req, res, next) {
        try {
            const { notes } = req.body;
            
            const project = await ProjectRepository.updateStatus(req.params.id, PROJECT_STATUS.REJECTED, req.user._id);
            
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.PROJECT_NOT_FOUND
                });
            }
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'REJECT_PROJECT', 'project', project._id,
                project.title, null, { status: PROJECT_STATUS.REJECTED, notes },
                'Teacher rejected project',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.success(res, project, SUCCESS_MESSAGES.PROJECT_REJECTED);
        } catch (error) {
            next(error);
        }
    }

    async requestRevision(req, res, next) {
        try {
            const { revisionNotes } = req.body;
            
            const project = await ProjectRepository.updateStatus(req.params.id, PROJECT_STATUS.REVISION, req.user._id);
            
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.PROJECT_NOT_FOUND
                });
            }
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'REQUEST_REVISION', 'project', project._id,
                project.title, null, { status: PROJECT_STATUS.REVISION, revisionNotes },
                'Teacher requested revision',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.success(res, { project, revisionNotes }, SUCCESS_MESSAGES.REVISION_REQUESTED);
        } catch (error) {
            next(error);
        }
    }

    // ==================== FEEDBACK MANAGEMENT ====================

    async getMyFeedback(req, res, next) {
        try {
            const { limit = 100 } = req.query;
            const feedbacks = await FeedbackRepository.findAll(
                { teacherId: req.user._id },
                {
                    sort: { createdAt: -1 },
                    limit: parseInt(limit),
                    populate: {
                        path: 'projectId',
                        populate: [
                            { path: 'studentId', select: 'name studentId email' },
                            { path: 'assignmentId', select: 'title' },
                            { path: 'courseId', select: 'courseName name' }
                        ]
                    }
                }
            );
            ApiResponse.success(res, feedbacks, 'Feedback retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async updateFeedback(req, res, next) {
        try {
            const { feedbackText, grade, codeQualityScore, documentationScore, libraryUsageScore } = req.body;
            
            const feedback = await FeedbackRepository.findById(req.params.id);
            if (!feedback) {
                return res.status(404).json({
                    success: false,
                    message: 'Feedback not found'
                });
            }
            
            if (feedback.teacherId.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only update your own feedback'
                });
            }
            
            const updated = await FeedbackRepository.updateById(req.params.id, {
                feedbackText,
                grade,
                codeQualityScore,
                documentationScore,
                libraryUsageScore,
                updatedAt: new Date()
            });
            
            ApiResponse.success(res, updated, 'Feedback updated successfully');
        } catch (error) {
            next(error);
        }
    }

    // ==================== COURSE MANAGEMENT ====================

async getMyCourses(req, res, next) {
    try {
        const courses = await CourseRepository.getCoursesByTeacher(req.user._id);
        
        // Get stats for each course
        const coursesWithStats = await Promise.all(courses.map(async (course) => {
            // Get assignments for this course
            const assignments = await AssignmentRepository.findByCourseId(course._id);
            
            // Calculate submissions stats
            let totalSubmissions = 0;
            let totalGrades = 0;
            let gradedCount = 0;
            let pendingCount = 0;
            
            for (const assignment of assignments) {
                const submissions = await SubmissionRepository.findByAssignment(assignment._id);
                totalSubmissions += submissions.length;
                
                const graded = submissions.filter(s => s.grade);
                gradedCount += graded.length;
                totalGrades += graded.reduce((sum, s) => sum + (s.grade || 0), 0);
                
                const pending = submissions.filter(s => !s.grade && s.status === 'submitted');
                pendingCount += pending.length;
            }
            
            const avgGrade = gradedCount > 0 ? Math.round(totalGrades / gradedCount) : 0;
            
            // Get students enrolled in this course
            const students = await UserRepository.findAll({
                role: 'student',
                'assignedCourses': course._id
            }, { select: '-password' });
            
            return {
                ...course.toObject(),
                assignments: assignments.map(a => ({
                    _id: a._id,
                    title: a.title,
                    status: a.status,
                    dueDate: a.dueDate,
                    openDate: a.openDate
                })),
                assignmentsCount: assignments.length,
                submissionsCount: totalSubmissions,
                pendingSubmissions: pendingCount,
                avgGrade: avgGrade,
                studentCount: students.length,
                students: students
            };
        }));
        
        ApiResponse.success(res, coursesWithStats, 'Courses retrieved successfully');
    } catch (error) {
        next(error);
    }
}
    async getCourseById(req, res, next) {
        try {
            const course = await CourseRepository.findById(req.params.id);
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'Course not found'
                });
            }
            
            if (course.teacherId.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to this course'
                });
            }
            
            ApiResponse.success(res, course, 'Course retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async createCourse(req, res, next) {
        try {
            const { courseName, courseCode, description, department, year, section, semester, academicYear, credits, schedule } = req.body;
            
            const existingCourse = await CourseRepository.findOne({ courseCode });
            if (existingCourse) {
                return res.status(400).json({
                    success: false,
                    message: 'Course code already exists'
                });
            }
            
            const course = await CourseRepository.create({
                courseName,
                courseCode,
                description: description || '',
                department,
                year: parseInt(year),
                section,
                semester: semester || '1st',
                academicYear: academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
                credits: parseInt(credits) || 3,
                schedule: schedule || '',
                teacherId: req.user._id,
                isActive: true
            });
            
            ApiResponse.created(res, course, 'Course created successfully');
        } catch (error) {
            next(error);
        }
    }

    async updateCourse(req, res, next) {
        try {
            const course = await CourseRepository.findById(req.params.id);
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'Course not found'
                });
            }
            
            if (course.teacherId.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to update this course'
                });
            }
            
            const updatedCourse = await CourseRepository.updateById(req.params.id, req.body);
            ApiResponse.success(res, updatedCourse, 'Course updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async deleteCourse(req, res, next) {
        try {
            const course = await CourseRepository.findById(req.params.id);
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'Course not found'
                });
            }
            
            if (course.teacherId.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to delete this course'
                });
            }
            
            await CourseRepository.updateById(req.params.id, { isActive: false });
            ApiResponse.success(res, null, 'Course deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async getStudentsByCourse(req, res, next) {
        try {
            const course = await CourseRepository.findById(req.params.courseId);
            
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'Course not found'
                });
            }
            
            if (course.teacherId.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to this course'
                });
            }
            
            const students = await UserRepository.findAll(
                {
                    role: 'student',
                    isActive: true,
                    assignedCourses: course._id
                },
                { select: '-password', sort: { studentId: 1 } }
            );
            
            ApiResponse.success(res, students, 'Students retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /** Search existing student accounts (created by admin) available to enroll in a course */
    async searchStudentsForEnrollment(req, res, next) {
        try {
            const { search = '', courseId } = req.query;

            if (courseId) {
                const course = await CourseRepository.findById(courseId);
                if (!course) {
                    return res.status(404).json({ success: false, message: 'Course not found' });
                }
                if (course.teacherId.toString() !== req.user._id.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have access to this course'
                    });
                }
            }

            const filter = { role: 'student', isActive: true };
            const term = String(search).trim();
            if (term) {
                filter.$or = [
                    { name: { $regex: term, $options: 'i' } },
                    { email: { $regex: term, $options: 'i' } },
                    { studentId: { $regex: term, $options: 'i' } }
                ];
            }

            let students = await UserRepository.findAll(
                filter,
                { select: '-password', sort: { name: 1 }, limit: 50 }
            );

            if (courseId) {
                students = students.filter(
                    (s) => !(s.assignedCourses || []).some((id) => id.toString() === courseId.toString())
                );
            }

            ApiResponse.success(res, students, 'Students retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    // ==================== ASSIGNMENT MANAGEMENT ====================

async getAssignmentsByCourse(req, res, next) {
    try {
        const AssignmentRepository = require('../repositories/assignment.repository');
        const CourseRepository = require('../repositories/course.repository');
        const SubmissionRepository = require('../repositories/submission.repository');
        
        const { courseId } = req.params;
        
        // Verify course exists and teacher has access
        const course = await CourseRepository.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }
        
        if (course.teacherId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this course'
            });
        }
        
        const assignments = await AssignmentRepository.findByCourseId(courseId);
        
        // Get stats for each assignment
        const assignmentsWithStats = await Promise.all(assignments.map(async (assignment) => {
            const stats = await SubmissionRepository.getAssignmentStats(assignment._id);
            return {
                ...assignment.toObject(),
                submissionCount: stats.totalSubmissions,
                gradedCount: stats.gradedCount,
                pendingCount: stats.pendingCount,
                avgGrade: stats.avgGrade
            };
        }));
        
        ApiResponse.success(res, assignmentsWithStats, 'Assignments retrieved successfully');
    } catch (error) {
        next(error);
    }
}

    async getAssignmentById(req, res, next) {
        try {
            const assignment = await AssignmentRepository.findById(req.params.id);
            if (!assignment) {
                return res.status(404).json({
                    success: false,
                    message: 'Assignment not found'
                });
            }
            ApiResponse.success(res, assignment, 'Assignment retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async createAssignment(req, res, next) {
        try {
            const { 
                courseId, title, description, openDate, dueDate, 
                allowLate, latePenalty, maxLateDays, maxFileSize, requiredFiles 
            } = req.body;
            
            const course = await CourseRepository.findById(courseId);
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: 'Course not found'
                });
            }
            
            if (course.teacherId.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to create assignments for this course'
                });
            }
            
            if (new Date(openDate) >= new Date(dueDate)) {
                return res.status(400).json({
                    success: false,
                    message: 'Open date must be before due date'
                });
            }

            if (!Array.isArray(requiredFiles) || requiredFiles.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one required submission file must be selected'
                });
            }
            
            const assignment = await AssignmentRepository.create({
                courseId,
                title,
                description: description || '',
                openDate: new Date(openDate),
                dueDate: new Date(dueDate),
                allowLate: allowLate !== undefined ? allowLate : true,
                latePenalty: latePenalty || 10,
                maxLateDays: maxLateDays || 5,
                maxFileSize: maxFileSize || 200,
                requiredFiles: requiredFiles || ['code', 'srs', 'design'],
                status: 'published',
                totalSubmissions: 0,
                avgGrade: 0
            });
            
            ApiResponse.created(res, assignment, 'Assignment created successfully');
        } catch (error) {
            console.error('Create assignment error:', error);
            next(error);
        }
    }

    async updateAssignment(req, res, next) {
        try {
            const assignment = await AssignmentRepository.findById(req.params.id);
            if (!assignment) {
                return res.status(404).json({
                    success: false,
                    message: 'Assignment not found'
                });
            }
            
            if (req.body.requiredFiles && (!Array.isArray(req.body.requiredFiles) || req.body.requiredFiles.length === 0)) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one required submission file must be selected'
                });
            }
            
            const updatedAssignment = await AssignmentRepository.updateById(req.params.id, req.body);
            ApiResponse.success(res, updatedAssignment, 'Assignment updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async deleteAssignment(req, res, next) {
        try {
            const assignment = await AssignmentRepository.findById(req.params.id);
            if (!assignment) {
                return res.status(404).json({
                    success: false,
                    message: 'Assignment not found'
                });
            }
            
            await SubmissionRepository.deleteMany({ assignmentId: assignment._id });
            await GradingCriteriaRepository.deleteByAssignmentId(assignment._id);
            await AssignmentRepository.deleteById(req.params.id);
            
            ApiResponse.success(res, null, 'Assignment deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async getSubmissionsByAssignment(req, res, next) {
        try {
            const submissions = await SubmissionRepository.findByAssignment(req.params.assignmentId);
            ApiResponse.success(res, submissions, 'Submissions retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    // ==================== GRADING CRITERIA ====================

async getGradingCriteria(req, res, next) {
    try {
        const { assignmentId } = req.params;

        const assignment = await AssignmentRepository.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }

        const course = await CourseRepository.findById(assignment.courseId);
        if (!course || course.teacherId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this assignment'
            });
        }

        let criteria = await GradingCriteriaRepository.findByAssignmentId(assignmentId);

        if (!criteria) {
            criteria = {
                assignmentId,
                criteria: [],
                totalWeight: 0,
                passingGrade: 60
            };
        }

        ApiResponse.success(res, criteria, 'Grading criteria retrieved successfully');
    } catch (error) {
        next(error);
    }
}

    async updateGradingCriteria(req, res, next) {
        try {
            const { assignmentId } = req.params;
            const { criteria, passingGrade } = req.body;

            const assignment = await AssignmentRepository.findById(assignmentId);
            if (!assignment) {
                return res.status(404).json({
                    success: false,
                    message: 'Assignment not found'
                });
            }

            const course = await CourseRepository.findById(assignment.courseId);
            if (!course || course.teacherId.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to this assignment'
                });
            }

            const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
            if (totalWeight !== 100) {
                return res.status(400).json({
                    success: false,
                    message: `Total weight must be 100%. Currently: ${totalWeight}%`
                });
            }

            const updatedCriteria = await GradingCriteriaRepository.updateByAssignmentId(
                assignmentId,
                { criteria, passingGrade: passingGrade || 60, createdBy: req.user._id }
            );

            ApiResponse.success(res, updatedCriteria, 'Grading criteria saved successfully');
        } catch (error) {
            next(error);
        }
    }

    // ==================== SUBMISSION GRADING ====================

    async gradeSubmission(req, res, next) {
        try {
            const { id } = req.params;
            const { grade, feedback, scores } = req.body;
            
            const submission = await SubmissionRepository.findById(id);
            if (!submission) {
                return res.status(404).json({
                    success: false,
                    message: 'Submission not found'
                });
            }
            
            const updatedSubmission = await SubmissionRepository.updateById(id, {
                grade,
                feedback,
                scores: new Map(Object.entries(scores || {})),
                status: 'graded',
                gradedBy: req.user._id,
                gradedAt: new Date()
            });
            
            // Update assignment stats
            const assignment = await AssignmentRepository.findById(submission.assignmentId);
            if (assignment) {
                const stats = await SubmissionRepository.getAssignmentStats(assignment._id);
                await AssignmentRepository.updateById(assignment._id, {
                    avgGrade: stats.avgGrade,
                    totalSubmissions: stats.totalSubmissions
                });
            }
            
            ApiResponse.success(res, updatedSubmission, 'Grade submitted successfully');
        } catch (error) {
            next(error);
        }
    }

    async approveSubmission(req, res, next) {
        try {
            const submission = await SubmissionRepository.updateById(req.params.id, { status: 'approved' });
            if (!submission) {
                return res.status(404).json({
                    success: false,
                    message: 'Submission not found'
                });
            }
            ApiResponse.success(res, submission, 'Submission approved successfully');
        } catch (error) {
            next(error);
        }
    }

    async requestRevisionSubmission(req, res, next) {
        try {
            const { revisionNotes } = req.body;
            const submission = await SubmissionRepository.updateById(req.params.id, {
                status: 'revision',
                revisionNotes
            });
            
            if (!submission) {
                return res.status(404).json({
                    success: false,
                    message: 'Submission not found'
                });
            }
            
            ApiResponse.success(res, submission, 'Revision requested successfully');
        } catch (error) {
            next(error);
        }
    }

    // ==================== STUDENT MANAGEMENT ====================

    async createStudent(req, res, next) {
        return res.status(403).json({
            success: false,
            message: 'Student accounts are created by the administrator. Enroll an existing student into your course instead.'
        });
    }
    // ==================== GET ALL ASSIGNMENTS FOR TEACHER ====================
async getMyAssignments(req, res, next) {
    try {
        const AssignmentRepository = require('../repositories/assignment.repository');
        const CourseRepository = require('../repositories/course.repository');
        
        // Get all courses taught by this teacher
        const courses = await CourseRepository.getCoursesByTeacher(req.user._id);
        const courseIds = courses.map(c => c._id);
        
        // Get all assignments for these courses
        const assignments = await AssignmentRepository.findAll(
            { courseId: { $in: courseIds } },
            { sort: { dueDate: -1 }, populate: ['courseId'] }
        );
        
        // Add submission counts
        const SubmissionRepository = require('../repositories/submission.repository');
        const assignmentsWithStats = await Promise.all(assignments.map(async (assignment) => {
            const stats = await SubmissionRepository.getAssignmentStats(assignment._id);
            return {
                ...assignment.toObject(),
                submissionCount: stats.totalSubmissions,
                gradedCount: stats.gradedCount,
                pendingCount: stats.pendingCount,
                avgGrade: stats.avgGrade
            };
        }));
        
        ApiResponse.success(res, assignmentsWithStats, 'Assignments retrieved successfully');
    } catch (error) {
        next(error);
    }
}


// ==================== DEPENDENCY & HEALTH CHECK ====================

// @desc    Get project dependency analysis
// @route   GET /api/teacher/projects/:id/dependencies
async getProjectDependencies(req, res, next) {
    try {
        const project = await ProjectRepository.findById(req.params.id);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.PROJECT_NOT_FOUND
            });
        }
        
        // Get latest version
        const latestVersion = await ProjectVersionRepository.findOne({ 
            projectId: project._id, 
            isLatest: true 
        });
        
        if (!latestVersion || !latestVersion.dependencies) {
            return res.json({
                success: true,
                data: {
                    hasDependencies: false,
                    summary: { total: 0, healthScore: 100 },
                    dependencies: [],
                    recommendations: ['No dependency file found for this project']
                }
            });
        }
        
        // Return the stored dependency analysis
        ApiResponse.success(res, latestVersion.dependencies, 'Dependency analysis retrieved');
    } catch (error) {
        next(error);
    }
}

// @desc    Re-analyze dependencies with AI
// @route   POST /api/teacher/projects/:id/analyze-dependencies
async analyzeProjectDependencies(req, res, next) {
    try {
        const project = await ProjectRepository.findById(req.params.id);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.PROJECT_NOT_FOUND
            });
        }
        
        // Get latest version
        const latestVersion = await ProjectVersionRepository.findOne({ 
            projectId: project._id, 
            isLatest: true 
        });
        
        if (!latestVersion || !latestVersion.dependencies?.length) {
            return res.status(404).json({
                success: false,
                message: 'No dependency data found for this project. Student should upload package.json or requirements.txt.'
            });
        }

        const normalized = GeminiDependencyService.normalizeDependencies(latestVersion.dependencies);
        let rawAnalysis;
        try {
            rawAnalysis = await GeminiDependencyService.analyzeWithAi(normalized);
        } catch (error) {
            if (!(await GeminiDependencyService._allowsLocalFallback())) throw error;
            rawAnalysis = GeminiDependencyService.getEnhancedFallbackAnalysis(normalized);
            rawAnalysis._fallbackReason = error.message;
        }

        const formatted = GeminiDependencyService.formatAnalysisResponse(rawAnalysis);
        await ProjectVersionRepository.saveAiAnalysis(latestVersion._id, formatted);

        if (latestVersion.isLatest) {
            await ProjectRepository.updateById(project._id, {
                codeHealthScore: formatted.healthScore,
                healthWarnings: formatted.recommendations.map((r) => r.message),
            });
        }

        ApiResponse.success(res, formatted, 'Dependency re-analysis completed');
    } catch (error) {
        next(error);
    }
}

// @desc    Run quick health check on project
// @route   POST /api/teacher/projects/:id/health-check
async runHealthCheck(req, res, next) {
    try {
        const project = await ProjectRepository.findById(req.params.id);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.PROJECT_NOT_FOUND
            });
        }
        
        const latestVersion = await ProjectVersionRepository.findOne({ 
            projectId: project._id, 
            isLatest: true 
        });
        
        let healthScore = latestVersion?.codeHealthScore ?? project.codeHealthScore ?? 100;
        const warnings = [];
        const savedAnalysis = latestVersion?.dependencyAnalysis;

        if (savedAnalysis?.recommendations?.length) {
            savedAnalysis.recommendations.forEach((rec) => {
                warnings.push(typeof rec === 'string' ? rec : rec.message);
            });
        } else if (latestVersion?.healthWarnings?.length) {
            warnings.push(...latestVersion.healthWarnings);
        }

        ApiResponse.success(res, {
            healthScore,
            warnings,
            lastChecked: savedAnalysis?.analyzedAt || latestVersion?.updatedAt || new Date(),
            dependencies: latestVersion?.dependencies || [],
            dependencyAnalysis: savedAnalysis || null,
            source: savedAnalysis?.source || null,
        }, 'Health check completed');
    } catch (error) {
        next(error);
    }
}

// Add these methods to TeacherController class

// @desc    Get all students (for this teacher's courses)
async getAllStudents(req, res, next) {
    try {
        const courses = await CourseRepository.getCoursesByTeacher(req.user._id);
        const courseIds = courses.map(c => c._id.toString());
        
        const students = await UserRepository.findAll(
            {
                role: 'student',
                isActive: true,
                assignedCourses: { $in: courseIds }
            },
            { select: '-password', sort: { name: 1 } }
        );
        
        ApiResponse.success(res, students, 'Students retrieved successfully');
    } catch (error) {
        next(error);
    }
}

// @desc    Get student by ID
async getStudentById(req, res, next) {
    try {
        const student = await UserRepository.findById(req.params.id, { select: '-password' });
        
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        ApiResponse.success(res, student, 'Student retrieved successfully');
    } catch (error) {
        next(error);
    }
}

// @desc    Update student
async updateStudent(req, res, next) {
    try {
        const { name, phone, address, year, semester, section, department } = req.body;
        const { semesterToYear } = require('../utils/semester.util');
        
        const student = await UserRepository.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const updates = {
            name: name || student.name,
            phone: phone || student.phone,
            address: address || student.address,
            section: section || student.section,
            department: department || student.department,
        };
        if (semester) {
            updates.semester = semester;
            updates.year = semesterToYear(semester);
        } else if (year) {
            updates.year = year;
        }
        
        const updatedStudent = await UserRepository.updateById(req.params.id, updates);
        
        const studentData = updatedStudent.toObject();
        delete studentData.password;
        
        ApiResponse.success(res, studentData, 'Student updated successfully');
    } catch (error) {
        next(error);
    }
}

// @desc    Delete student
async deleteStudent(req, res, next) {
    try {
        const student = await UserRepository.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        // Soft delete - mark as inactive
        await UserRepository.updateById(req.params.id, { isActive: false });
        
        // Also mark all their projects as inactive
        await ProjectRepository.updateMany(
            { studentId: req.params.id },
            { isActive: false }
        );
        
        ApiResponse.success(res, null, 'Student deleted successfully');
    } catch (error) {
        next(error);
    }
}
async assignStudentToCourse(req, res, next) {
    try {
        const { courseId, studentId } = req.params;
        
        const course = await CourseRepository.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        if (course.teacherId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only enroll students in your own courses'
            });
        }
        
        const student = await UserRepository.findById(studentId);
        if (!student || student.role !== 'student') {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        if (!student.isActive) {
            return res.status(400).json({
                success: false,
                message: 'This student account is inactive'
            });
        }

        const assigned = student.assignedCourses || [];
        const alreadyEnrolled = assigned.some((id) => id.toString() === courseId.toString());
        if (alreadyEnrolled) {
            return res.status(400).json({
                success: false,
                message: 'Student is already enrolled in this course'
            });
        }

        assigned.push(course._id);
        await UserRepository.updateById(studentId, { assignedCourses: assigned });

        await AuditLogRepository.logAction(
            req.user._id, req.user.email, req.user.role,
            'ENROLL_STUDENT', 'course', course._id,
            course.courseName, null, { studentId, studentName: student.name },
            'Teacher enrolled existing student in course',
            null, req.ip, req.headers['user-agent'], 'success'
        );
        
        ApiResponse.success(res, { courseId, studentId }, 'Student enrolled in course successfully');
    } catch (error) {
        next(error);
    }
}

    async sendNotificationToStudents(req, res, next) {
        try {
            const NotificationService = require('../services/notification.service');
            const { title, message, courseId, studentIds } = req.body;
            const result = await NotificationService.sendFromTeacher(req.user, {
                title,
                message,
                courseId,
                studentIds: Array.isArray(studentIds) ? studentIds : [],
            });

            if (!result.success) {
                return res.status(400).json(result);
            }

            ApiResponse.success(res, result, 'Notification sent to students');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new TeacherController();