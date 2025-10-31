import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * @swagger
 * /api/trucks:
 *   get:
 *     tags: [Trucks]
 *     summary: Get all trucks
 *     description: Retrieves a list of all trucks with delivery and expense counts
 *     responses:
 *       200:
 *         description: List of trucks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Truck'
 *                   - type: object
 *                     properties:
 *                       _count:
 *                         type: object
 *                         properties:
 *                           deliveries:
 *                             type: integer
 *                           expenses:
 *                             type: integer
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
  try {
    const { unassigned } = req.query;
    
    // If unassigned query param is true, return only trucks not assigned to employees
    if (unassigned === 'true') {
      const trucks = await prisma.truck.findMany({
        where: {
          employees: {
            none: {} // No employees assigned
          }
        },
        include: {
          _count: {
            select: { deliveries: true, expenses: true }
          }
        },
        orderBy: { license_plate: 'asc' }
      });
      return res.json(trucks);
    }
    
    // Otherwise, return all trucks
    const trucks = await prisma.truck.findMany({
      include: {
        _count: {
          select: { deliveries: true, expenses: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(trucks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trucks' });
  }
});

/**
 * @swagger
 * /api/trucks/{id}:
 *   get:
 *     tags: [Trucks]
 *     summary: Get a specific truck
 *     description: Retrieves detailed information about a specific truck including deliveries, expenses, and employees
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Truck ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Truck retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Truck'
 *                 - type: object
 *                   properties:
 *                     deliveries:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Delivery'
 *                     expenses:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Expense'
 *                     employees:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Truck not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', async (req, res) => {
  try {
    const truck = await prisma.truck.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        deliveries: true,
        expenses: true,
        employees: true
      }
    });
    
    if (!truck) {
      return res.status(404).json({ error: 'Truck not found' });
    }
    
    res.json(truck);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch truck' });
  }
});

/**
 * @swagger
 * /api/trucks:
 *   post:
 *     tags: [Trucks]
 *     summary: Create a new truck
 *     description: Creates a new truck in the fleet with License Plate, Model, and Year. Capacity and status are set to defaults.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - license_plate
 *               - model
 *               - year
 *             properties:
 *               license_plate:
 *                 type: string
 *                 example: 'ABC-1234'
 *               model:
 *                 type: string
 *                 example: 'Volvo FH16'
 *               year:
 *                 type: integer
 *                 example: 2023
 *           example:
 *             license_plate: 'ABC-1234'
 *             model: 'Volvo FH16'
 *             year: 2023
 *     responses:
 *       201:
 *         description: Truck created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Truck'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.license_plate || !req.body.model || !req.body.year) {
      return res.status(400).json({ 
        error: 'License plate, model, and year are required' 
      });
    }

    // Validate year is a valid number
    const year = parseInt(req.body.year);
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
      return res.status(400).json({ 
        error: 'Please provide a valid year' 
      });
    }

    const truck = await prisma.truck.create({
      data: {
        license_plate: req.body.license_plate.trim(),
        model: req.body.model.trim(),
        year: year,
        capacity: 0, // Default capacity
        status: 'active', // Default status
        last_service: null // No service date initially
      }
    });
    res.status(201).json(truck);
  } catch (error: any) {
    console.error('Error creating truck:', error);
    
    // Handle unique constraint violation (duplicate license plate)
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: 'A truck with this license plate already exists' 
      });
    }
    
    res.status(400).json({ 
      error: 'Failed to create truck',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @swagger
 * /api/trucks/{id}:
 *   put:
 *     tags: [Trucks]
 *     summary: Update a truck
 *     description: Updates an existing truck's information
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Truck ID
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               license_plate:
 *                 type: string
 *                 example: 'ABC-1234'
 *               model:
 *                 type: string
 *                 example: 'Volvo FH16'
 *               year:
 *                 type: integer
 *                 example: 2023
 *               capacity:
 *                 type: number
 *                 example: 25.5
 *               status:
 *                 type: string
 *                 enum: [active, maintenance, idle, out-of-service, inactive]
 *                 example: 'active'
 *               last_service:
 *                 type: string
 *                 format: date
 *                 example: '2023-10-15'
 *                 nullable: true
 *           example:
 *             license_plate: 'ABC-1234-UPDATED'
 *             model: 'Volvo FH16'
 *             year: 2023
 *             capacity: 30.0
 *             status: 'maintenance'
 *             last_service: '2023-10-20'
 *     responses:
 *       200:
 *         description: Truck updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Truck'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Truck not found
 */
router.put('/:id', async (req, res) => {
  try {
    const truck = await prisma.truck.update({
      where: { id: parseInt(req.params.id) },
      data: {
        license_plate: req.body.license_plate,
        model: req.body.model,
        year: req.body.year,
        capacity: req.body.capacity,
        status: req.body.status,
        last_service: req.body.last_service ? new Date(req.body.last_service) : null
      }
    });
    res.json(truck);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update truck' });
  }
});

/**
 * @swagger
 * /api/trucks/{id}:
 *   delete:
 *     tags: [Trucks]
 *     summary: Delete a truck
 *     description: Deletes a truck from the fleet
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Truck ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       204:
 *         description: Truck deleted successfully
 *       400:
 *         description: Unable to delete truck (may have dependencies)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Truck not found
 */
router.delete('/:id', async (req, res) => {
  try {
    await prisma.truck.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete truck' });
  }
});

export default router;
