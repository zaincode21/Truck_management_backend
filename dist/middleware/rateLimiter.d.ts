import { Request, Response, NextFunction } from 'express';
/**
 * Rate Limiter Middleware
 */
export declare function rateLimiter(windowMs?: number, // 15 minutes
maxRequests?: number): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=rateLimiter.d.ts.map