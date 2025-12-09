import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
// Authentication removed - API is now public

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
    // Authentication removed - no filtering
    const where: any = {};
    
    const expenses = await prisma.expense.findMany({
      where,
      include: {
        truck: true,
        delivery: true
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
    const expenseId = parseInt(req.params.id);
    
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        truck: true
      }
    });
    
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    // Drivers can view all expenses (no longer tied to a specific truck)
    
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
    // Authentication removed - user tracking disabled
    const user = undefined;
    
    // Drivers can create expenses for any truck (no longer tied to a specific truck)
    
    const expense = await prisma.expense.create({
      data: {
        car_id: parseInt(req.body.car_id),
        delivery_id: req.body.delivery_id ? parseInt(req.body.delivery_id) : null,
        expense_type: req.body.expense_type,
        amount: parseFloat(req.body.amount),
        expense_date: new Date(req.body.expense_date),
        description: req.body.description || null,
        created_by: null
      },
      include: {
        truck: true,
        delivery: {
          include: {
            employee: true
          }
        }
      }
    });

    // If expense type is "other", also create entries in OtherExpense and Fine tables
    if (req.body.expense_type === 'other') {
      // Get employee_id from delivery if available, otherwise use a default or the first employee
      let employeeId: number;
      
      if (expense.delivery_id && expense.delivery) {
        employeeId = expense.delivery.employee_id;
      } else {
        // If no delivery, get the first active employee as default
        const defaultEmployee = await prisma.employee.findFirst({
          where: { status: 'active' },
          orderBy: { id: 'asc' }
        });
        
        if (!defaultEmployee) {
          return res.status(400).json({ error: 'No active employee found. Cannot create fine for other expense.' });
        }
        
        employeeId = defaultEmployee.id;
      }

      // Create OtherExpense entry
      await prisma.otherExpense.create({
        data: {
          car_id: expense.car_id,
          delivery_id: expense.delivery_id,
          expense_id: expense.id,
          amount: expense.amount,
          expense_date: expense.expense_date,
          description: expense.description
        }
      });

      // Create Fine entry with unpaid status
      await prisma.fine.create({
        data: {
          car_id: expense.car_id,
          employee_id: employeeId,
          delivery_id: expense.delivery_id,
          fine_type: 'other_expense',
          fine_date: expense.expense_date,
          fine_cost: expense.amount,
          pay_status: 'unpaid',
          description: expense.description || `Other expense: ${expense.description || 'No description'}`,
          created_by: null
        }
      });
    }

    res.status(201).json(expense);
  } catch (error: any) {
    console.error('Error creating expense:', error);
    res.status(400).json({ error: 'Failed to create expense', details: error.message });
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
    // Authentication removed
    const expenseId = parseInt(req.params.id);
    
    // Drivers can edit expenses for any truck (no longer tied to a specific truck)
    // Check if expense exists
    const existingExpense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        otherExpense: true
      }
    });
    
    if (!existingExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    const wasOther = existingExpense.expense_type === 'other';
    const isNowOther = req.body.expense_type === 'other';
    
    const expense = await prisma.expense.update({
      where: { id: parseInt(req.params.id) },
      data: {
        car_id: parseInt(req.body.car_id),
        delivery_id: req.body.delivery_id ? parseInt(req.body.delivery_id) : null,
        expense_type: req.body.expense_type,
        amount: parseFloat(req.body.amount),
        expense_date: new Date(req.body.expense_date),
        description: req.body.description
      },
      include: {
        truck: true,
        delivery: {
          include: {
            employee: true
          }
        }
      }
    });

    // Handle OtherExpense and Fine entries based on type changes
    if (isNowOther && !wasOther) {
      // Expense changed to "other" - create OtherExpense and Fine entries
      let employeeId: number;
      
      if (expense.delivery_id && expense.delivery) {
        employeeId = expense.delivery.employee_id;
      } else {
        const defaultEmployee = await prisma.employee.findFirst({
          where: { status: 'active' },
          orderBy: { id: 'asc' }
        });
        
        if (!defaultEmployee) {
          return res.status(400).json({ error: 'No active employee found. Cannot create fine for other expense.' });
        }
        
        employeeId = defaultEmployee.id;
      }

      await prisma.otherExpense.create({
        data: {
          car_id: expense.car_id,
          delivery_id: expense.delivery_id,
          expense_id: expense.id,
          amount: expense.amount,
          expense_date: expense.expense_date,
          description: expense.description
        }
      });

      await prisma.fine.create({
        data: {
          car_id: expense.car_id,
          employee_id: employeeId,
          delivery_id: expense.delivery_id,
          fine_type: 'other_expense',
          fine_date: expense.expense_date,
          fine_cost: expense.amount,
          pay_status: 'unpaid',
          description: expense.description || `Other expense: ${expense.description || 'No description'}`,
          created_by: null
        }
      });
    } else if (!isNowOther && wasOther) {
      // Expense changed from "other" to something else - delete OtherExpense and Fine entries
      if (existingExpense.otherExpense) {
        // Find and delete the fine associated with this expense
        const fineToDelete = await prisma.fine.findFirst({
          where: {
            delivery_id: existingExpense.delivery_id,
            fine_type: 'other_expense',
            fine_cost: existingExpense.amount,
            fine_date: existingExpense.expense_date
          }
        });

        if (fineToDelete) {
          await prisma.fine.delete({
            where: { id: fineToDelete.id }
          });
        }
        
        await prisma.otherExpense.delete({
          where: { expense_id: expense.id }
        });
      }
    } else if (isNowOther && wasOther) {
      // Expense type remains "other" - update OtherExpense and Fine entries
      if (existingExpense.otherExpense) {
        await prisma.otherExpense.update({
          where: { expense_id: expense.id },
          data: {
            car_id: expense.car_id,
            delivery_id: expense.delivery_id,
            amount: expense.amount,
            expense_date: expense.expense_date,
            description: expense.description
          }
        });

        // Find and update the fine entry associated with this expense
        // Match by delivery_id, fine_type, and approximate amount/date
        const fineToUpdate = await prisma.fine.findFirst({
          where: {
            delivery_id: expense.delivery_id,
            fine_type: 'other_expense',
            fine_cost: existingExpense.amount,
            fine_date: existingExpense.expense_date
          }
        });

        if (fineToUpdate) {
          await prisma.fine.update({
            where: { id: fineToUpdate.id },
            data: {
              car_id: expense.car_id,
              fine_cost: expense.amount,
              fine_date: expense.expense_date,
              description: expense.description || `Other expense: ${expense.description || 'No description'}`
            }
          });
        }
      }
    }

    res.json(expense);
  } catch (error: any) {
    console.error('Error updating expense:', error);
    res.status(400).json({ error: 'Failed to update expense', details: error.message });
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
    const expenseId = parseInt(req.params.id);
    // Check if expense exists
    const existingExpense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        otherExpense: true
      }
    });
    
    if (!existingExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    
    // If expense type is "other", delete associated Fine entry
    if (existingExpense.expense_type === 'other' && existingExpense.otherExpense) {
      // Find and delete the fine associated with this expense
      const fineToDelete = await prisma.fine.findFirst({
        where: {
          delivery_id: existingExpense.delivery_id,
          fine_type: 'other_expense',
          fine_cost: existingExpense.amount,
          fine_date: existingExpense.expense_date
        }
      });

      if (fineToDelete) {
        await prisma.fine.delete({
          where: { id: fineToDelete.id }
        });
      }
    }
    
    // Delete the expense (OtherExpense will be deleted automatically due to cascade)
    await prisma.expense.delete({
      where: { id: expenseId }
    });
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    res.status(400).json({ error: 'Failed to delete expense', details: error.message });
  }
});

export default router;
