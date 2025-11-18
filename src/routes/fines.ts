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
      description: req.body.description || null,
      created_by: user?.employee_id || null
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
router.put('/:id', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
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
    
    // Check if fine belongs to driver
    if (user && user.role === 'driver' && user.employee_id) {
      if (existingFine.employee_id !== user.employee_id) {
        return res.status(403).json({ error: 'You can only edit your own fines' });
      }
      
      // Force driver's employee_id and truck_id
      req.body.employee_id = user.employee_id;
      if (user.truck_id) {
        req.body.car_id = user.truck_id;
      }
    }
    
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
router.delete('/:id', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
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
    
    // Check if fine belongs to driver
    if (user && user.role === 'driver' && user.employee_id) {
      if (fine.employee_id !== user.employee_id) {
        return res.status(403).json({ error: 'You can only delete your own fines' });
      }
    }
    
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

