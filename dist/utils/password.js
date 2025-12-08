"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePassword = validatePassword;
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const DEFAULT_POLICY = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
};
/**
 * Validate password strength
 */
function validatePassword(password, policy = DEFAULT_POLICY) {
    const errors = [];
    if (password.length < policy.minLength) {
        errors.push(`Password must be at least ${policy.minLength} characters long`);
    }
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (policy.requireNumbers && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
/**
 * Hash password with bcrypt
 */
async function hashPassword(password, rounds = 12) {
    return bcryptjs_1.default.hash(password, rounds);
}
/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
    return bcryptjs_1.default.compare(password, hash);
}
//# sourceMappingURL=password.js.map