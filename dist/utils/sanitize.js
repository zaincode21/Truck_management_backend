"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeString = sanitizeString;
exports.sanitizeEmail = sanitizeEmail;
exports.sanitizeNumber = sanitizeNumber;
exports.sanitizeObject = sanitizeObject;
const validator_1 = __importDefault(require("validator"));
const xss_1 = __importDefault(require("xss"));
/**
 * Sanitize string input
 */
function sanitizeString(input) {
    if (typeof input !== 'string') {
        return '';
    }
    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');
    // XSS protection
    sanitized = (0, xss_1.default)(sanitized, {
        whiteList: {},
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script']
    });
    // Trim whitespace
    sanitized = sanitized.trim();
    return sanitized;
}
/**
 * Sanitize email
 */
function sanitizeEmail(email) {
    const sanitized = sanitizeString(email);
    if (validator_1.default.isEmail(sanitized)) {
        return validator_1.default.normalizeEmail(sanitized) || sanitized;
    }
    throw new Error('Invalid email format');
}
/**
 * Sanitize number
 */
function sanitizeNumber(input) {
    const num = Number(input);
    if (isNaN(num)) {
        throw new Error('Invalid number');
    }
    return num;
}
/**
 * Sanitize object recursively
 */
function sanitizeObject(obj) {
    const sanitized = { ...obj };
    for (const key in sanitized) {
        if (typeof sanitized[key] === 'string') {
            sanitized[key] = sanitizeString(sanitized[key]);
        }
        else if (typeof sanitized[key] === 'object' && sanitized[key] !== null && !Array.isArray(sanitized[key])) {
            sanitized[key] = sanitizeObject(sanitized[key]);
        }
        else if (Array.isArray(sanitized[key])) {
            sanitized[key] = sanitized[key].map((item) => typeof item === 'string' ? sanitizeString(item) : item);
        }
    }
    return sanitized;
}
//# sourceMappingURL=sanitize.js.map