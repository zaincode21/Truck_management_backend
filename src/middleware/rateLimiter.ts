import { Request, Response, NextFunction } from 'express';
import { ResponseHelper } from '../utils/response';

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis-based rate limiting
 */
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

/**
 * Rate Limiter Middleware
 */
export function rateLimiter(
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxRequests: number = 100 // 100 requests per window
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Clean up expired entries
    Object.keys(store).forEach((k) => {
      if (store[k].resetTime < now) {
        delete store[k];
      }
    });

    // Get or create rate limit entry
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (maxRequests - 1).toString());
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
      return next();
    }

    // Increment count
    store[key].count++;

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - store[key].count);
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString());

    // Check if limit exceeded
    if (store[key].count > maxRequests) {
      return ResponseHelper.error(
        res,
        'Too many requests, please try again later',
        429,
        'Rate limit exceeded',
        undefined,
        {
          timestamp: new Date().toISOString(),
        }
      );
    }

    next();
  };
}



















