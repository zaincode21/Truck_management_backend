"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAccountLockout = checkAccountLockout;
exports.recordFailedAttempt = recordFailedAttempt;
exports.clearFailedAttempts = clearFailedAttempts;
exports.accountLockoutMiddleware = accountLockoutMiddleware;
const response_1 = require("../utils/response");
const lockoutStore = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes
/**
 * Check if account is locked out
 */
function checkAccountLockout(identifier) {
    const entry = lockoutStore.get(identifier);
    if (!entry) {
        return { locked: false };
    }
    // Check if lockout period has expired
    if (entry.lockoutUntil && entry.lockoutUntil > Date.now()) {
        const remainingTime = Math.ceil((entry.lockoutUntil - Date.now()) / 1000 / 60);
        return { locked: true, remainingTime };
    }
    // Reset if lockout expired
    if (entry.lockoutUntil && entry.lockoutUntil <= Date.now()) {
        lockoutStore.delete(identifier);
        return { locked: false };
    }
    return { locked: false };
}
/**
 * Record failed login attempt
 */
function recordFailedAttempt(identifier) {
    const entry = lockoutStore.get(identifier) || { attempts: 0, lockoutUntil: null };
    entry.attempts++;
    if (entry.attempts >= MAX_ATTEMPTS) {
        entry.lockoutUntil = Date.now() + LOCKOUT_DURATION;
    }
    lockoutStore.set(identifier, entry);
    // Clean up after window expires
    setTimeout(() => {
        const currentEntry = lockoutStore.get(identifier);
        if (currentEntry && !currentEntry.lockoutUntil) {
            lockoutStore.delete(identifier);
        }
    }, ATTEMPT_WINDOW);
}
/**
 * Clear failed attempts on successful login
 */
function clearFailedAttempts(identifier) {
    lockoutStore.delete(identifier);
}
/**
 * Middleware to check account lockout
 */
function accountLockoutMiddleware(req, res, next) {
    // Safely get identifier - handle case where body might not be parsed yet
    const identifier = (req.body && req.body.email) ? req.body.email : req.ip;
    const { locked, remainingTime } = checkAccountLockout(identifier);
    if (locked) {
        return response_1.ResponseHelper.error(res, `Account locked due to too many failed login attempts. Please try again in ${remainingTime} minutes.`, 429, 'Account locked');
    }
    next();
}
//# sourceMappingURL=accountLockout.js.map