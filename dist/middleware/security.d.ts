import { Request, Response, NextFunction } from 'express';
/**
 * Enhanced Security Headers Middleware
 */
export declare function securityHeaders(req: Request, res: Response, next: NextFunction): void;
/**
 * Enhanced Helmet configuration
 */
export declare const helmetConfig: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
/**
 * Data sanitization middleware
 */
export declare const sanitizeInput: import("express").Handler;
/**
 * Prevent HTTP Parameter Pollution
 */
export declare const preventHPP: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
/**
 * General API rate limiter (stricter)
 */
export declare const apiLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Strict rate limiter for authentication endpoints
 */
export declare const authLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Speed limiter - slows down requests after limit
 */
export declare const speedLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=security.d.ts.map