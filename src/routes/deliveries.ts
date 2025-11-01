import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * @swagger
 * /api/deliveries:
 *   get:
 *     tags: [Deliveries]
 *     summary: Get all deliveries
 *     description: Retrieves a list of all deliveries with product, truck, and employee information
 *     responses:
 *       200:
 *         description: List of deliveries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Delivery'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
  try {
    const deliveries = await prisma.delivery.findMany({
      include: {
        product: true,
        truck: true,
        employee: true
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(deliveries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

/**
 * @swagger
 * /api/deliveries/{id}:
 *   get:
 *     tags: [Deliveries]
 *     summary: Get a specific delivery
 *     description: Retrieves detailed information about a specific delivery including related product, truck, and employee
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Delivery ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Delivery retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Delivery'
 *       404:
 *         description: Delivery not found
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
    const delivery = await prisma.delivery.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        product: true,
        truck: true,
        employee: true
      }
    });
    
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch delivery' });
  }
});

/**
 * @swagger
 * /api/deliveries:
 *   post:
 *     tags: [Deliveries]
 *     summary: Create a new delivery
 *     description: Creates a new delivery in the system
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_id
 *               - car_id
 *               - employee_id
 *               - origin
 *               - destination
 *               - delivery_date
 *               - cost
 *               - fuel_cost
 *               - price
 *             properties:
 *               delivery_code:
 *                 type: string
 *                 example: 'KIGALI-BUTARE-0001'
 *                 description: 'Optional - will be auto-generated if not provided (format: ORIGIN-DESTINATION-4DIGIT)'
 *               product_id:
 *                 type: integer
 *                 example: 1
 *               car_id:
 *                 type: integer
 *                 example: 1
 *               employee_id:
 *                 type: integer
 *                 example: 1
 *               origin:
 *                 type: string
 *                 example: 'Kigali Warehouse'
 *               destination:
 *                 type: string
 *                 example: 'Butare Distribution Center'
 *               delivery_date:
 *                 type: string
 *                 format: date
 *                 example: '2023-10-30'
 *               status:
 *                 type: string
 *                 enum: [pending, in-transit, delivered, cancelled]
 *                 example: 'pending'
 *               cost:
 *                 type: number
 *                 example: 15000
 *               fuel_cost:
 *                 type: number
 *                 example: 8000
 *               price:
 *                 type: number
 *                 example: 30000
 *               total_income:
 *                 type: number
 *                 example: 30000
 *               notes:
 *                 type: string
 *                 example: 'Handle with care - fragile items'
 *                 nullable: true
 *           example:
 *             product_id: 1
 *             car_id: 1
 *             employee_id: 1
 *             origin: 'Kigali Warehouse'
 *             destination: 'Butare Distribution Center'
 *             delivery_date: '2023-10-30'
 *             status: 'pending'
 *             cost: 15000
 *             fuel_cost: 8000
 *             price: 30000
 *             total_income: 30000
 *             notes: 'Handle with care - fragile items'
 *     responses:
 *       201:
 *         description: Delivery created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Delivery'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Helper function to generate delivery code
function generateDeliveryCode(origin: string, destination: string): string {
  // Clean and format origin (take first word, uppercase, remove special chars)
  const originPart = origin
    .trim()
    .split(/[\s,-]+/)[0] // Take first word
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ''); // Remove special chars
  
  // Clean and format destination (take first word, uppercase, remove special chars)
  const destinationPart = destination
    .trim()
    .split(/[\s,-]+/)[0] // Take first word
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ''); // Remove special chars
  
  // Combine: ORIGIN-DESTINATION
  return `${originPart}-${destinationPart}`;
}

// Helper function to get next sequential number for origin-destination pair
async function getNextDeliveryNumber(origin: string, destination: string): Promise<string> {
  const codePrefix = generateDeliveryCode(origin, destination);
  
  // Find all deliveries with the same prefix
  const existingDeliveries = await prisma.delivery.findMany({
    where: {
      delivery_code: {
        startsWith: codePrefix
      }
    },
    orderBy: {
      delivery_code: 'desc'
    }
  });
  
  // Extract the highest number from existing codes
  let maxNumber = 0;
  existingDeliveries.forEach(delivery => {
    const match = delivery.delivery_code.match(/-(\d{4})$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  });
  
  // Return next number as 4-digit string (0001, 0002, etc.)
  const nextNumber = (maxNumber + 1).toString().padStart(4, '0');
  return `${codePrefix}-${nextNumber}`;
}

// Helper function to parse date from yyyy-MMM-dd format (e.g., 2025-Jan-15)
function parseDate(dateString: string): Date {
  // Check if date is in yyyy-MMM-dd format (e.g., 2025-Jan-15)
  const yyyyMmmDdPattern = /^(\d{4})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2})$/
  const match = dateString.match(yyyyMmmDdPattern)
  
  if (match) {
    const year = parseInt(match[1])
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = monthNames.indexOf(match[2])
    const day = parseInt(match[3])
    
    if (month !== -1 && day >= 1 && day <= 31) {
      return new Date(year, month, day)
    }
  }
  
  // Fallback to standard date parsing
  return new Date(dateString)
}

router.post('/', async (req, res) => {
  try {
    // Auto-generate delivery code if not provided
    let deliveryCode = req.body.delivery_code;
    if (!deliveryCode || deliveryCode.trim() === '') {
      if (!req.body.origin || !req.body.destination) {
        return res.status(400).json({ error: 'Origin and destination are required to generate delivery code' });
      }
      deliveryCode = await getNextDeliveryNumber(req.body.origin, req.body.destination);
    }
    
    // Validate that delivery code is unique
    const existingDelivery = await prisma.delivery.findUnique({
      where: { delivery_code: deliveryCode }
    });
    
    if (existingDelivery) {
      // If provided code exists, regenerate
      deliveryCode = await getNextDeliveryNumber(req.body.origin, req.body.destination);
    }

    const delivery = await prisma.delivery.create({
      data: {
        delivery_code: deliveryCode,
        product_id: parseInt(req.body.product_id),
        car_id: parseInt(req.body.car_id),
        employee_id: parseInt(req.body.employee_id),
        origin: req.body.origin,
        destination: req.body.destination,
        delivery_date: parseDate(req.body.delivery_date),
        status: req.body.status || 'pending',
        cost: parseFloat(req.body.cost),
        fuel_cost: parseFloat(req.body.fuel_cost),
        price: parseFloat(req.body.price),
        total_income: parseFloat(req.body.total_income),
        notes: req.body.notes || null
      },
      include: {
        product: true,
        truck: true,
        employee: true
      }
    });
    res.status(201).json(delivery);
  } catch (error) {
    console.error('Error creating delivery:', error);
    res.status(400).json({ error: 'Failed to create delivery', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * @swagger
 * /api/deliveries/{id}:
 *   put:
 *     tags: [Deliveries]
 *     summary: Update a delivery
 *     description: Updates an existing delivery's information
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Delivery ID
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
 *               delivery_code:
 *                 type: string
 *                 example: 'DEL-2023-001'
 *               product_id:
 *                 type: integer
 *                 example: 1
 *               car_id:
 *                 type: integer
 *                 example: 1
 *               employee_id:
 *                 type: integer
 *                 example: 1
 *               origin:
 *                 type: string
 *                 example: 'Kigali Warehouse'
 *               destination:
 *                 type: string
 *                 example: 'Butare Distribution Center'
 *               delivery_date:
 *                 type: string
 *                 format: date
 *                 example: '2023-10-30'
 *               status:
 *                 type: string
 *                 enum: [pending, in-transit, delivered, cancelled]
 *                 example: 'in-transit'
 *               cost:
 *                 type: number
 *                 example: 15000
 *               fuel_cost:
 *                 type: number
 *                 example: 8000
 *               price:
 *                 type: number
 *                 example: 30000
 *               total_income:
 *                 type: number
 *                 example: 30000
 *               notes:
 *                 type: string
 *                 example: 'Updated delivery notes'
 *                 nullable: true
 *           example:
 *             delivery_code: 'KIGALI-BUTARE-001'
 *             status: 'in-transit'
 *             cost: 15000
 *             fuel_cost: 8000
 *             price: 30000
 *             notes: 'Updated delivery notes'
 *     responses:
 *       200:
 *         description: Delivery updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Delivery'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Delivery not found
 */
router.put('/:id', async (req, res) => {
  try {
    const delivery = await prisma.delivery.update({
      where: { id: parseInt(req.params.id) },
      data: {
        delivery_code: req.body.delivery_code,
        product_id: parseInt(req.body.product_id),
        car_id: parseInt(req.body.car_id),
        employee_id: parseInt(req.body.employee_id),
        origin: req.body.origin,
        destination: req.body.destination,
        delivery_date: new Date(req.body.delivery_date),
        status: req.body.status,
        cost: parseFloat(req.body.cost),
        fuel_cost: parseFloat(req.body.fuel_cost),
        price: parseFloat(req.body.price),
        total_income: parseFloat(req.body.total_income),
        notes: req.body.notes
      },
      include: {
        product: true,
        truck: true,
        employee: true
      }
    });
    res.json(delivery);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update delivery' });
  }
});

/**
 * @swagger
 * /api/deliveries/{id}:
 *   delete:
 *     tags: [Deliveries]
 *     summary: Delete a delivery
 *     description: Deletes a delivery from the system
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Delivery ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       204:
 *         description: Delivery deleted successfully
 *       400:
 *         description: Unable to delete delivery
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Delivery not found
 */
router.delete('/:id', async (req, res) => {
  try {
    await prisma.delivery.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete delivery' });
  }
});

export default router;
