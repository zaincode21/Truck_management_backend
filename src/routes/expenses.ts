import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * @swagger
 * /api/expenses:
 *   get:
 *     tags: [Expenses]
 *     summary: Get all expenses
 *     description: Retrieves a list of all expenses with related truck information
 *     responses:
 *       200:
 *         description: List of expenses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Expense'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      include: {
        truck: true
      },
      orderBy: { expense_date: 'desc' }
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

/**
 * @swagger
 * /api/expenses/{id}:
 *   get:
 *     tags: [Expenses]
 *     summary: Get a specific expense
 *     description: Retrieves detailed information about a specific expense including related truck
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Expense ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Expense retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       404:
 *         description: Expense not found
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
    const expense = await prisma.expense.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        truck: true
      }
    });
    
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
});

/**
 * @swagger
 * /api/expenses:
 *   post:
 *     tags: [Expenses]
 *     summary: Create a new expense
 *     description: Creates a new expense in the system
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - car_id
 *               - expense_type
 *               - amount
 *               - expense_date
 *             properties:
 *               car_id:
 *                 type: integer
 *                 example: 1
 *               expense_type:
 *                 type: string
 *                 enum: [fuel, maintenance, repair, insurance, other]
 *                 example: 'fuel'
 *               amount:
 *                 type: number
 *                 example: 50000
 *               expense_date:
 *                 type: string
 *                 format: date
 *                 example: '2023-10-30'
 *               description:
 *                 type: string
 *                 example: 'Fuel refill at station ABC'
 *                 nullable: true
 *           example:
 *             car_id: 1
 *             expense_type: 'fuel'
 *             amount: 50000
 *             expense_date: '2023-10-30'
 *             description: 'Fuel refill at station ABC'
 *     responses:
 *       201:
 *         description: Expense created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req, res) => {
  try {
    const expense = await prisma.expense.create({
      data: {
        car_id: parseInt(req.body.car_id),
        expense_type: req.body.expense_type,
        amount: parseFloat(req.body.amount),
        expense_date: new Date(req.body.expense_date),
        description: req.body.description || null
      },
      include: {
        truck: true
      }
    });
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create expense' });
  }
});

/**
 * @swagger
 * /api/expenses/{id}:
 *   put:
 *     tags: [Expenses]
 *     summary: Update an expense
 *     description: Updates an existing expense's information
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Expense ID
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
 *               car_id:
 *                 type: integer
 *                 example: 1
 *               expense_type:
 *                 type: string
 *                 enum: [fuel, maintenance, repair, insurance, other]
 *                 example: 'fuel'
 *               amount:
 *                 type: number
 *                 example: 50000
 *               expense_date:
 *                 type: string
 *                 format: date
 *                 example: '2023-10-30'
 *               description:
 *                 type: string
 *                 example: 'Updated fuel refill description'
 *                 nullable: true
 *           example:
 *             car_id: 1
 *             expense_type: 'fuel'
 *             amount: 55000
 *             expense_date: '2023-10-31'
 *             description: 'Updated fuel refill description'
 *     responses:
 *       200:
 *         description: Expense updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Expense not found
 */
router.put('/:id', async (req, res) => {
  try {
    const expense = await prisma.expense.update({
      where: { id: parseInt(req.params.id) },
      data: {
        car_id: parseInt(req.body.car_id),
        expense_type: req.body.expense_type,
        amount: parseFloat(req.body.amount),
        expense_date: new Date(req.body.expense_date),
        description: req.body.description
      },
      include: {
        truck: true
      }
    });
    res.json(expense);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update expense' });
  }
});

/**
 * @swagger
 * /api/expenses/{id}:
 *   delete:
 *     tags: [Expenses]
 *     summary: Delete an expense
 *     description: Deletes an expense from the system
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Expense ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       204:
 *         description: Expense deleted successfully
 *       400:
 *         description: Unable to delete expense
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Expense not found
 */
router.delete('/:id', async (req, res) => {
  try {
    await prisma.expense.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete expense' });
  }
});

export default router;
