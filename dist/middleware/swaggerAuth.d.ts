import { Request, Response, NextFunction } from 'express';
/**
 * Swagger UI Authentication Middleware
 * Protects Swagger documentation with authentication
 */
export declare function swaggerAuth(req: Request, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
//# sourceMappingURL=swaggerAuth.d.ts.map