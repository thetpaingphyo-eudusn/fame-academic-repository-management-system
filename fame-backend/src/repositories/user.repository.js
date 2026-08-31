const BaseRepository = require('./base.repository');
const User = require('../models/User.model');

class UserRepository extends BaseRepository {
    constructor() {
        super(User);
    }

    // Authentication
    async findByEmail(email, includePassword = false) {
        let query = this.model.findOne({ email });
        if (includePassword) query = query.select('+password');
        return await query;
    }

    async findByStudentId(studentId) {
        return await this.model.findOne({ studentId });
    }

    async findByTeacherId(teacherId) {
        return await this.model.findOne({ teacherId });
    }

    // Get all by role
    async getAllStudents(filters = {}) {
        return await this.findAll({ role: 'student', ...filters }, {
            sort: { studentId: 1 },
            select: '-password'
        });
    }

    async getAllTeachers(filters = {}) {
        return await this.findAll({ role: 'teacher', ...filters }, {
            sort: { name: 1 },
            select: '-password'
        });
    }

    async getAllAdmins() {
        return await this.findAll({ role: 'admin' }, {
            select: '-password'
        });
    }

    // Get by department
    async getStudentsByDepartment(department, year = null, section = null) {
        const query = { role: 'student', department };
        if (year) query.year = year;
        if (section) query.section = section;
        return await this.findAll(query, {
            sort: { studentId: 1 },
            select: '-password'
        });
    }

    async getTeachersByDepartment(department) {
        return await this.findAll({ role: 'teacher', department }, {
            select: '-password'
        });
    }

    // CRUD operations
    async createStudent(data) {
        data.role = 'student';
        return await this.create(data);
    }

    async createTeacher(data) {
        data.role = 'teacher';
        return await this.create(data);
    }

    async updateStudent(id, data) {
        return await this.updateById(id, data);
    }

    async deleteStudent(id) {
        return await this.deleteById(id);
    }

    // Password management
    async updatePassword(userId, hashedPassword) {
        return await this.updateById(userId, { password: hashedPassword });
    }

    // Status management
    async activateUser(userId) {
        return await this.updateById(userId, { isActive: true });
    }

    async deactivateUser(userId) {
        return await this.updateById(userId, { isActive: false });
    }

    // Statistics
    async getUserStats() {
        return await this.aggregate([
            {
                $group: {
                    _id: '$role',
                    total: { $sum: 1 },
                    active: { $sum: { $cond: ['$isActive', 1, 0] } }
                }
            }
        ]);
    }

    // Search
    async searchUsers(keyword, role = null) {
        const query = {
            $or: [
                { name: { $regex: keyword, $options: 'i' } },
                { email: { $regex: keyword, $options: 'i' } },
                { studentId: { $regex: keyword, $options: 'i' } }
            ]
        };
        if (role) query.role = role;
        return await this.findAll(query, {
            limit: 20,
            select: '-password'
        });
    }

    // Bulk operations
    async bulkCreateStudents(studentsData) {
        const students = studentsData.map(s => ({ ...s, role: 'student' }));
        return await this.model.insertMany(students);
    }

    async getStudentsByYear(year, department = null) {
        const query = { role: 'student', year };
        if (department) query.department = department;
        return await this.findAll(query, { sort: { studentId: 1 } });
    }
}

module.exports = new UserRepository();