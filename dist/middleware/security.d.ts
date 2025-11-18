import { Request, Response, NextFunction } from 'express';
/**
 * Security Headers Middleware
 * Adds security headers to all responses
 */
export declare function securityHeaders(req: Request, res: Response, next: NextFunction): void;
/**
 * Helmet configuration for additional security
 */
export declare const helmetConfig: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
//# sourceMappingURL=security.d.ts.map