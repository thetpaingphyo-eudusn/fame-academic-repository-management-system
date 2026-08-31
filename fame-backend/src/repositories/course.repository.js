const BaseRepository = require('./base.repository');
const Course = require('../models/Course.model');

class CourseRepository extends BaseRepository {
    constructor() {
        super(Course);
    }

    // Get courses by department
    async getCoursesByDepartment(department, year = null) {
        const query = { department };
        if (year) query.year = year;
        return await this.findAll(query, {
            sort: { year: 1, courseCode: 1 },
            populate: 'teacherId'
        });
    }

    // Get courses by teacher
    async getCoursesByTeacher(teacherId) {
        return await this.findAll(
            { teacherId, isActive: true },
            { sort: { year: 1, courseCode: 1 } }
        );
    }

    // Get courses by year and section
    async getCoursesByYearSection(year, section, department) {
        return await this.findAll(
            { year, section, department, isActive: true },
            { sort: { courseCode: 1 }, populate: 'teacherId' }
        );
    }

    // Get course with students
    async getCourseWithStudents(courseId) {
        return await this.findById(courseId).populate('students');
    }

    // Check if teacher teaches course
    async isTeacherOfCourse(teacherId, courseId) {
        const course = await this.findOne({ _id: courseId, teacherId });
        return !!course;
    }

    // Get course by code
    async findByCourseCode(courseCode) {
        return await this.findOne({ courseCode });
    }

    // Get all active courses
    async getAllActiveCourses() {
        return await this.findAll(
            { isActive: true },
            { sort: { department: 1, year: 1, courseCode: 1 } }
        );
    }

    // Get course statistics
    async getCourseStats(department = null) {
        const match = department ? { department } : {};
        return await this.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$department',
                    totalCourses: { $sum: 1 },
                    activeCourses: { $sum: { $cond: ['$isActive', 1, 0] } }
                }
            }
        ]);
    }

    // Search courses
    async searchCourses(keyword, department = null) {
        const query = {
            $or: [
                { courseCode: { $regex: keyword, $options: 'i' } },
                { courseName: { $regex: keyword, $options: 'i' } }
            ]
        };
        if (department) query.department = department;
        return await this.findAll(query, {
            populate: 'teacherId',
            limit: 20
        });
    }

    // Assign teacher to course
    async assignTeacher(courseId, teacherId) {
        return await this.updateById(courseId, { teacherId });
    }

    // Get courses without teacher assigned
    async getCoursesWithoutTeacher(department = null) {
        const query = { teacherId: null, isActive: true };
        if (department) query.department = department;
        return await this.findAll(query);
    }

    // Bulk create courses
    async bulkCreateCourses(coursesData) {
        return await this.model.insertMany(coursesData);
    }
}

module.exports = new CourseRepository();