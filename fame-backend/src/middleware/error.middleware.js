/**
 * Global error handling middleware
 */

// Custom error class for API errors
class ApiError extends Error {
    constructor(statusCode, message, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

// 404 Not Found handler
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

// Global error handler
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    const statusCode = (res.statusCode && res.statusCode !== 200)
        ? res.statusCode
        : (error.statusCode || 500);

    // Skip noisy stack traces for routine 404s
    if (statusCode !== 404) {
        console.error('Error:', err);
    }
    
    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = `Resource not found with id of ${err.value}`;
        error = new ApiError(404, message);
    }
    
    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        const message = `${field} already exists. Please use another value.`;
        error = new ApiError(400, message);
    }
    
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = new ApiError(400, message);
    }
    
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error = new ApiError(401, 'Invalid token. Please login again.');
    }
    
    if (err.name === 'TokenExpiredError') {
        error = new ApiError(401, 'Token expired. Please login again.');
    }

    const finalStatus = (error.statusCode && error.statusCode !== 500)
        ? error.statusCode
        : statusCode;
    const message = error.message || 'Internal Server Error';

    res.status(finalStatus).json({
        success: false,
        message: message,
        stack: process.env.NODE_ENV === 'development' && finalStatus !== 404 ? err.stack : undefined,
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    ApiError,
    notFound,
    errorHandler
};