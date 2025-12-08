import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
interface AuditLog {
    timestamp: Date;
    userId?: string;
    ip: string;
    method: string;
    path: string;
    statusCode: number;
    action: string;
    details?: any;
}
/**
 * Security audit logger middleware
 */
export declare function auditLogger(req: AuthRequest, res: Response, next: NextFunction): void;
/**
 * Get audit logs (admin only)
 */
export declare function getAuditLogs(limit?: number): AuditLog[];
export {};
//# sourceMappingURL=auditLogger.d.ts.map