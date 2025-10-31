import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: User login
 *     description: Authenticate user and return session token
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

    // Demo credentials for testing
    // In production, you would:
    // 1. Hash passwords with bcrypt
    // 2. Store users in database
    // 3. Verify hashed passwords
    const demoUsers = [
      {
        id: '1',
        email: 'admin@truckflow.com',
        password: 'admin123',
        name: 'Admin User',
        role: 'admin'
      },
      {
        id: '2',
        email: 'manager@truckflow.com',
        password: 'manager123',
        name: 'Manager User',
        role: 'manager'
      },
      {
        id: '3',
        email: 'driver@truckflow.com',
        password: 'driver123',
        name: 'Driver User',
        role: 'driver'
      }
    ];

    // Find user
    const user = demoUsers.find(u => u.email === email && u.password === password);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate a simple token (in production, use JWT)
    const token = Buffer.from(`${user.id}:${user.email}:${Date.now()}`).toString('base64');

    // Set session duration based on rememberMe
    const expiresIn = rememberMe ? '30d' : '1d';

    // Return success response
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token,
      expiresIn
    });

  } catch (error) {
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
  } catch (error) {
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
    
    // In production, verify JWT token here
    // For demo, decode the simple token
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [userId, email] = decoded.split(':');

      // Mock user data (in production, fetch from database)
      res.json({
        success: true,
        user: {
          id: userId,
          email: email,
          name: 'Admin User',
          role: 'admin'
        }
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

  } catch (error) {
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
      const [userId, email] = decoded.split(':');

      res.json({
        success: true,
        user: {
          id: userId,
          email: email,
          name: 'Admin User',
          role: 'admin'
        }
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred'
    });
  }
});

export default router;


