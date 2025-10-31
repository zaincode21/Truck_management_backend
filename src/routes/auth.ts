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

    // Check if it's an admin login (hardcoded admin credentials)
    if (email === 'admin@truckflow.com' && password === 'admin123') {
      const token = Buffer.from(`admin:${email}:${Date.now()}`).toString('base64');
      const expiresIn = rememberMe ? '30d' : '1d';

      return res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: 'admin',
          email: email,
          name: 'Admin User',
          role: 'admin'
        },
        token,
        expiresIn
      });
    }

    // Check if it's an employee/driver login
    // Password for all employees is "driver123"
    if (password === 'driver123') {
      const employee = await prisma.employee.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: {
          truck: true
        }
      });

      if (!employee) {
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

      // Generate token for driver/employee
      const token = Buffer.from(`employee:${employee.id}:${email}:${Date.now()}`).toString('base64');
      const expiresIn = rememberMe ? '30d' : '1d';

      return res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: employee.id.toString(),
          email: employee.email,
          name: employee.name,
          role: 'driver',
          employee_id: employee.id,
          truck_id: employee.truck_id
        },
        token,
        expiresIn
      });
    }

    // Invalid credentials
    return res.status(401).json({
      success: false,
      error: 'Invalid email or password'
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
      } else if (parts[0] === 'employee') {
        // Employee/Driver user
        const employeeId = parseInt(parts[1]);
        const employee = await prisma.employee.findUnique({
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
      } else {
        return res.status(401).json({
          success: false,
          error: 'Invalid token format'
        });
      }
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
      } else if (parts[0] === 'employee') {
        // Employee/Driver user
        const employeeId = parseInt(parts[1]);
        const employee = await prisma.employee.findUnique({
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
      } else {
        return res.status(401).json({
          success: false,
          error: 'Invalid token format'
        });
      }
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


