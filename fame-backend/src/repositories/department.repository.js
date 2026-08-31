const BaseRepository = require('./base.repository');
const Department = require('../models/Department.model');

class DepartmentRepository extends BaseRepository {
    constructor() {
        super(Department);
    }

    // Get department by name
    async findByName(name) {
        return await this.findOne({ name });
    }

    // Get all active departments
    async getAllActive() {
        return await this.findAll(
            { isActive: true },
            { sort: { name: 1 } }
        );
    }

    // Get department with head of department info
    async getDepartmentWithHead(deptId) {
        return await this.findById(deptId).populate('headOfDepartment', 'name email');
    }

    // Get department statistics
    async getDepartmentStats(deptId) {
        const stats = await this.aggregate([
            { $match: { _id: deptId } },
            {
                $lookup: {
                    from: 'users',
                    let: { deptName: '$name' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$department', '$$deptName'] },
                                        { $eq: ['$role', 'student'] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'students'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    let: { deptName: '$name' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$department', '$$deptName'] },
                                        { $eq: ['$role', 'teacher'] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'teachers'
                }
            },
            {
                $project: {
                    name: 1,
                    fullName: 1,
                    studentCount: { $size: '$students' },
                    teacherCount: { $size: '$teachers' }
                }
            }
        ]);
        return stats[0];
    }

    // Get all departments with counts
    async getAllDepartmentsWithCounts() {
        const departments = await this.findAll({ isActive: true });
        
        for (let dept of departments) {
            const stats = await this.getDepartmentStats(dept._id);
            dept = { ...dept.toObject(), ...stats };
        }
        return departments;
    }

    // Set head of department
    async setHeadOfDepartment(deptId, teacherId) {
        return await this.updateById(deptId, { headOfDepartment: teacherId });
    }

    // Remove head of department
    async removeHeadOfDepartment(deptId) {
        return await this.updateById(deptId, { headOfDepartment: null });
    }
}

module.exports = new DepartmentRepository();