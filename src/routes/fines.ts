import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateUser, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/fines:
 *   get:
 *     tags: [Fines]
 *     summary: Get all fines
 *     description: Retrieves a list of all fines with related truck and employee information
 *     responses:
 *       200:
 *         description: List of fines retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Fine'
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    
    // Build query with filtering for drivers
    const where: any = {};
    
    // If user is a driver, only show their own fines
    if (user && user.role === 'driver' && user.employee_id) {
      where.employee_id = user.employee_id;
    }
    
    const fines = await prisma.fine.findMany({
      where,
      include: {
        truck: true,
        employee: true,
        delivery: true
      },
      orderBy: { fine_date: 'desc' }
    });
    res.json(fines);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fines' });
  }
});

/**
 * @swagger
 * /api/fines/{id}:
 *   get:
 *     tags: [Fines]
 *     summary: Get a specific fine
 *     description: Retrieves detailed information about a specific fine including related truck and employee
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Fine ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Fine retrieved successfully
 *       404:
 *         description: Fine not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    const fineId = parseInt(req.params.id);
    
    const fine = await prisma.fine.findUnique({
      where: { id: fineId },
      include: {
        truck: true,
        employee: true,
        delivery: true
      }
    });
    
    if (!fine) {
      return res.status(404).json({ error: 'Fine not found' });
    }
    
    // Check if driver can access this fine
    if (user && user.role === 'driver' && user.employee_id) {
      if (fine.employee_id !== user.employee_id) {
        return res.status(403).json({ error: 'You can only view your own fines' });
      }
    }
    
    res.json(fine);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fine' });
  }
});

/**
 * @swagger
 * /api/fines:
 *   post:
 *     tags: [Fines]
 *     summary: Create a new fine
 *     description: Creates a new fine in the system
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - car_id
 *               - employee_id
 *               - fine_type
 *               - fine_date
 *               - fine_cost
 *             properties:
 *               car_id:
 *                 type: integer
 *                 example: 1
 *               employee_id:
 *                 type: integer
 *                 example: 1
 *               fine_type:
 *                 type: string
 *                 enum: [speeding, parking, overloading, traffic-light, wrong-lane, missing-documents, seat-belt, mobile-phone, dui, vehicle-defect]
 *                 example: 'speeding'
 *               fine_date:
 *                 type: string
 *                 format: date-time
 *                 example: '2025-11-01T00:00:00.000Z'
 *               fine_cost:
 *                 type: number
 *                 example: 50000
 *               description:
 *                 type: string
 *                 example: 'Speeding on highway'
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Fine created successfully
 *       400:
 *         description: Invalid input data
 */
router.post('/', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    
    // For drivers, force their employee_id and truck_id
    if (user && user.role === 'driver' && user.employee_id) {
      req.body.employee_id = user.employee_id;
      // Also force truck_id if assigned
      if (user.truck_id) {
        req.body.car_id = user.truck_id;
      }
    }
    
    const fine = await prisma.fine.create({
      data: {
        car_id: parseInt(req.body.car_id),
        employee_id: parseInt(req.body.employee_id),
        delivery_id: req.body.delivery_id ? parseInt(req.body.delivery_id) : null,
        fine_type: req.body.fine_type,
        fine_date: new Date(req.body.fine_date),
        fine_cost: parseFloat(req.body.fine_cost),
        pay_status: req.body.pay_status || 'unpaid', // Default to unpaid if not provided
        description: req.body.description || null
      },
      include: {
        truck: true,
        employee: true,
        delivery: true
      }
    });
    res.status(201).json(fine);
  } catch (error) {
    console.error('Error creating fine:', error);
    res.status(400).json({ error: 'Failed to create fine' });
  }
});

/**
 * @swagger
 * /api/fines/{id}:
 *   put:
 *     tags: [Fines]
 *     summary: Update an fine
 *     description: Updates an existing fine's information
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Fine ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               car_id:
 *                 type: integer
 *               employee_id:
 *                 type: integer
 *               fine_type:
 *                 type: string
 *               fine_date:
 *                 type: string
 *                 format: date-time
 *               fine_cost:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Fine updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Fine not found
 */
router.put('/:id', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    const fineId = parseInt(req.params.id);
    
    // Check if fine exists and belongs to driver
    if (user && user.role === 'driver' && user.employee_id) {
      const existingFine = await prisma.fine.findUnique({
        where: { id: fineId }
      });
      
      if (!existingFine) {
        return res.status(404).json({ error: 'Fine not found' });
      }
      
      if (existingFine.employee_id !== user.employee_id) {
        return res.status(403).json({ error: 'You can only edit your own fines' });
      }
      
      // Force driver's employee_id and truck_id
      req.body.employee_id = user.employee_id;
      if (user.truck_id) {
        req.body.car_id = user.truck_id;
      }
    }
    
    const updateData: any = {
      car_id: parseInt(req.body.car_id),
      employee_id: parseInt(req.body.employee_id),
      delivery_id: req.body.delivery_id ? parseInt(req.body.delivery_id) : null,
      fine_type: req.body.fine_type,
      fine_date: new Date(req.body.fine_date),
      fine_cost: parseFloat(req.body.fine_cost),
      description: req.body.description
    };
    
    // Only update pay_status if provided
    if (req.body.pay_status !== undefined) {
      updateData.pay_status = req.body.pay_status;
    }
    
    const fine = await prisma.fine.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: {
        truck: true,
        employee: true,
        delivery: true
      }
    });
    res.json(fine);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update fine' });
  }
});

/**
 * @swagger
 * /api/fines/{id}:
 *   delete:
 *     tags: [Fines]
 *     summary: Delete a fine
 *     description: Deletes a fine from the system
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Fine ID
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Fine deleted successfully
 *       400:
 *         description: Unable to delete fine
 *       404:
 *         description: Fine not found
 */
router.delete('/:id', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    const fineId = parseInt(req.params.id);
    
    // Check if fine exists and belongs to driver
    if (user && user.role === 'driver' && user.employee_id) {
      const existingFine = await prisma.fine.findUnique({
        where: { id: fineId }
      });
      
      if (!existingFine) {
        return res.status(404).json({ error: 'Fine not found' });
      }
      
      if (existingFine.employee_id !== user.employee_id) {
        return res.status(403).json({ error: 'You can only delete your own fines' });
      }
    }
    
    await prisma.fine.delete({
      where: { id: fineId }
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete fine' });
  }
});

export default router;

