"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
// Authentication removed - API is now public
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/employees:
 *   get:
 *     tags: [Employees]
 *     summary: Get all employees
 *     description: Retrieves a list of all employees with delivery counts
 *     responses:
 *       200:
 *         description: List of employees retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Employee'
 *                   - type: object
 *                     properties:
 *                       _count:
 *                         type: object
 *                         properties:
 *                           deliveries:
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
        const { available } = req.query;
        const whereClause = {};
        // If available query param is true, exclude employees with "in-work" status
        if (available === 'true') {
            whereClause.status = {
                not: 'in-work'
            };
        }
        const employees = await prisma_1.prisma.employee.findMany({
            where: whereClause,
            include: {
                truck: true,
                _count: {
                    select: { deliveries: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });
        // Calculate original salary (before fines) and net salary (after fines) for each employee
        // IMPORTANT: The salary field in DB is updated when fines are created/deleted,
        // so it represents the net salary (after fines deducted).
        // To get the original salary (before fines), we add back all fines: original = net + total_fines
        const employeesWithSalaries = await Promise.all(employees.map(async (employee) => {
            // Get total fines for this employee (drivers and turnboys have fines deducted)
            let totalFines = 0;
            if (employee.role === 'driver' || employee.role === 'turnboy') {
                const fines = await prisma_1.prisma.fine.findMany({
                    where: { employee_id: employee.id },
                    select: { fine_cost: true }
                });
                totalFines = fines.reduce((sum, fine) => sum + fine.fine_cost, 0);
            }
            // Original Salary = Employee's base salary (stored in employee.salary, constant)
            // This is the salary set when employee was created/updated, doesn't change
            const originalSalary = employee.salary;
            // Net Salary = Original Salary - Total Fines (ALL fines, regardless of payment status)
            // Payments do NOT affect net salary - they are tracked separately for accounting
            const netSalary = (employee.role === 'driver' || employee.role === 'turnboy')
                ? originalSalary - totalFines // For drivers/turnboys: subtract all fines from original
                : originalSalary; // For other roles: no fines, so net = original
            return {
                ...employee,
                total_fines: totalFines,
                original_salary: originalSalary, // Salary BEFORE any fines were deducted
                net_salary: netSalary // Salary AFTER deducting all fines
            };
        }));
        res.json(employeesWithSalaries);
    }
    catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});
/**
 * @swagger
 * /api/employees/{id}:
 *   get:
 *     tags: [Employees]
 *     summary: Get a specific employee
 *     description: Retrieves detailed information about a specific employee including their deliveries and assigned truck
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Employee ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Employee retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Employee'
 *                 - type: object
 *                   properties:
 *                     deliveries:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Delivery'
 *                     truck:
 *                       $ref: '#/components/schemas/Truck'
 *       404:
 *         description: Employee not found
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
        const employee = await prisma_1.prisma.employee.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                truck: true,
                deliveries: true
            }
        });
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json(employee);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch employee' });
    }
});
/**
 * @swagger
 * /api/employees:
 *   post:
 *     tags: [Employees]
 *     summary: Create a new employee
 *     description: Creates a new employee in the system
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - email
 *               - hire_date
 *               - license_number
 *               - role
 *               - salary
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'John Smith'
 *               phone:
 *                 type: string
 *                 example: '+250788123456'
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'john.smith@company.com'
 *               hire_date:
 *                 type: string
 *                 format: date
 *                 example: '2023-01-15'
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *                 example: 'active'
 *               license_number:
 *                 type: string
 *                 example: 'DL123456789'
 *               role:
 *                 type: string
 *                 enum: [driver, turnboy, admin, views]
 *                 example: 'driver'
 *               salary:
 *                 type: number
 *                 example: 500000
 *               truck_id:
 *                 type: integer
 *                 example: 1
 *                 nullable: true
 *           example:
 *             name: 'John Smith'
 *             phone: '+250788123456'
 *             email: 'john.smith@company.com'
 *             hire_date: '2023-01-15'
 *             status: 'active'
 *             license_number: 'DL123456789'
 *             role: 'driver'
 *             salary: 500000
 *             truck_id: 1
 *     responses:
 *       201:
 *         description: Employee created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
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
        // Validate required fields
        if (!req.body.name || !req.body.email || !req.body.phone || !req.body.license_number || !req.body.hire_date || !req.body.role || req.body.salary === undefined) {
            return res.status(400).json({ error: 'Missing required fields: name, email, phone, license_number, hire_date, role, salary' });
        }
        // Validate role
        const validRoles = ['driver', 'turnboy', 'admin', 'views'];
        if (!validRoles.includes(req.body.role)) {
            return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
        }
        // Validate salary is a positive number
        const salary = parseFloat(req.body.salary);
        if (isNaN(salary) || salary < 0) {
            return res.status(400).json({ error: 'Salary must be a positive number' });
        }
        // truck_id is optional - validate only if provided
        let truckId = null;
        if (req.body.truck_id) {
            truckId = parseInt(req.body.truck_id);
            // Check if truck exists and is not already assigned
            const truck = await prisma_1.prisma.truck.findUnique({
                where: { id: truckId },
                include: {
                    employees: true
                }
            });
            if (!truck) {
                return res.status(404).json({ error: `Truck with ID ${truckId} not found` });
            }
            if (truck.employees && truck.employees.length > 0) {
                return res.status(400).json({ error: `This truck is already assigned to another employee. Please select a different truck.` });
            }
        }
        const employee = await prisma_1.prisma.employee.create({
            data: {
                name: req.body.name.trim(),
                email: req.body.email.trim(),
                phone: req.body.phone.trim(),
                license_number: req.body.license_number.trim(),
                hire_date: new Date(req.body.hire_date),
                status: req.body.status || 'active',
                role: req.body.role,
                salary: salary,
                truck_id: truckId,
                created_by: null
            },
            include: {
                truck: true
            }
        });
        res.status(201).json(employee);
    }
    catch (error) {
        console.error('Error creating employee:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'An employee with this email or license number already exists' });
        }
        res.status(400).json({ error: error.message || 'Failed to create employee' });
    }
});
/**
 * @swagger
 * /api/employees/{id}:
 *   put:
 *     tags: [Employees]
 *     summary: Update an employee
 *     description: Updates an existing employee's information
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Employee ID
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
 *                 example: 'John Smith'
 *               phone:
 *                 type: string
 *                 example: '+250788123456'
 *               email:
 *                 type: string
 *                 format: email
 *                 example: 'john.smith@company.com'
 *               hire_date:
 *                 type: string
 *                 format: date
 *                 example: '2023-01-15'
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *                 example: 'active'
 *               license_number:
 *                 type: string
 *                 example: 'DL123456789'
 *               truck_id:
 *                 type: integer
 *                 example: 1
 *                 nullable: true
 *           example:
 *             name: 'John Smith Updated'
 *             phone: '+250788123456'
 *             email: 'john.smith.updated@company.com'
 *             status: 'active'
 *             truck_id: 1
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Employee not found
 */
router.put('/:id', async (req, res) => {
    try {
        const updateData = {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            license_number: req.body.license_number,
            hire_date: new Date(req.body.hire_date),
            status: req.body.status,
            truck_id: req.body.truck_id ? parseInt(req.body.truck_id) : null
        };
        // Update role if provided
        if (req.body.role) {
            const validRoles = ['driver', 'turnboy', 'admin', 'views'];
            if (!validRoles.includes(req.body.role)) {
                return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
            }
            updateData.role = req.body.role;
        }
        // Update salary if provided
        if (req.body.salary !== undefined) {
            const salary = parseFloat(req.body.salary);
            if (isNaN(salary) || salary < 0) {
                return res.status(400).json({ error: 'Salary must be a positive number' });
            }
            updateData.salary = salary;
        }
        const employee = await prisma_1.prisma.employee.update({
            where: { id: parseInt(req.params.id) },
            data: updateData
        });
        res.json(employee);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to update employee' });
    }
});
/**
 * @swagger
 * /api/employees/{id}:
 *   delete:
 *     tags: [Employees]
 *     summary: Delete an employee
 *     description: Deletes an employee from the system
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Employee ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       204:
 *         description: Employee deleted successfully
 *       400:
 *         description: Unable to delete employee (may have dependencies)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Employee not found
 */
router.delete('/:id', async (req, res) => {
    try {
        await prisma_1.prisma.employee.delete({
            where: { id: parseInt(req.params.id) }
        });
        res.status(204).send();
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to delete employee' });
    }
});
exports.default = router;
//# sourceMappingURL=employees.js.map