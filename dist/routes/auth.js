"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const jwt_1 = require("../utils/jwt");
const password_1 = require("../utils/password");
const sanitize_1 = require("../utils/sanitize");
const accountLockout_1 = require("../middleware/accountLockout");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: User login
 *     description: Authenticate user and return session token. Use this token in the "Authorize" button above.
 *     security: []  # No authentication required for login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'admin@truckflow.com'
 *               password:
 *                 type: string
 *                 example: 'admin123'
 *               rememberMe:
 *                 type: boolean
 *                 example: true
 *           example:
 *             email: 'admin@truckflow.com'
 *             password: 'admin123'
 *             rememberMe: true
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Login successful'
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: '1'
 *                     email:
 *                       type: string
 *                       example: 'admin@truckflow.com'
 *                     name:
 *                       type: string
 *                       example: 'Admin User'
 *                     role:
 *                       type: string
 *                       example: 'admin'
 *                 token:
 *                   type: string
 *                   example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: 'Invalid email or password'
 *       400:
 *         description: Bad request
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password, rememberMe } = req.body;
        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }
        // Sanitize and normalize email
        let normalizedEmail;
        try {
            normalizedEmail = (0, sanitize_1.sanitizeEmail)(email);
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }
        // Check if it's a User (admin/views) login
        const user = await prisma_1.prisma.user.findUnique({
            where: { email: normalizedEmail }
        });
        if (user) {
            // Verify password using bcrypt
            const passwordMatch = await (0, password_1.comparePassword)(password, user.password);
            if (!passwordMatch) {
                (0, accountLockout_1.recordFailedAttempt)(normalizedEmail);
                console.error('Login failed - Password mismatch:', {
                    email: normalizedEmail,
                    userId: user.id,
                    userStatus: user.status
                });
                return res.status(401).json({
                    success: false,
                    error: 'Invalid email or password'
                });
            }
            // Check if user is active
            if (user.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    error: 'Your account is not active. Please contact administrator.'
                });
            }
            // Clear failed attempts on successful login
            (0, accountLockout_1.clearFailedAttempts)(normalizedEmail);
            // Generate JWT tokens
            const accessToken = (0, jwt_1.generateAccessToken)({
                id: user.id.toString(),
                email: user.email,
                role: user.role
            });
            const refreshToken = (0, jwt_1.generateRefreshToken)({
                id: user.id.toString(),
                email: user.email,
                role: user.role
            });
            return res.json({
                success: true,
                message: 'Login successful',
                user: {
                    id: user.id.toString(),
                    email: user.email,
                    name: user.name,
                    role: user.role
                },
                token: accessToken,
                refreshToken: refreshToken,
                expiresIn: rememberMe ? '7d' : '24h'
            });
        }
        // Check if it's an employee/driver login
        const employee = await prisma_1.prisma.employee.findUnique({
            where: { email: normalizedEmail },
            include: {
                truck: true
            }
        });
        if (employee) {
            // Check if employee has a password set
            let passwordMatch = false;
            if (employee.password) {
                passwordMatch = await (0, password_1.comparePassword)(password, employee.password);
            }
            else {
                // Backward compatibility: check default password "driver123"
                passwordMatch = password === 'driver123';
            }
            if (!passwordMatch) {
                (0, accountLockout_1.recordFailedAttempt)(normalizedEmail);
                return res.status(401).json({
                    success: false,
                    error: 'Invalid email or password'
                });
            }
            // Check if employee is active
            if (employee.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    error: 'Your account is not active. Please contact administrator.'
                });
            }
            // Clear failed attempts on successful login
            (0, accountLockout_1.clearFailedAttempts)(normalizedEmail);
            // Use role from database, default to 'driver' if not set
            const userRole = employee.role || 'driver';
            // Generate JWT tokens
            const accessToken = (0, jwt_1.generateAccessToken)({
                id: employee.id.toString(),
                email: employee.email,
                role: userRole,
                employee_id: employee.id,
                truck_id: employee.truck_id
            });
            const refreshToken = (0, jwt_1.generateRefreshToken)({
                id: employee.id.toString(),
                email: employee.email,
                role: userRole,
                employee_id: employee.id,
                truck_id: employee.truck_id
            });
            return res.json({
                success: true,
                message: 'Login successful',
                user: {
                    id: employee.id.toString(),
                    email: employee.email,
                    name: employee.name,
                    role: userRole,
                    employee_id: employee.id,
                    truck_id: employee.truck_id
                },
                token: accessToken,
                refreshToken: refreshToken,
                expiresIn: rememberMe ? '7d' : '24h'
            });
        }
        // Invalid credentials
        (0, accountLockout_1.recordFailedAttempt)(normalizedEmail);
        return res.status(401).json({
            success: false,
            error: 'Invalid email or password'
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred during login'
        });
    }
});
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: User logout
 *     description: Logout user and invalidate session
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Logout successful'
 */
router.post('/logout', async (req, res) => {
    try {
        // In production, you would:
        // 1. Invalidate the JWT token
        // 2. Clear session data
        // 3. Remove from active sessions list
        res.json({
            success: true,
            message: 'Logout successful'
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred during logout'
        });
    }
});
/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     tags: [Authentication]
 *     summary: Verify authentication token
 *     description: Check if the current session/token is valid
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: Invalid or expired token
 */
router.get('/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        const token = authHeader.substring(7);
        try {
            const decoded = Buffer.from(token, 'base64').toString('utf-8');
            const parts = decoded.split(':');
            if (parts[0] === 'admin') {
                // Admin user
                return res.json({
                    success: true,
                    user: {
                        id: 'admin',
                        email: parts[1],
                        name: 'Admin User',
                        role: 'admin'
                    }
                });
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
                return res.json({
                    success: true,
                    user: {
                        id: user.id.toString(),
                        email: user.email,
                        name: user.name,
                        role: user.role
                    }
                });
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
                return res.json({
                    success: true,
                    user: {
                        id: employee.id.toString(),
                        email: employee.email,
                        name: employee.name,
                        role: userRole,
                        employee_id: employee.id,
                        truck_id: employee.truck_id
                    }
                });
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
        console.error('Verify error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred during verification'
        });
    }
});
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get current user
 *     description: Retrieve the currently authenticated user's information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *       401:
 *         description: Not authenticated
 */
router.get('/me', async (req, res) => {
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
                return res.json({
                    success: true,
                    user: {
                        id: 'admin',
                        email: parts[1],
                        name: 'Admin User',
                        role: 'admin'
                    }
                });
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
                return res.json({
                    success: true,
                    user: {
                        id: user.id.toString(),
                        email: user.email,
                        name: user.name,
                        role: user.role
                    }
                });
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
                return res.json({
                    success: true,
                    user: {
                        id: employee.id.toString(),
                        email: employee.email,
                        name: employee.name,
                        role: 'driver',
                        employee_id: employee.id,
                        truck_id: employee.truck_id
                    }
                });
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
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred'
        });
    }
});
/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     tags: [Authentication]
 *     summary: Update user profile
 *     description: Update the currently authenticated user's profile information
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Updated Name'
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'updated@truckflow.com'
 *               phone:
 *                 type: string
 *                 example: '+250788123456'
 *           example:
 *             name: 'Updated Name'
 *             email: 'updated@truckflow.com'
 *             phone: '+250788123456'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Not authenticated
 */
router.put('/profile', async (req, res) => {
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
                // Admin user - just return success (in production, would update admin user in database)
                return res.json({
                    success: true,
                    message: 'Profile updated successfully',
                    user: {
                        id: 'admin',
                        email: req.body.email || parts[1],
                        name: req.body.name || 'Admin User',
                        role: 'admin'
                    }
                });
            }
            else if (parts[0] === 'user') {
                // User (admin/views from users table) - update user record
                const userId = parseInt(parts[1]);
                const updateData = {};
                if (req.body.name)
                    updateData.name = req.body.name.trim();
                if (req.body.email)
                    updateData.email = req.body.email.toLowerCase().trim();
                if (Object.keys(updateData).length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'No fields to update'
                    });
                }
                const user = await prisma_1.prisma.user.update({
                    where: { id: userId },
                    data: updateData
                });
                return res.json({
                    success: true,
                    message: 'Profile updated successfully',
                    user: {
                        id: user.id.toString(),
                        email: user.email,
                        name: user.name,
                        role: user.role
                    }
                });
            }
            else if (parts[0] === 'employee') {
                // Employee/Driver user - update employee record
                const employeeId = parseInt(parts[1]);
                const updateData = {};
                if (req.body.name)
                    updateData.name = req.body.name.trim();
                if (req.body.email)
                    updateData.email = req.body.email.toLowerCase().trim();
                if (req.body.phone)
                    updateData.phone = req.body.phone.trim();
                if (Object.keys(updateData).length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'No fields to update'
                    });
                }
                const employee = await prisma_1.prisma.employee.update({
                    where: { id: employeeId },
                    data: updateData,
                    include: { truck: true }
                });
                // Use role from database, default to 'driver' if not set
                const userRole = employee.role || 'driver';
                return res.json({
                    success: true,
                    message: 'Profile updated successfully',
                    user: {
                        id: employee.id.toString(),
                        email: employee.email,
                        name: employee.name,
                        phone: employee.phone,
                        role: userRole,
                        employee_id: employee.id,
                        truck_id: employee.truck_id
                    }
                });
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
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'An error occurred'
        });
    }
});
/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: [Authentication]
 *     summary: Change user password
 *     description: Change the currently authenticated user's password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: 'oldpassword123'
 *               newPassword:
 *                 type: string
 *                 example: 'newpassword123'
 *           example:
 *             currentPassword: 'oldpassword123'
 *             newPassword: 'newpassword123'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Not authenticated or invalid current password
 */
router.post('/change-password', auth_1.authenticateUser, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current password and new password are required'
            });
        }
        // Validate password strength
        const validation = (0, password_1.validatePassword)(newPassword);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: 'Password does not meet requirements',
                details: validation.errors
            });
        }
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated'
            });
        }
        // Handle user password change
        if (req.user.role === 'admin' || req.user.role === 'views') {
            const userId = parseInt(req.user.id);
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: userId }
            });
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            // Verify current password
            const passwordMatch = await (0, password_1.comparePassword)(currentPassword, user.password);
            if (!passwordMatch) {
                return res.status(401).json({
                    success: false,
                    error: 'Current password is incorrect'
                });
            }
            // Update password with stronger hashing
            const hashedPassword = await (0, password_1.hashPassword)(newPassword, 12);
            await prisma_1.prisma.user.update({
                where: { id: userId },
                data: { password: hashedPassword }
            });
            return res.json({
                success: true,
                message: 'Password changed successfully'
            });
        }
        // Handle employee password change
        else if (req.user.employee_id) {
            const employeeId = req.user.employee_id;
            const employee = await prisma_1.prisma.employee.findUnique({
                where: { id: employeeId }
            });
            if (!employee) {
                return res.status(404).json({
                    success: false,
                    error: 'Employee not found'
                });
            }
            // Check if employee has a password set
            let passwordMatch = false;
            if (employee.password) {
                passwordMatch = await (0, password_1.comparePassword)(currentPassword, employee.password);
            }
            else {
                // Backward compatibility: check default password "driver123"
                passwordMatch = currentPassword === 'driver123';
            }
            if (!passwordMatch) {
                return res.status(401).json({
                    success: false,
                    error: 'Current password is incorrect'
                });
            }
            // Update password with stronger hashing
            const hashedPassword = await (0, password_1.hashPassword)(newPassword, 12);
            await prisma_1.prisma.employee.update({
                where: { id: employeeId },
                data: { password: hashedPassword }
            });
            return res.json({
                success: true,
                message: 'Password changed successfully'
            });
        }
        else {
            return res.status(401).json({
                success: false,
                error: 'Invalid user type'
            });
        }
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'An error occurred'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map