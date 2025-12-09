import { Request, Response, NextFunction } from 'express';
export interface AuthUser {
    id: string;
    email: string;
    role: string;
    employee_id?: number;
    truck_id?: number | null;
}
export interface AuthRequest extends Request {
    user?: AuthUser;
}
/**
 * Middleware to extract and verify user from token
 */
export declare function authenticateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=auth.d.ts.map