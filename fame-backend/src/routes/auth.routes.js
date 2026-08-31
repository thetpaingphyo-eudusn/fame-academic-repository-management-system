const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { loginValidation, registerValidation, changePasswordValidation } = require('../validations/auth.validation');

// Public routes
router.post('/login', loginValidation, validate, AuthController.login);
router.post('/register', registerValidation, validate, AuthController.register);

// Protected routes
router.get('/me', protect, AuthController.getMe);
router.put('/change-password', protect, changePasswordValidation, validate, AuthController.changePassword);
router.post('/logout', protect, AuthController.logout);

module.exports = router;