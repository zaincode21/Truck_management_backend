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

export class ResponseHelper {
  /**
   * Send success response
   */
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Operation successful',
    statusCode: number = 200,
    meta?: ApiResponse['meta']
  ): Response {
    const response: ApiResponse<T> = {
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
  static error(
    res: Response,
    message: string = 'An error occurred',
    statusCode: number = 500,
    error?: string,
    errors?: Record<string, string[]>,
    meta?: ApiResponse['meta']
  ): Response {
    const response: ApiResponse = {
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
  static created<T>(
    res: Response,
    data: T,
    message: string = 'Resource created successfully',
    meta?: ApiResponse['meta']
  ): Response {
    return this.success(res, data, message, 201, meta);
  }

  /**
   * Send not found response (404)
   */
  static notFound(
    res: Response,
    message: string = 'Resource not found',
    meta?: ApiResponse['meta']
  ): Response {
    return this.error(res, message, 404, message, undefined, meta);
  }

  /**
   * Send bad request response (400)
   */
  static badRequest(
    res: Response,
    message: string = 'Bad request',
    errors?: Record<string, string[]>,
    meta?: ApiResponse['meta']
  ): Response {
    return this.error(res, message, 400, message, errors, meta);
  }

  /**
   * Send unauthorized response (401)
   */
  static unauthorized(
    res: Response,
    message: string = 'Unauthorized access',
    meta?: ApiResponse['meta']
  ): Response {
    return this.error(res, message, 401, message, undefined, meta);
  }

  /**
   * Send forbidden response (403)
   */
  static forbidden(
    res: Response,
    message: string = 'Forbidden access',
    meta?: ApiResponse['meta']
  ): Response {
    return this.error(res, message, 403, message, undefined, meta);
  }

  /**
   * Send validation error response (422)
   */
  static validationError(
    res: Response,
    message: string = 'Validation failed',
    errors: Record<string, string[]> = {},
    meta?: ApiResponse['meta']
  ): Response {
    return this.error(res, message, 422, message, errors, meta);
  }

  /**
   * Send paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message: string = 'Data retrieved successfully',
    meta?: { requestId?: string }
  ): Response {
    const totalPages = Math.ceil(total / limit);

    return this.success(
      res,
      data as T,
      message,
      200,
      {
        page,
        limit,
        total,
        totalPages,
        timestamp: new Date().toISOString(),
        requestId: meta?.requestId,
      }
    );
  }
}

