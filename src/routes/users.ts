import { Router } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

const router = Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users
 *     description: Retrieve a list of all users/employees with their roles
 *     responses:
 *       200:
 *         description: List of users
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const users = await prisma.employee.findMany({
      include: {
        truck: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Remove password from response
    const usersWithoutPassword = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    res.json(usersWithoutPassword);
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch users'
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     description: Retrieve a specific user by their ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: User ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.employee.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        truck: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch user'
    });
  }
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Create a new user
 *     description: Create a new user account with role assignment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - license_number
 *               - hire_date
 *               - role
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               license_number:
 *                 type: string
 *               hire_date:
 *                 type: string
 *                 format: date
 *               role:
 *                 type: string
 *                 enum: [admin, manager, driver, employee]
 *               password:
 *                 type: string
 *               truck_id:
 *                 type: integer
 *                 nullable: true
 *               status:
 *                 type: string
 *                 default: active
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, license_number, hire_date, role, password, truck_id, status } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !license_number || !hire_date || !role || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Validate role
    const validRoles = ['admin', 'driver'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    // Check if email already exists
    const existingUser = await prisma.employee.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    }

    // Check if license number already exists
    const existingLicense = await prisma.employee.findUnique({
      where: { license_number: license_number.trim() }
    });

    if (existingLicense) {
      return res.status(400).json({
        success: false,
        error: 'License number already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.employee.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        license_number: license_number.trim(),
        hire_date: new Date(hire_date),
        role: role,
        password: hashedPassword,
        truck_id: truck_id || null,
        status: status || 'active'
      },
      include: {
        truck: true
      }
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userWithoutPassword
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create user'
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update a user
 *     description: Update user information including role
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
 *                 format: email
 *               phone:
 *                 type: string
 *               license_number:
 *                 type: string
 *               hire_date:
 *                 type: string
 *                 format: date
 *               role:
 *                 type: string
 *                 enum: [admin, manager, driver, employee]
 *               password:
 *                 type: string
 *               truck_id:
 *                 type: integer
 *                 nullable: true
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
    const { name, email, phone, license_number, hire_date, role, password, truck_id, status } = req.body;

    // Check if user exists
    const existingUser = await prisma.employee.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Validate role if provided
    if (role) {
      const validRoles = ['admin', 'driver'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
        });
      }
    }

    // Check if email already exists (for another user)
    if (email && email.toLowerCase().trim() !== existingUser.email) {
      const emailExists = await prisma.employee.findUnique({
        where: { email: email.toLowerCase().trim() }
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
      }
    }

    // Check if license number already exists (for another user)
    if (license_number && license_number.trim() !== existingUser.license_number) {
      const licenseExists = await prisma.employee.findUnique({
        where: { license_number: license_number.trim() }
      });

      if (licenseExists) {
        return res.status(400).json({
          success: false,
          error: 'License number already exists'
        });
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.toLowerCase().trim();
    if (phone) updateData.phone = phone.trim();
    if (license_number) updateData.license_number = license_number.trim();
    if (hire_date) updateData.hire_date = new Date(hire_date);
    if (role) updateData.role = role;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    if (truck_id !== undefined) updateData.truck_id = truck_id || null;
    if (status) updateData.status = status;

    // Update user
    const user = await prisma.employee.update({
      where: { id: userId },
      data: updateData,
      include: {
        truck: true
      }
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'User updated successfully',
      user: userWithoutPassword
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update user'
    });
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
    const user = await prisma.employee.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Delete user
    await prisma.employee.delete({
      where: { id: userId }
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete user'
    });
  }
});

export default router;
