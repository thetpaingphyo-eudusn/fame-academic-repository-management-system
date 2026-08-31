const CourseRepository = require('../repositories/course.repository');
const ApiResponse = require('../utils/apiResponse.util');
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../constants/messages.constant');

class CourseController {
    // @desc    Get all courses
    // @route   GET /api/courses
    // @access  Private
    async getAllCourses(req, res, next) {
        try {
            const {
                department,
                year,
                semester,
                isActive,
                search,
                page,
                limit,
                sort = 'courseCode',
                order = 'asc',
            } = req.query;

            const filter = {};
            if (department) filter.department = department;
            if (year) filter.year = parseInt(year, 10);
            if (semester) filter.semester = semester;
            if (isActive !== undefined && isActive !== '') {
                filter.isActive = isActive === 'true';
            }

            if (search && search.trim()) {
                const searchRegex = new RegExp(search.trim(), 'i');
                filter.$or = [{ courseCode: searchRegex }, { courseName: searchRegex }];
            }

            if (page || limit) {
                const pageNum = parseInt(page || 1, 10);
                const limitNum = parseInt(limit || 10, 10);
                const skip = (pageNum - 1) * limitNum;
                const sortOrder = order === 'asc' ? 1 : -1;
                const sortOptions = { [sort]: sortOrder };

                const [courses, total] = await Promise.all([
                    CourseRepository.findAll(filter, {
                        skip,
                        limit: limitNum,
                        sort: sortOptions,
                        populate: 'teacherId',
                    }),
                    CourseRepository.count(filter),
                ]);

                return ApiResponse.paginated(
                    res,
                    courses,
                    { page: pageNum, limit: limitNum, total },
                    'Courses retrieved successfully'
                );
            }

            const courses = await CourseRepository.findAll(filter, {
                sort: { courseCode: 1 },
                populate: ['teacherId'],
            });

            ApiResponse.success(res, courses, 'Courses retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Get single course
    // @route   GET /api/courses/:id
    // @access  Private
    async getCourseById(req, res, next) {
        try {
            const course = await CourseRepository.findById(req.params.id, {
                populate: ['teacherId']
            });
            
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.COURSE_NOT_FOUND
                });
            }
            
            ApiResponse.success(res, course, 'Course retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Create course (Admin only)
    // @route   POST /api/admin/courses
    // @access  Admin
    async createCourse(req, res, next) {
        try {
            const { courseCode, courseName, description, department, year, semester, section, credits, teacherId, academicYear } = req.body;
            
            // Check if course code already exists
            const existingCourse = await CourseRepository.findOne({ courseCode });
            if (existingCourse) {
                return res.status(400).json({
                    success: false,
                    message: 'Course code already exists'
                });
            }
            
            const course = await CourseRepository.create({
                courseCode,
                courseName,
                description,
                department,
                year,
                semester,
                section,
                credits,
                teacherId,
                academicYear,
                isActive: true
            });
            
            ApiResponse.created(res, course, SUCCESS_MESSAGES.COURSE_CREATED);
        } catch (error) {
            next(error);
        }
    }

    // @desc    Update course (Admin only)
    // @route   PUT /api/admin/courses/:id
    // @access  Admin
    async updateCourse(req, res, next) {
        try {
            const {
                courseName,
                description,
                department,
                year,
                semester,
                section,
                credits,
                teacherId,
                academicYear,
                isActive,
            } = req.body;

            const updateData = {
                courseName,
                description,
                department,
                year,
                semester,
                section,
                credits,
                teacherId,
                academicYear,
                isActive,
            };

            Object.keys(updateData).forEach(
                (key) => updateData[key] === undefined && delete updateData[key]
            );

            const course = await CourseRepository.updateById(req.params.id, updateData);
            
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.COURSE_NOT_FOUND
                });
            }
            
            ApiResponse.success(res, course, SUCCESS_MESSAGES.COURSE_UPDATED);
        } catch (error) {
            next(error);
        }
    }

    // @desc    Delete course (Admin only)
    // @route   DELETE /api/admin/courses/:id
    // @access  Admin
    async deleteCourse(req, res, next) {
        try {
            const course = await CourseRepository.deleteById(req.params.id);
            
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.COURSE_NOT_FOUND
                });
            }
            
            ApiResponse.success(res, null, SUCCESS_MESSAGES.COURSE_DELETED);
        } catch (error) {
            next(error);
        }
    }

    // @desc    Assign teacher to course (Admin only)
    // @route   PUT /api/admin/courses/:id/assign-teacher
    // @access  Admin
    async assignTeacher(req, res, next) {
        try {
            const { teacherId } = req.body;
            
            const course = await CourseRepository.assignTeacher(req.params.id, teacherId);
            
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.COURSE_NOT_FOUND
                });
            }
            
            ApiResponse.success(res, course, SUCCESS_MESSAGES.TEACHER_ASSIGNED);
        } catch (error) {
            next(error);
        }
    }

    // @desc    Get courses by department
    // @route   GET /api/courses/department/:department
    // @access  Private
    async getCoursesByDepartment(req, res, next) {
        try {
            const { department } = req.params;
            const { year, semester } = req.query;
            
            const filter = { department, isActive: true };
            if (year) filter.year = parseInt(year);
            if (semester) filter.semester = semester;
            
            const courses = await CourseRepository.findAll(filter, {
                sort: { year: 1, courseCode: 1 },
                populate: ['teacherId']
            });
            
            ApiResponse.success(res, courses, 'Courses retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    // @desc    Get courses by teacher
    // @route   GET /api/courses/teacher/:teacherId
    // @access  Private
    async getCoursesByTeacher(req, res, next) {
        try {
            const teacherId = req.params.teacherId || req.user.id;
            
            const courses = await CourseRepository.findAll({ teacherId, isActive: true }, {
                sort: { year: 1, semester: 1, courseCode: 1 }
            });
            
            ApiResponse.success(res, courses, 'Courses retrieved successfully');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CourseController();