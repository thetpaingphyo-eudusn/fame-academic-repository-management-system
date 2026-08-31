/**
 * Role-based authorization middleware
 * @param  {...string} roles - Allowed roles (admin, teacher, student)
 * @returns {Function} Middleware function
 */

const authorize = (...roles) => {
    return (req, res, next) => {
        // Check if user exists (should be set by protect middleware)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized. User not found.'
            });
        }
        
        // Check if user role is allowed
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. ${req.user.role} role is not allowed to access this resource.`
            });
        }
        
        next();
    };
};

/**
 * Check if user owns the resource (for student own projects)
 * @param {Function} getResourceUserId - Function to get user ID from resource
 * @returns {Function} Middleware function
 */
const checkOwnership = (getResourceUserId) => {
    return async (req, res, next) => {
        try {
            const resourceUserId = await getResourceUserId(req);
            
            if (req.user.role === 'admin') {
                return next();
            }
            
            if (req.user.role === 'teacher') {
                // Teachers can access their assigned students
                return next();
            }
            
            if (req.user._id.toString() !== resourceUserId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only access your own resources.'
                });
            }
            
            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error checking ownership',
                error: error.message
            });
        }
    };
};

module.exports = { authorize, checkOwnership };