const express = require('express');
const router = express.Router();
const DepartmentController = require('../controllers/department.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

// Public (authenticated) routes - all roles can view departments
router.get('/', protect, DepartmentController.getAllDepartments);
router.get('/:id', protect, DepartmentController.getDepartmentById);
router.get('/:id/stats', protect, DepartmentController.getDepartmentStats);

// Admin only routes
router.post('/', protect, authorize('admin'), DepartmentController.createDepartment);
router.put('/:id', protect, authorize('admin'), DepartmentController.updateDepartment);
router.delete('/:id', protect, authorize('admin'), DepartmentController.deleteDepartment);
router.post('/:id/set-head', protect, authorize('admin'), DepartmentController.setHeadOfDepartment);

module.exports = router;