"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyToken = verifyToken;
exports.decodeToken = decodeToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production-min-32-chars';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
/**
 * Generate JWT access token
 */
function generateAccessToken(user) {
    const payload = {
        id: user.id,
        email: user.email || '',
        role: user.role,
        type: user.role === 'admin' ? 'admin' : (user.employee_id ? 'employee' : 'user'),
        employee_id: user.employee_id,
        truck_id: user.truck_id
    };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'truck-management-api',
        audience: 'truck-management-client'
    });
}
/**
 * Generate JWT refresh token
 */
function generateRefreshToken(user) {
    const payload = {
        id: user.id,
        email: user.email || '',
        role: user.role,
        type: user.role === 'admin' ? 'admin' : (user.employee_id ? 'employee' : 'user'),
        employee_id: user.employee_id,
        truck_id: user.truck_id
    };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES_IN,
        issuer: 'truck-management-api',
        audience: 'truck-management-client'
    });
}
/**
 * Verify JWT token
 */
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET, {
            issuer: 'truck-management-api',
            audience: 'truck-management-client'
        });
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token expired');
        }
        if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        }
        throw error;
    }
}
/**
 * Decode token without verification (for debugging)
 */
function decodeToken(token) {
    try {
        return jsonwebtoken_1.default.decode(token);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=jwt.js.map