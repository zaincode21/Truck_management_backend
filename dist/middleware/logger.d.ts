import { Request, Response, NextFunction } from 'express';
/**
 * Request Logger Middleware
 * Logs all incoming requests with timing information
 */
export interface RequestWithId extends Request {
    requestId?: string;
    startTime?: number;
}
export declare function requestLogger(req: RequestWithId, res: Response, next: NextFunction): void;
/**
 * Error Logger
 */
export declare function errorLogger(err: any, req: RequestWithId, res: Response, next: NextFunction): void;
//# sourceMappingURL=logger.d.ts.map