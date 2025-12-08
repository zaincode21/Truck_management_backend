import { Request, Response, NextFunction } from 'express';
/**
 * Check if account is locked out
 */
export declare function checkAccountLockout(identifier: string): {
    locked: boolean;
    remainingTime?: number;
};
/**
 * Record failed login attempt
 */
export declare function recordFailedAttempt(identifier: string): void;
/**
 * Clear failed attempts on successful login
 */
export declare function clearFailedAttempts(identifier: string): void;
/**
 * Middleware to check account lockout
 */
export declare function accountLockoutMiddleware(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=accountLockout.d.ts.map