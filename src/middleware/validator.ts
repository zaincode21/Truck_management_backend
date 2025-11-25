import { Request, Response, NextFunction } from 'express';
import { ResponseHelper } from '../utils/response';

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
export function validateRequest(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: Record<string, string[]> = {};

    for (const rule of rules) {
      const value = req.body[rule.field];
      const fieldErrors: string[] = [];

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
      return ResponseHelper.validationError(res, 'Validation failed', errors);
    }

    next();
  };
}









