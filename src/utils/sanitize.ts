import validator from 'validator';
import xss from 'xss';

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // XSS protection
  sanitized = xss(sanitized, {
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
export function sanitizeEmail(email: string): string {
  const sanitized = sanitizeString(email);
  if (validator.isEmail(sanitized)) {
    return validator.normalizeEmail(sanitized) || sanitized;
  }
  throw new Error('Invalid email format');
}

/**
 * Sanitize number
 */
export function sanitizeNumber(input: any): number {
  const num = Number(input);
  if (isNaN(num)) {
    throw new Error('Invalid number');
  }
  return num;
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj } as any;
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]);
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null && !Array.isArray(sanitized[key])) {
      sanitized[key] = sanitizeObject(sanitized[key]);
    } else if (Array.isArray(sanitized[key])) {
      sanitized[key] = sanitized[key].map((item: any) => 
        typeof item === 'string' ? sanitizeString(item) : item
      );
    }
  }
  
  return sanitized as T;
}

