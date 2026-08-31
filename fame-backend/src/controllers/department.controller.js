const DepartmentRepository = require('../repositories/department.repository');
const AuditLogRepository = require('../repositories/auditLog.repository');
const ApiResponse = require('../utils/apiResponse.util');

class DepartmentController {
    async getAllDepartments(req, res, next) {
        try {
            const { 
                search, 
                page = 1, 
                limit = 10, 
                sort = 'name', 
                order = 'asc',
                isActive,
                establishedYear 
            } = req.query;
            
            // Build filter
            let filter = {};
            
            // Search by name or fullName
            if (search && search.trim()) {
                const searchRegex = new RegExp(search.trim(), 'i');
                filter.$or = [
                    { name: searchRegex },
                    { fullName: searchRegex }
                ];
            }
            
            // Filter by status
            if (isActive !== undefined && isActive !== '') {
                filter.isActive = isActive === 'true';
            }
            
            // Filter by established year
            if (establishedYear && establishedYear !== '') {
                filter.establishedYear = parseInt(establishedYear);
            }
            
            // Pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const limitNum = parseInt(limit);
            
            // Sorting
            const sortOrder = order === 'asc' ? 1 : -1;
            const sortOptions = { [sort]: sortOrder };
            
            // Get departments with all options
            const departments = await DepartmentRepository.findAll(filter, {
                skip,
                limit: limitNum,
                sort: sortOptions,
                populate: 'headOfDepartment'
            });
            
            // Get total count
            const total = await DepartmentRepository.count(filter);
            
            // Add stats to each department
            const departmentsWithStats = await Promise.all(
                departments.map(async (dept) => {
                    const stats = await DepartmentRepository.getDepartmentStats(dept._id);
                    return {
                        ...dept.toObject(),
                        studentCount: stats?.studentCount || 0,
                        teacherCount: stats?.teacherCount || 0
                    };
                })
            );
            
            ApiResponse.paginated(res, departmentsWithStats, {
                page: parseInt(page),
                limit: limitNum,
                total
            }, 'Departments retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getDepartmentById(req, res, next) {
        try {
            const department = await DepartmentRepository.getDepartmentWithHead(req.params.id);
            if (!department) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Department not found' 
                });
            }
            
            const stats = await DepartmentRepository.getDepartmentStats(req.params.id);
            const departmentWithStats = {
                ...department.toObject(),
                studentCount: stats?.studentCount || 0,
                teacherCount: stats?.teacherCount || 0
            };
            
            ApiResponse.success(res, departmentWithStats, 'Department retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    async getDepartmentStats(req, res, next) {
        try {
            const stats = await DepartmentRepository.getDepartmentStats(req.params.id);
            if (!stats) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Department not found' 
                });
            }
            ApiResponse.success(res, stats, 'Department stats retrieved');
        } catch (error) {
            next(error);
        }
    }

    async createDepartment(req, res, next) {
        try {
            // Check if department already exists
            const existingDept = await DepartmentRepository.findOne({ 
                name: req.body.name?.toUpperCase() 
            });
            
            if (existingDept) {
                return res.status(400).json({
                    success: false,
                    message: `Department '${req.body.name}' already exists`
                });
            }
            
            const department = await DepartmentRepository.create({
                name: req.body.name?.toUpperCase(),
                fullName: req.body.fullName,
                description: req.body.description || '',
                establishedYear: req.body.establishedYear || null,
                headOfDepartment: req.body.headOfDepartment || null,
                contactEmail: req.body.contactEmail || null,
                contactPhone: req.body.contactPhone || null,
                officeLocation: req.body.officeLocation || null,
                isActive: req.body.isActive !== false
            });
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'CREATE_DEPARTMENT', 'department', department._id,
                department.name, null, department,
                'Admin created department',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.created(res, department, 'Department created successfully');
        } catch (error) {
            next(error);
        }
    }

    async updateDepartment(req, res, next) {
        try {
            const updateData = {
                fullName: req.body.fullName,
                description: req.body.description,
                establishedYear: req.body.establishedYear,
                headOfDepartment: req.body.headOfDepartment,
                contactEmail: req.body.contactEmail,
                contactPhone: req.body.contactPhone,
                officeLocation: req.body.officeLocation,
                isActive: req.body.isActive
            };
            
            // Remove undefined fields
            Object.keys(updateData).forEach(key => 
                updateData[key] === undefined && delete updateData[key]
            );
            
            const department = await DepartmentRepository.updateById(req.params.id, updateData);
            
            if (!department) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Department not found' 
                });
            }
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'UPDATE_DEPARTMENT', 'department', department._id,
                department.name, null, updateData,
                'Admin updated department',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.success(res, department, 'Department updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async deleteDepartment(req, res, next) {
        try {
            const department = await DepartmentRepository.deleteById(req.params.id);
            
            if (!department) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Department not found' 
                });
            }
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'DELETE_DEPARTMENT', 'department', department._id,
                department.name, department, null,
                'Admin deleted department',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.success(res, null, 'Department deleted successfully');
        } catch (error) {
            next(error);
        }
    }

    async setHeadOfDepartment(req, res, next) {
        try {
            const { teacherId } = req.body;
            
            // Verify teacher exists
            if (teacherId) {
                const User = require('../models/User.model');
                const teacher = await User.findById(teacherId);
                if (!teacher || teacher.role !== 'teacher') {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid teacher ID'
                    });
                }
            }
            
            const department = await DepartmentRepository.setHeadOfDepartment(req.params.id, teacherId || null);
            
            if (!department) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Department not found' 
                });
            }
            
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'SET_DEPARTMENT_HEAD', 'department', department._id,
                department.name, null, { teacherId },
                'Admin set department head',
                null, req.ip, req.headers['user-agent'], 'success'
            );
            
            ApiResponse.success(res, department, 'Head of department assigned successfully');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new DepartmentController();