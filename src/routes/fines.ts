import { Router } from 'express';
import { prisma } from '../lib/prisma';
// Authentication removed - API is now public

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
router.get('/', async (req, res) => {
  try {
    // Authentication removed - user tracking disabled
    const user = undefined;
    
    // Build query - no filtering for drivers
    const where: any = {};
    
    // Use select to avoid issues with missing columns (pay_status, payroll_period_id)
    const fines = await prisma.fine.findMany({
      where,
      select: {
        id: true,
        car_id: true,
        employee_id: true,
        delivery_id: true,
        fine_type: true,
        fine_date: true,
        fine_cost: true,
        pay_status: true,
        paid_amount: true,
        remaining_amount: true,
        description: true,
        created_at: true,
        updated_at: true,
        truck: {
          select: {
            id: true,
            license_plate: true,
            model: true,
            year: true,
            status: true
          }
        },
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            license_number: true,
            role: true,
            salary: true
          }
        },
        delivery: {
          select: {
            id: true,
            delivery_code: true,
            origin: true,
            destination: true
          }
        }
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
 * /api/fines/{id}/payments:
 *   get:
 *     tags: [Fines]
 *     summary: Get payment history for a fine
 *     description: Retrieves all payments made towards a specific fine
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Fine ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 *       404:
 *         description: Fine not found
 */
router.get('/:id/payments', async (req, res) => {
  try {
    const fineId = parseInt(req.params.id);
    
    // Check if fine exists
    const fine = await prisma.fine.findUnique({
      where: { id: fineId }
    });
    
    if (!fine) {
      return res.status(404).json({ error: 'Fine not found' });
    }
    
    // Get all payments for this fine
    const payments = await prisma.payment.findMany({
      where: { fine_id: fineId },
      include: {
        payrollPeriod: true
      },
      orderBy: { payment_date: 'desc' }
    });
    
    res.json({
      fine: {
        id: fine.id,
        fine_cost: fine.fine_cost,
        paid_amount: fine.paid_amount || 0,
        remaining_amount: fine.remaining_amount || fine.fine_cost,
        pay_status: fine.pay_status
      },
      payments,
      total_paid: payments.reduce((sum, p) => sum + p.amount, 0)
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

/**
 * @swagger
 * /api/fines/{id}/payments:
 *   post:
 *     tags: [Fines]
 *     summary: Make a payment towards a fine
 *     description: Records a partial or full payment for a fine
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
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 25000
 *               payment_date:
 *                 type: string
 *                 format: date-time
 *                 example: '2025-11-15T00:00:00.000Z'
 *               notes:
 *                 type: string
 *                 example: 'Partial payment for November'
 *     responses:
 *       201:
 *         description: Payment recorded successfully
 *       400:
 *         description: Invalid payment amount or fine already fully paid
 *       404:
 *         description: Fine not found
 */
router.post('/:id/payments', async (req, res) => {
  try {
    const fineId = parseInt(req.params.id);
    const paymentAmount = parseFloat(req.body.amount);
    
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than 0' });
    }
    
    // Get the fine with current payment status
    const fine = await prisma.fine.findUnique({
      where: { id: fineId },
      include: {
        employee: true,
        payments: {
          orderBy: { payment_date: 'desc' }
        }
      }
    });
    
    if (!fine) {
      return res.status(404).json({ error: 'Fine not found' });
    }
    
    // Calculate current remaining amount
    const currentPaidAmount = fine.paid_amount || 0;
    const currentRemainingAmount = fine.remaining_amount !== null && fine.remaining_amount !== undefined 
      ? fine.remaining_amount 
      : (fine.fine_cost - currentPaidAmount);
    
    // Check if payment exceeds remaining amount
    if (paymentAmount > currentRemainingAmount) {
      return res.status(400).json({ 
        error: `Payment amount (${paymentAmount}) exceeds remaining balance (${currentRemainingAmount})` 
      });
    }
    
    // Determine which payroll period this payment belongs to
    const paymentDate = req.body.payment_date ? new Date(req.body.payment_date) : new Date();
    const paymentYear = paymentDate.getFullYear();
    const paymentMonth = paymentDate.getMonth() + 1;
    
    // Get or create the payroll period for this payment
    let payrollPeriod = await prisma.payrollPeriod.findFirst({
      where: {
        year: paymentYear,
        month: paymentMonth
      }
    });

    if (!payrollPeriod) {
      const startDate = new Date(paymentYear, paymentMonth - 1, 1);
      const endDate = new Date(paymentYear, paymentMonth, 0, 23, 59, 59, 999);
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const periodName = `${monthNames[paymentMonth - 1]} ${paymentYear}`;

      payrollPeriod = await prisma.payrollPeriod.create({
        data: {
          year: paymentYear,
          month: paymentMonth,
          period_name: periodName,
          start_date: startDate,
          end_date: endDate,
          status: 'open'
        }
      });
    }
    
    // Create the payment record
    const payment = await prisma.payment.create({
      data: {
        fine_id: fineId,
        amount: paymentAmount,
        payment_date: paymentDate,
        payroll_period_id: payrollPeriod.id,
        notes: req.body.notes || null,
        created_by: null
      }
    });
    
    // Update fine payment status
    const newPaidAmount = currentPaidAmount + paymentAmount;
    const newRemainingAmount = fine.fine_cost - newPaidAmount;
    const newPayStatus = newRemainingAmount <= 0 ? 'paid' : 'unpaid';
    
    await prisma.fine.update({
      where: { id: fineId },
      data: {
        paid_amount: newPaidAmount,
        remaining_amount: Math.max(0, newRemainingAmount), // Ensure it doesn't go negative
        pay_status: newPayStatus
      }
    });
    
    // If the employee is a driver or turnboy, restore the paid amount to their salary
    if (fine.employee && (fine.employee.role === 'driver' || fine.employee.role === 'turnboy')) {
      const newSalary = fine.employee.salary + paymentAmount;
      
      await prisma.employee.update({
        where: { id: fine.employee_id },
        data: { salary: newSalary }
      });
    }
    
    // Get updated fine with payment
    const updatedFine = await prisma.fine.findUnique({
      where: { id: fineId },
      include: {
        employee: true,
        payments: {
          orderBy: { payment_date: 'desc' },
          include: {
            payrollPeriod: true
          }
        }
      }
    });
    
    res.status(201).json({
      message: 'Payment recorded successfully',
      payment,
      fine: updatedFine
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment', details: error instanceof Error ? error.message : 'Unknown error' });
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
router.get('/:id', async (req, res) => {
  try {
    const fineId = parseInt(req.params.id);
    
    // Use select to avoid issues with missing columns
    const fine = await prisma.fine.findUnique({
      where: { id: fineId },
      select: {
        id: true,
        car_id: true,
        employee_id: true,
        delivery_id: true,
        fine_type: true,
        fine_date: true,
        fine_cost: true,
        pay_status: true,
        paid_amount: true,
        remaining_amount: true,
        description: true,
        created_at: true,
        updated_at: true,
        truck: {
          select: {
            id: true,
            license_plate: true,
            model: true,
            year: true,
            status: true
          }
        },
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            license_number: true,
            role: true,
            salary: true
          }
        },
        delivery: {
          select: {
            id: true,
            delivery_code: true,
            origin: true,
            destination: true
          }
        }
      }
    });
    
    if (!fine) {
      return res.status(404).json({ error: 'Fine not found' });
    }
    
    // Authentication removed - no access restrictions
    
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
router.post('/', async (req, res) => {
  try {
    // Authentication removed - user tracking disabled
    const user = undefined;
    // Authentication removed - no user restrictions
    
    const fineCost = parseFloat(req.body.fine_cost);
    const employeeId = parseInt(req.body.employee_id);
    
    // Get the employee to check if they are a driver and get their current salary
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Determine which payroll period this fine belongs to
    const fineDate = new Date(req.body.fine_date);
    const fineYear = fineDate.getFullYear();
    const fineMonth = fineDate.getMonth() + 1;
    
    // Get or create the payroll period for this fine
    let payrollPeriod = await prisma.payrollPeriod.findFirst({
      where: {
        year: fineYear,
        month: fineMonth
      }
    });

    if (!payrollPeriod) {
      const startDate = new Date(fineYear, fineMonth - 1, 1);
      const endDate = new Date(fineYear, fineMonth, 0, 23, 59, 59, 999);
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const periodName = `${monthNames[fineMonth - 1]} ${fineYear}`;

      payrollPeriod = await prisma.payrollPeriod.create({
        data: {
          year: fineYear,
          month: fineMonth,
          period_name: periodName,
          start_date: startDate,
          end_date: endDate,
          status: 'open'
        }
      });
    }

    // Create the fine - build data object conditionally
    const fineData: any = {
      car_id: parseInt(req.body.car_id),
      employee_id: employeeId,
      delivery_id: req.body.delivery_id ? parseInt(req.body.delivery_id) : null,
      fine_type: req.body.fine_type,
      fine_date: fineDate,
      fine_cost: fineCost,
      paid_amount: 0, // Initialize paid amount to 0
      remaining_amount: fineCost, // Initialize remaining amount to full fine cost
      description: req.body.description || null,
      created_by: null
    };

    // Only add pay_status and payroll_period_id if columns exist (will be handled by try-catch in production)
    // In development, these will be added; in production without migrations, they'll be skipped
    try {
      // Try to add optional fields - if they fail, fine creation will still work
      if (req.body.pay_status) {
        fineData.pay_status = req.body.pay_status;
      }
      if (payrollPeriod) {
        fineData.payroll_period_id = payrollPeriod.id;
      }
    } catch (e) {
      // Columns don't exist, continue without them
    }

    const fine = await prisma.fine.create({
      data: fineData,
      select: {
        id: true,
        car_id: true,
        employee_id: true,
        delivery_id: true,
        fine_type: true,
        fine_date: true,
        fine_cost: true,
        description: true,
        created_at: true,
        updated_at: true,
        truck: {
          select: {
            id: true,
            license_plate: true,
            model: true,
            year: true,
            status: true
          }
        },
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            license_number: true,
            role: true,
            salary: true
          }
        },
        delivery: {
          select: {
            id: true,
            delivery_code: true,
            origin: true,
            destination: true
          }
        }
      }
    });
    
    // If the employee is a driver or turnboy, deduct the fine cost from their salary
    // Allow negative salaries as per requirement
    if (employee.role === 'driver' || employee.role === 'turnboy') {
      const newSalary = employee.salary - fineCost; // Calculate: salary - fine_cost
      
      await prisma.employee.update({
        where: { id: employeeId },
        data: { salary: newSalary }
      });
      
      // Update the fine object to reflect the updated employee salary
      fine.employee.salary = newSalary;
    }
    
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
router.put('/:id', async (req, res) => {
  try {
    // Authentication removed
    const fineId = parseInt(req.params.id);
    
    // Get the existing fine first to check employee and handle salary changes
    // Use select to avoid issues with missing columns
    const existingFine = await prisma.fine.findUnique({
      where: { id: fineId },
      select: {
        id: true,
        car_id: true,
        employee_id: true,
        delivery_id: true,
        fine_type: true,
        fine_date: true,
        fine_cost: true,
        description: true,
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
            salary: true
          }
        }
      }
    });
    
    if (!existingFine) {
      return res.status(404).json({ error: 'Fine not found' });
    }
    
    // Authentication removed - no access restrictions
    
    const newFineCost = parseFloat(req.body.fine_cost);
    const oldFineCost = existingFine.fine_cost;
    
    // If the employee is a driver or turnboy and fine cost changed, update salary
    if (existingFine.employee && (existingFine.employee.role === 'driver' || existingFine.employee.role === 'turnboy') && newFineCost !== oldFineCost) {
      // Restore the old fine cost to salary
      const currentSalary = existingFine.employee.salary;
      // Calculate: current_salary + old_fine_cost - new_fine_cost
      const newSalary = currentSalary + oldFineCost - newFineCost;
      
      await prisma.employee.update({
        where: { id: existingFine.employee_id },
        data: { salary: newSalary }
      });
    }
    
    const updateData: any = {
        car_id: parseInt(req.body.car_id),
        employee_id: parseInt(req.body.employee_id),
      delivery_id: req.body.delivery_id ? parseInt(req.body.delivery_id) : null,
        fine_type: req.body.fine_type,
        fine_date: new Date(req.body.fine_date),
        fine_cost: newFineCost,
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
    console.error('Error updating fine:', error);
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
router.delete('/:id', async (req, res) => {
  try {
    // Authentication removed
    const fineId = parseInt(req.params.id);
    
    // Get the fine first to check employee and restore salary if needed
    // Use select to avoid issues with missing columns
    const fine = await prisma.fine.findUnique({
      where: { id: fineId },
      select: {
        id: true,
        car_id: true,
        employee_id: true,
        delivery_id: true,
        fine_type: true,
        fine_date: true,
        fine_cost: true,
        description: true,
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
            salary: true
          }
        }
      }
    });
    
    if (!fine) {
      return res.status(404).json({ error: 'Fine not found' });
    }
    
    // Authentication removed - no access restrictions
    
    // If the employee is a driver or turnboy, restore the fine cost to their salary
    if (fine.employee && (fine.employee.role === 'driver' || fine.employee.role === 'turnboy')) {
      const newSalary = fine.employee.salary + fine.fine_cost;
      
      await prisma.employee.update({
        where: { id: fine.employee_id },
        data: { salary: newSalary }
      });
    }
    
    // Delete the fine
    await prisma.fine.delete({
      where: { id: fineId }
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting fine:', error);
    res.status(400).json({ error: 'Failed to delete fine' });
  }
});

export default router;

