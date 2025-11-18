import { Request, Response, NextFunction } from 'express';
/**
 * Validation Rules Interface
 */
export interface ValidationRule {
    field: string;
    rules: {
        required?: boolean;
        type?: 'string' | 'number' | 'email' | 'date' | 'boolean' | 'array';
        min?: number;
        max?: number;
        pattern?: RegExp;
        custom?: (value: any) => boolean | string;
        enum?: any[];
    };
}
/**
 * Request Validator Middleware
 */
export declare function validateRequest(rules: ValidationRule[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=validator.d.ts.map