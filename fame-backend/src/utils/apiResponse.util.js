/**
 * Standard API Response Formatter
 */

class ApiResponse {
    // Success response
    static success(res, data = null, message = 'Success', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    }

    // Success with pagination
    static paginated(res, data, pagination, message = 'Success', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: pagination.total,
                pages: Math.ceil(pagination.total / pagination.limit)
            },
            timestamp: new Date().toISOString()
        });
    }

    // Created response (201)
    static created(res, data = null, message = 'Resource created successfully') {
        return this.success(res, data, message, 201);
    }

    // No content response (204)
    static noContent(res) {
        return res.status(204).json();
    }
}

module.exports = ApiResponse;