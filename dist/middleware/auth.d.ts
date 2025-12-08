import { Request, Response, NextFunction } from 'express';
export interface AuthUser {
    id: string;
    email?: string;
    role: string;
    employee_id?: number;
    truck_id?: number | null;
}
export interface AuthRequest extends Request {
    user?: AuthUser;
}
/**
 * Enhanced authentication middleware with JWT
 * Supports both JWT tokens (new) and base64 tokens (legacy compatibility)
 */
export declare function authenticateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
/**
 * Role-based authorization middleware
 */
export declare function requireRole(...allowedRoles: string[]): (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth.d.ts.map