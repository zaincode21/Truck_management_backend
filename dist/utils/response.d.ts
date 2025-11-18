import { Response } from 'express';
/**
 * Standardized API Response Utility
 * Provides consistent response format across all endpoints
 */
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
    errors?: Record<string, string[]>;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
        timestamp?: string;
        requestId?: string;
    };
}
export declare class ResponseHelper {
    /**
     * Send success response
     */
    static success<T>(res: Response, data: T, message?: string, statusCode?: number, meta?: ApiResponse['meta']): Response;
    /**
     * Send error response
     */
    static error(res: Response, message?: string, statusCode?: number, error?: string, errors?: Record<string, string[]>, meta?: ApiResponse['meta']): Response;
    /**
     * Send created response (201)
     */
    static created<T>(res: Response, data: T, message?: string, meta?: ApiResponse['meta']): Response;
    /**
     * Send not found response (404)
     */
    static notFound(res: Response, message?: string, meta?: ApiResponse['meta']): Response;
    /**
     * Send bad request response (400)
     */
    static badRequest(res: Response, message?: string, errors?: Record<string, string[]>, meta?: ApiResponse['meta']): Response;
    /**
     * Send unauthorized response (401)
     */
    static unauthorized(res: Response, message?: string, meta?: ApiResponse['meta']): Response;
    /**
     * Send forbidden response (403)
     */
    static forbidden(res: Response, message?: string, meta?: ApiResponse['meta']): Response;
    /**
     * Send validation error response (422)
     */
    static validationError(res: Response, message?: string, errors?: Record<string, string[]>, meta?: ApiResponse['meta']): Response;
    /**
     * Send paginated response
     */
    static paginated<T>(res: Response, data: T[], page: number, limit: number, total: number, message?: string, meta?: {
        requestId?: string;
    }): Response;
}
//# sourceMappingURL=response.d.ts.map