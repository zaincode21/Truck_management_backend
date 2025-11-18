"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = validateRequest;
const response_1 = require("../utils/response");
/**
 * Request Validator Middleware
 */
function validateRequest(rules) {
    return (req, res, next) => {
        const errors = {};
        for (const rule of rules) {
            const value = req.body[rule.field];
            const fieldErrors = [];
            // Required check
            if (rule.rules.required && (value === undefined || value === null || value === '')) {
                fieldErrors.push(`${rule.field} is required`);
                continue;
            }
            // Skip other validations if field is not required and empty
            if (!rule.rules.required && (value === undefined || value === null || value === '')) {
                continue;
            }
            // Type check
            if (rule.rules.type) {
                switch (rule.rules.type) {
                    case 'string':
                        if (typeof value !== 'string') {
                            fieldErrors.push(`${rule.field} must be a string`);
                        }
                        break;
                    case 'number':
                        if (typeof value !== 'number' && isNaN(Number(value))) {
                            fieldErrors.push(`${rule.field} must be a number`);
                        }
                        break;
                    case 'email':
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        if (!emailRegex.test(value)) {
                            fieldErrors.push(`${rule.field} must be a valid email address`);
                        }
                        break;
                    case 'date':
                        if (isNaN(Date.parse(value))) {
                            fieldErrors.push(`${rule.field} must be a valid date`);
                        }
                        break;
                    case 'boolean':
                        if (typeof value !== 'boolean') {
                            fieldErrors.push(`${rule.field} must be a boolean`);
                        }
                        break;
                    case 'array':
                        if (!Array.isArray(value)) {
                            fieldErrors.push(`${rule.field} must be an array`);
                        }
                        break;
                }
            }
            // Min/Max length for strings
            if (rule.rules.type === 'string' && typeof value === 'string') {
                if (rule.rules.min !== undefined && value.length < rule.rules.min) {
                    fieldErrors.push(`${rule.field} must be at least ${rule.rules.min} characters`);
                }
                if (rule.rules.max !== undefined && value.length > rule.rules.max) {
                    fieldErrors.push(`${rule.field} must be at most ${rule.rules.max} characters`);
                }
            }
            // Min/Max for numbers
            if (rule.rules.type === 'number' && typeof value === 'number') {
                if (rule.rules.min !== undefined && value < rule.rules.min) {
                    fieldErrors.push(`${rule.field} must be at least ${rule.rules.min}`);
                }
                if (rule.rules.max !== undefined && value > rule.rules.max) {
                    fieldErrors.push(`${rule.field} must be at most ${rule.rules.max}`);
                }
            }
            // Pattern validation
            if (rule.rules.pattern && typeof value === 'string') {
                if (!rule.rules.pattern.test(value)) {
                    fieldErrors.push(`${rule.field} format is invalid`);
                }
            }
            // Enum validation
            if (rule.rules.enum && !rule.rules.enum.includes(value)) {
                fieldErrors.push(`${rule.field} must be one of: ${rule.rules.enum.join(', ')}`);
            }
            // Custom validation
            if (rule.rules.custom) {
                const customResult = rule.rules.custom(value);
                if (customResult !== true) {
                    fieldErrors.push(customResult || `${rule.field} validation failed`);
                }
            }
            if (fieldErrors.length > 0) {
                errors[rule.field] = fieldErrors;
            }
        }
        if (Object.keys(errors).length > 0) {
            return response_1.ResponseHelper.validationError(res, 'Validation failed', errors);
        }
        next();
    };
}
//# sourceMappingURL=validator.js.map