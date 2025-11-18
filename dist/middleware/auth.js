"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = authenticateUser;
const prisma_1 = require("../lib/prisma");
/**
 * Middleware to extract and verify user from token
 */
async function authenticateUser(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated'
            });
        }
        const token = authHeader.substring(7);
        try {
            const decoded = Buffer.from(token, 'base64').toString('utf-8');
            const parts = decoded.split(':');
            if (parts[0] === 'admin') {
                // Admin user
                req.user = {
                    id: 'admin',
                    email: parts[1],
                    role: 'admin'
                };
                return next();
            }
            else if (parts[0] === 'user') {
                // User (admin/views from users table)
                const userId = parseInt(parts[1]);
                const user = await prisma_1.prisma.user.findUnique({
                    where: { id: userId }
                });
                if (!user || user.status !== 'active') {
                    return res.status(401).json({
                        success: false,
                        error: 'User not found or inactive'
                    });
                }
                req.user = {
                    id: user.id.toString(),
                    email: user.email,
                    role: user.role
                };
                return next();
            }
            else if (parts[0] === 'employee') {
                // Employee/Driver user
                const employeeId = parseInt(parts[1]);
                const employee = await prisma_1.prisma.employee.findUnique({
                    where: { id: employeeId },
                    include: { truck: true }
                });
                if (!employee || employee.status !== 'active') {
                    return res.status(401).json({
                        success: false,
                        error: 'Employee not found or inactive'
                    });
                }
                // Use role from database, default to 'driver' if not set
                const userRole = employee.role || 'driver';
                req.user = {
                    id: employee.id.toString(),
                    email: employee.email,
                    role: userRole,
                    employee_id: employee.id,
                    truck_id: employee.truck_id
                };
                return next();
            }
            else {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid token format'
                });
            }
        }
        catch (error) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }
    }
    catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred during authentication'
        });
    }
}
//# sourceMappingURL=auth.js.map