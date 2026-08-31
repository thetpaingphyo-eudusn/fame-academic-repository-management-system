const UserRepository = require('../repositories/user.repository');
const AuditLogRepository = require('../repositories/auditLog.repository');
const TokenUtil = require('../utils/token.util');
const ApiResponse = require('../utils/apiResponse.util');
const { ROLES } = require('../constants/roles.constant');
const { SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../constants/messages.constant');

class AuthController {
    // @desc    Login user
    // @route   POST /api/auth/login
    // @access  Public
    async login(req, res, next) {
        try {
            const { email, password } = req.body;

            // Find user with password field
            const user = await UserRepository.findByEmail(email, true);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_CREDENTIALS
                });
            }

            // Check password
            const isMatch = await user.matchPassword(password);
            if (!isMatch) {
                // Log failed attempt
                await AuditLogRepository.logAction(
                    user._id, user.email, user.role,
                    'LOGIN_FAILED', 'user', user._id,
                    null, null, null, 'Invalid password',
                    null, req.ip, req.headers['user-agent'], 'failed'
                );
                return res.status(401).json({
                    success: false,
                    message: ERROR_MESSAGES.INVALID_CREDENTIALS
                });
            }

            // Check if user is active
            if (!user.isActive) {
                return res.status(401).json({
                    success: false,
                    message: ERROR_MESSAGES.ACCOUNT_DEACTIVATED
                });
            }

            // Generate token
            const token = TokenUtil.generateAccessToken(user._id, user.role);

            // Prepare user response (exclude password)
            const userResponse = {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                studentId: user.studentId,
                teacherId: user.teacherId,
                year: user.year,
                semester: user.semester,
                section: user.section,
                position: user.position
            };

            // Log successful login
            await AuditLogRepository.logAction(
                user._id, user.email, user.role,
                'LOGIN', 'user', user._id,
                user.name, null, null, 'User logged in successfully',
                null, req.ip, req.headers['user-agent'], 'success'
            );

            ApiResponse.success(res, { token, user: userResponse }, SUCCESS_MESSAGES.LOGIN);
        } catch (error) {
            next(error);
        }
    }

    // @desc    Register student (self registration)
    // @route   POST /api/auth/register
    // @access  Public
    async register(req, res, next) {
        try {
            const { name, email, password, studentId, department, year, section } = req.body;

            // Check if user already exists
            const existingUser = await UserRepository.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.EMAIL_ALREADY_EXISTS
                });
            }

            // Check if student ID already exists
            const existingStudent = await UserRepository.findByStudentId(studentId);
            if (existingStudent) {
                return res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.STUDENT_ID_EXISTS
                });
            }

            // Create student account
            const user = await UserRepository.create({
                name,
                email,
                password,
                studentId,
                department,
                year,
                section,
                role: ROLES.STUDENT,
                isActive: true
            });

            // Generate token for auto-login
            const token = TokenUtil.generateAccessToken(user._id, user.role);

            // Log registration
            await AuditLogRepository.logAction(
                user._id, user.email, user.role,
                'REGISTER', 'user', user._id,
                user.name, null, null, 'Student self-registration',
                null, req.ip, req.headers['user-agent'], 'success'
            );

            const userResponse = {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                studentId: user.studentId,
                year: user.year,
                section: user.section
            };

            ApiResponse.created(res, { token, user: userResponse }, SUCCESS_MESSAGES.USER_CREATED);
        } catch (error) {
            next(error);
        }
    }

    // @desc    Get current logged in user
    // @route   GET /api/auth/me
    // @access  Private
    async getMe(req, res, next) {
        try {
            const user = await UserRepository.findById(req.user.id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.USER_NOT_FOUND
                });
            }

            ApiResponse.success(res, { user }, SUCCESS_MESSAGES.LOGIN_SUCCESS);
        } catch (error) {
            next(error);
        }
    }

    // @desc    Change password
    // @route   PUT /api/auth/change-password
    // @access  Private
    async changePassword(req, res, next) {
        try {
            const { currentPassword, newPassword } = req.body;

            const user = await UserRepository.findByEmail(req.user.email, true);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.USER_NOT_FOUND
                });
            }

            const isMatch = await user.matchPassword(currentPassword);
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            user.password = newPassword;
            await user.save();

            await AuditLogRepository.logAction(
                user._id, user.email, user.role,
                'CHANGE_PASSWORD', 'user', user._id,
                user.name, null, null, 'User changed password',
                null, req.ip, req.headers['user-agent'], 'success'
            );

            ApiResponse.success(res, null, SUCCESS_MESSAGES.PASSWORD_CHANGED);
        } catch (error) {
            next(error);
        }
    }

    // @desc    Logout (invalidate token - client side)
    // @route   POST /api/auth/logout
    // @access  Private
    async logout(req, res, next) {
        try {
            await AuditLogRepository.logAction(
                req.user._id, req.user.email, req.user.role,
                'LOGOUT', 'user', req.user._id,
                req.user.name, null, null, 'User logged out',
                null, req.ip, req.headers['user-agent'], 'success'
            );

            ApiResponse.success(res, null, SUCCESS_MESSAGES.LOGOUT_SUCCESS);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController();