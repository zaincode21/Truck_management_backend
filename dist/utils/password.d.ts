/**
 * Password strength requirements
 */
export interface PasswordPolicy {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
}
/**
 * Validate password strength
 */
export declare function validatePassword(password: string, policy?: PasswordPolicy): {
    valid: boolean;
    errors: string[];
};
/**
 * Hash password with bcrypt
 */
export declare function hashPassword(password: string, rounds?: number): Promise<string>;
/**
 * Compare password with hash
 */
export declare function comparePassword(password: string, hash: string): Promise<boolean>;
//# sourceMappingURL=password.d.ts.map