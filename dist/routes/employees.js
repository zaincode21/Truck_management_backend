"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
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
        const employees = await prisma_1.prisma.employee.findMany({
            include: {
                truck: true,
                _count: {
                    select: { deliveries: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });
        res.json(employees);
    }
    catch (error) {
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
 *             name: 'John Smith'
 *             phone: '+250788123456'
 *             email: 'john.smith@company.com'
 *             hire_date: '2023-01-15'
 *             status: 'active'
 *             license_number: 'DL123456789'
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
        // Validate required fields
        if (!req.body.name || !req.body.email || !req.body.phone || !req.body.license_number || !req.body.hire_date) {
            return res.status(400).json({ error: 'Missing required fields: name, email, phone, license_number, hire_date' });
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
                truck_id: truckId
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
        const employee = await prisma_1.prisma.employee.update({
            where: { id: parseInt(req.params.id) },
            data: {
                name: req.body.name,
                email: req.body.email,
                phone: req.body.phone,
                license_number: req.body.license_number,
                hire_date: new Date(req.body.hire_date),
                status: req.body.status,
                truck_id: req.body.truck_id ? parseInt(req.body.truck_id) : null
            }
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