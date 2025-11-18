"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = rateLimiter;
const response_1 = require("../utils/response");
const store = {};
/**
 * Rate Limiter Middleware
 */
function rateLimiter(windowMs = 15 * 60 * 1000, // 15 minutes
maxRequests = 100 // 100 requests per window
) {
    return (req, res, next) => {
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
            return response_1.ResponseHelper.error(res, 'Too many requests, please try again later', 429, 'Rate limit exceeded', undefined, {
                timestamp: new Date().toISOString(),
            });
        }
        next();
    };
}
//# sourceMappingURL=rateLimiter.js.map