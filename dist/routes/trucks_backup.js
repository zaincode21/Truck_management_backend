import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
const router = Router();
/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Get all products
 *     description: Retrieves a list of all products
 *     responses:
 *       200:
 *         description: List of products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            include: {
                _count: {
                    select: { deliveries: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });
        res.json(products);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});
/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get a specific product
 *     description: Retrieves detailed information about a specific product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Product ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
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
        const product = await prisma.product.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                deliveries: true
            }
        });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});
/**
 * @swagger
 * /api/products:
 *   post:
 *     tags: [Products]
 *     summary: Create a new product
 *     description: Creates a new product in the inventory
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Electronics Package'
 *               description:
 *                 type: string
 *                 example: 'High-quality electronics package for delivery'
 *               category:
 *                 type: string
 *                 example: 'Electronics'
 *                 nullable: true
 *               unit_price:
 *                 type: number
 *                 example: 25000
 *                 nullable: true
 *               stock_quantity:
 *                 type: integer
 *                 example: 100
 *                 nullable: true
 *           example:
 *             name: 'Electronics Package'
 *             description: 'High-quality electronics package for delivery'
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
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
        if (!req.body.name || !req.body.description) {
            return res.status(400).json({ error: 'Missing required fields: name and description are required' });
        }
        const product = await prisma.product.create({
            data: {
                name: req.body.name.trim(),
                description: req.body.description.trim(),
                ...(req.body.category && { category: req.body.category }),
                ...(req.body.unit_price !== undefined && { unit_price: req.body.unit_price }),
                ...(req.body.stock_quantity !== undefined && { stock_quantity: req.body.stock_quantity })
            }
        });
        res.status(201).json(product);
    }
    catch (error) {
        console.error('Error creating product:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'A product with this name already exists' });
        }
        res.status(400).json({ error: error.message || 'Failed to create product' });
    }
});
/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     tags: [Products]
 *     summary: Update a product
 *     description: Updates an existing product's information
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Product ID
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
 *               name:
 *                 type: string
 *                 example: 'Electronics Package'
 *               category:
 *                 type: string
 *                 example: 'Electronics'
 *               unit_price:
 *                 type: number
 *                 example: 25000
 *               stock_quantity:
 *                 type: integer
 *                 example: 100
 *               description:
 *                 type: string
 *                 example: 'High-quality electronics package'
 *                 nullable: true
 *           example:
 *             name: 'Electronics Package Updated'
 *             category: 'Electronics'
 *             unit_price: 27500
 *             stock_quantity: 150
 *             description: 'Updated description'
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Product not found
 */
router.put('/:id', async (req, res) => {
    try {
        const product = await prisma.product.update({
            where: { id: parseInt(req.params.id) },
            data: {
                name: req.body.name,
                category: req.body.category,
                unit_price: req.body.unit_price,
                stock_quantity: req.body.stock_quantity,
                description: req.body.description
            }
        });
        res.json(product);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to update product' });
    }
});
/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product
 *     description: Deletes a product from the inventory
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Product ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       204:
 *         description: Product deleted successfully
 *       400:
 *         description: Unable to delete product (may have dependencies)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Product not found
 */
router.delete('/:id', async (req, res) => {
    try {
        await prisma.product.delete({
            where: { id: parseInt(req.params.id) }
        });
        res.status(204).send();
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to delete product' });
    }
});
export default router;
//# sourceMappingURL=trucks_backup.js.map