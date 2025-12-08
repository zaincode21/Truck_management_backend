/**
 * Sanitize string input
 */
export declare function sanitizeString(input: string): string;
/**
 * Sanitize email
 */
export declare function sanitizeEmail(email: string): string;
/**
 * Sanitize number
 */
export declare function sanitizeNumber(input: any): number;
/**
 * Sanitize object recursively
 */
export declare function sanitizeObject<T extends Record<string, any>>(obj: T): T;
//# sourceMappingURL=sanitize.d.ts.map