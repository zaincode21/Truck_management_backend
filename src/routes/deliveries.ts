import { Router } from 'express';
import { prisma } from '../lib/prisma';
// Authentication removed - API is now public

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
    // Authentication removed - user tracking disabled
    const user = undefined;
    
    // Build query - no filtering for drivers
    const where: any = {};
    
    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        product: true,
        truck: true,
        employee: true,
        turnboy: true
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
    // Authentication removed - user tracking disabled
    const user = undefined;
    const deliveryId = parseInt(req.params.id);
    
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        product: true,
        truck: true,
        employee: true,
        turnboy: true
      }
    });
    
    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    // Authentication removed - no access restrictions
    
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
 *                 enum: [pending, delivered]
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
// Helper function to normalize location name (lowercase, remove special chars, keep only alphanumeric)
function normalizeLocation(location: string): string {
  return location
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // Remove special chars, keep only lowercase letters and numbers
}

// Helper function to get next sequential number for origin-destination-date combination
async function getNextDeliveryNumber(origin: string, destination: string, deliveryDate: Date): Promise<string> {
  // Format date as yyyy-mm-dd
  const year = deliveryDate.getFullYear();
  const month = String(deliveryDate.getMonth() + 1).padStart(2, '0');
  const day = String(deliveryDate.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  // Normalize origin and destination
  const originPart = normalizeLocation(origin);
  const destinationPart = normalizeLocation(destination);
  
  // Create prefix: origin-destination-yyyy-mm-dd
  const codePrefix = `${originPart}-${destinationPart}-${dateStr}`;
  
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
  
  // Extract the highest number from existing codes (format: prefix-1, prefix-2, etc.)
  let maxNumber = 0;
  existingDeliveries.forEach(delivery => {
    const match = delivery.delivery_code.match(/-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  });
  
  // Return next number: origin-destination-yyyy-mm-dd-1, origin-destination-yyyy-mm-dd-2, etc.
  const nextNumber = maxNumber + 1;
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
    // Authentication removed - user tracking disabled
    const user = undefined;
    
    // Parse delivery date first
    const deliveryDate = parseDate(req.body.delivery_date);
    
    // Auto-generate delivery code if not provided
    let deliveryCode = req.body.delivery_code;
    if (!deliveryCode || deliveryCode.trim() === '') {
      if (!req.body.origin || !req.body.destination) {
        return res.status(400).json({ error: 'Origin and destination are required to generate delivery code' });
      }
      deliveryCode = await getNextDeliveryNumber(req.body.origin, req.body.destination, deliveryDate);
    }
    
    // Validate that delivery code is unique
    const existingDelivery = await prisma.delivery.findUnique({
      where: { delivery_code: deliveryCode }
    });
    
    if (existingDelivery) {
      // If provided code exists, regenerate with date
      deliveryCode = await getNextDeliveryNumber(req.body.origin, req.body.destination, deliveryDate);
    }

    const delivery = await prisma.delivery.create({
      data: {
        delivery_code: deliveryCode,
        product_id: parseInt(req.body.product_id),
        car_id: parseInt(req.body.car_id),
        employee_id: parseInt(req.body.employee_id),
        turnboy_id: req.body.turnboy_id ? parseInt(req.body.turnboy_id) : null,
        origin: req.body.origin,
        destination: req.body.destination,
        delivery_date: deliveryDate,
        status: req.body.status || 'pending',
        cost: parseFloat(req.body.cost),
        fuel_cost: parseFloat(req.body.fuel_cost),
        mileage_cost: parseFloat(req.body.mileage_cost) || 0,
        tax: parseFloat(req.body.tax) || 0,
        price: parseFloat(req.body.price),
        total_income: parseFloat(req.body.total_income),
        created_by: null,
        notes: req.body.notes || null
      },
      include: {
        product: true,
        truck: true,
        employee: true,
        turnboy: true
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
 *                 enum: [pending, delivered]
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
 *             status: 'delivered'
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
    // Authentication removed - user tracking disabled
    const user = undefined;
    const deliveryId = parseInt(req.params.id);
    
    // Check if delivery exists
    const existingDelivery = await prisma.delivery.findUnique({
      where: { id: deliveryId }
    });
    
    if (!existingDelivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    const delivery = await prisma.delivery.update({
      where: { id: parseInt(req.params.id) },
      data: {
        delivery_code: req.body.delivery_code,
        product_id: parseInt(req.body.product_id),
        car_id: parseInt(req.body.car_id),
        employee_id: parseInt(req.body.employee_id),
        turnboy_id: req.body.turnboy_id ? parseInt(req.body.turnboy_id) : null,
        origin: req.body.origin,
        destination: req.body.destination,
        delivery_date: new Date(req.body.delivery_date),
        status: req.body.status,
        cost: parseFloat(req.body.cost),
        fuel_cost: parseFloat(req.body.fuel_cost),
        mileage_cost: parseFloat(req.body.mileage_cost) || 0,
        tax: parseFloat(req.body.tax) || 0,
        price: parseFloat(req.body.price),
        total_income: parseFloat(req.body.total_income),
        notes: req.body.notes
      },
      include: {
        product: true,
        truck: true,
        employee: true,
        turnboy: true
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
    // Authentication removed - user tracking disabled
    const user = undefined;
    const deliveryId = parseInt(req.params.id);
    
    // Check if delivery exists
    const existingDelivery = await prisma.delivery.findUnique({
      where: { id: deliveryId }
    });
    
    if (!existingDelivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    await prisma.delivery.delete({
      where: { id: deliveryId }
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete delivery' });
  }
});

export default router;
