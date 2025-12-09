import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
// Authentication removed - API is now public
import bcrypt from 'bcryptjs';
const router = Router();
/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users
 *     description: Retrieves a list of all users (admin and views roles only)
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });
        // Remove passwords from response
        const usersWithoutPasswords = users.map(({ password, ...user }) => user);
        res.json(usersWithoutPasswords);
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a specific user
 *     description: Retrieves detailed information about a specific user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: User ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});
/**
 * @swagger
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Create a new user
 *     description: Create a new user account with admin or views role
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, views]
 *               status:
 *                 type: string
 *                 default: active
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/', async (req, res) => {
    try {
        // Authentication removed - user tracking disabled
        const user = undefined;
        // Validate required fields
        if (!req.body.name || !req.body.email || !req.body.password || !req.body.role) {
            return res.status(400).json({
                error: 'Missing required fields: name, email, password, and role are required'
            });
        }
        // Validate role
        const validRoles = ['admin', 'views'];
        if (!validRoles.includes(req.body.role)) {
            return res.status(400).json({
                error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
            });
        }
        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: req.body.email.toLowerCase().trim() }
        });
        if (existingUser) {
            return res.status(400).json({
                error: 'A user with this email already exists'
            });
        }
        // Hash password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        // Get creator user ID
        // Note: Currently authentication uses Employee model, not User model
        // For now, we'll set created_by to null
        // In the future, if we implement User-based authentication, we can track the creator
        // We could also look up if the current user's email exists in the users table
        let createdBy = null;
        // Authentication removed - created_by tracking disabled
        const newUser = await prisma.user.create({
            data: {
                name: req.body.name.trim(),
                email: req.body.email.toLowerCase().trim(),
                password: hashedPassword,
                role: req.body.role,
                status: req.body.status || 'active',
                created_by: createdBy
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        // Remove password from response
        const { password, ...userWithoutPassword } = newUser;
        res.status(201).json(userWithoutPassword);
    }
    catch (error) {
        console.error('Error creating user:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({
                error: 'A user with this email already exists'
            });
        }
        res.status(400).json({ error: error.message || 'Failed to create user' });
    }
});
/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update a user
 *     description: Update user information
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: User ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, views]
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 */
router.put('/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Validate role if provided
        if (req.body.role) {
            const validRoles = ['admin', 'views'];
            if (!validRoles.includes(req.body.role)) {
                return res.status(400).json({
                    error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
                });
            }
        }
        // Check if email is being changed and if it's already taken
        if (req.body.email && req.body.email !== existingUser.email) {
            const emailExists = await prisma.user.findUnique({
                where: { email: req.body.email.toLowerCase().trim() }
            });
            if (emailExists) {
                return res.status(400).json({
                    error: 'A user with this email already exists'
                });
            }
        }
        // Build update data
        const updateData = {
            name: req.body.name ? req.body.name.trim() : existingUser.name,
            email: req.body.email ? req.body.email.toLowerCase().trim() : existingUser.email,
            role: req.body.role || existingUser.role,
            status: req.body.status || existingUser.status
        };
        // Hash password if provided
        if (req.body.password) {
            updateData.password = await bcrypt.hash(req.body.password, 10);
        }
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        // Remove password from response
        const { password, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
    }
    catch (error) {
        console.error('Error updating user:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({
                error: 'A user with this email already exists'
            });
        }
        res.status(400).json({ error: error.message || 'Failed to update user' });
    }
});
/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user
 *     description: Delete a user account
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: User ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */
router.delete('/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Prevent deleting yourself
        // Note: This will need to be updated when we implement User authentication
        // For now, we'll allow deletion
        await prisma.user.delete({
            where: { id: userId }
        });
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting user:', error);
        res.status(400).json({ error: error.message || 'Failed to delete user' });
    }
});
export default router;
//# sourceMappingURL=users.js.map