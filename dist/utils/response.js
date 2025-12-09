export class ResponseHelper {
    /**
     * Send success response
     */
    static success(res, data, message = 'Operation successful', statusCode = 200, meta) {
        const response = {
            success: true,
            message,
            data,
            meta: {
                ...meta,
                timestamp: meta?.timestamp || new Date().toISOString(),
            },
        };
        return res.status(statusCode).json(response);
    }
    /**
     * Send error response
     */
    static error(res, message = 'An error occurred', statusCode = 500, error, errors, meta) {
        const response = {
            success: false,
            message,
            error: error || message,
            errors,
            meta: {
                ...meta,
                timestamp: meta?.timestamp || new Date().toISOString(),
            },
        };
        return res.status(statusCode).json(response);
    }
    /**
     * Send created response (201)
     */
    static created(res, data, message = 'Resource created successfully', meta) {
        return this.success(res, data, message, 201, meta);
    }
    /**
     * Send not found response (404)
     */
    static notFound(res, message = 'Resource not found', meta) {
        return this.error(res, message, 404, message, undefined, meta);
    }
    /**
     * Send bad request response (400)
     */
    static badRequest(res, message = 'Bad request', errors, meta) {
        return this.error(res, message, 400, message, errors, meta);
    }
    /**
     * Send unauthorized response (401)
     */
    static unauthorized(res, message = 'Unauthorized access', meta) {
        return this.error(res, message, 401, message, undefined, meta);
    }
    /**
     * Send forbidden response (403)
     */
    static forbidden(res, message = 'Forbidden access', meta) {
        return this.error(res, message, 403, message, undefined, meta);
    }
    /**
     * Send validation error response (422)
     */
    static validationError(res, message = 'Validation failed', errors = {}, meta) {
        return this.error(res, message, 422, message, errors, meta);
    }
    /**
     * Send paginated response
     */
    static paginated(res, data, page, limit, total, message = 'Data retrieved successfully', meta) {
        const totalPages = Math.ceil(total / limit);
        return this.success(res, data, message, 200, {
            page,
            limit,
            total,
            totalPages,
            timestamp: new Date().toISOString(),
            requestId: meta?.requestId,
        });
    }
}
//# sourceMappingURL=response.js.map