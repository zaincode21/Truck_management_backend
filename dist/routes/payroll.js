"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * Get or create current payroll period
 */
router.get('/current-period', auth_1.authenticateUser, async (req, res) => {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // 1-12
        // Check if period exists
        let period = await prisma_1.prisma.payrollPeriod.findFirst({
            where: {
                year,
                month
            },
            include: {
                payrollRecords: {
                    include: {
                        employee: true
                    }
                },
                _count: {
                    select: { fines: true }
                }
            }
        });
        // If period doesn't exist, create it
        if (!period) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59, 999);
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
            const periodName = `${monthNames[month - 1]} ${year}`;
            period = await prisma_1.prisma.payrollPeriod.create({
                data: {
                    year,
                    month,
                    period_name: periodName,
                    start_date: startDate,
                    end_date: endDate,
                    status: 'open'
                },
                include: {
                    payrollRecords: {
                        include: {
                            employee: true
                        }
                    },
                    _count: {
                        select: { fines: true }
                    }
                }
            });
        }
        res.json(period);
    }
    catch (error) {
        console.error('Error getting current period:', error);
        res.status(500).json({ error: 'Failed to get current period' });
    }
});
/**
 * Get all payroll periods
 */
router.get('/periods', auth_1.authenticateUser, async (req, res) => {
    try {
        const periods = await prisma_1.prisma.payrollPeriod.findMany({
            orderBy: [
                { year: 'desc' },
                { month: 'desc' }
            ],
            include: {
                _count: {
                    select: {
                        payrollRecords: true,
                        fines: true
                    }
                }
            }
        });
        res.json(periods);
    }
    catch (error) {
        console.error('Error getting periods:', error);
        res.status(500).json({ error: 'Failed to get periods' });
    }
});
/**
 * Process month-end: Reset salaries and create payroll records
 */
router.post('/process-month-end', auth_1.authenticateUser, async (req, res) => {
    try {
        const user = req.user;
        const { year, month } = req.body;
        if (!year || !month) {
            return res.status(400).json({ error: 'Year and month are required' });
        }
        // Get or create the payroll period
        let period = await prisma_1.prisma.payrollPeriod.findFirst({
            where: {
                year: parseInt(year),
                month: parseInt(month)
            }
        });
        if (!period) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59, 999);
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
            const periodName = `${monthNames[month - 1]} ${year}`;
            period = await prisma_1.prisma.payrollPeriod.create({
                data: {
                    year: parseInt(year),
                    month: parseInt(month),
                    period_name: periodName,
                    start_date: startDate,
                    end_date: endDate,
                    status: 'open'
                }
            });
        }
        // Check if already processed
        if (period.status === 'processed') {
            return res.status(400).json({ error: 'This period has already been processed' });
        }
        // Get all employees (drivers and turnboys)
        const employees = await prisma_1.prisma.employee.findMany({
            where: {
                role: {
                    in: ['driver', 'turnboy']
                },
                status: 'active'
            }
        });
        // Get all fines for this period (fines that occurred during this month)
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        const payrollRecords = await Promise.all(employees.map(async (employee) => {
            // Get fines for this employee in this period
            const fines = await prisma_1.prisma.fine.findMany({
                where: {
                    employee_id: employee.id,
                    fine_date: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });
            const totalFines = fines.reduce((sum, fine) => sum + fine.fine_cost, 0);
            // Calculate original salary (current salary + fines = original)
            const originalSalary = employee.salary + totalFines;
            const netSalary = originalSalary - totalFines; // This should equal employee.salary
            // Update fines to link to this payroll period
            await prisma_1.prisma.fine.updateMany({
                where: {
                    employee_id: employee.id,
                    fine_date: {
                        gte: startDate,
                        lte: endDate
                    },
                    payroll_period_id: null
                },
                data: {
                    payroll_period_id: period.id
                }
            });
            // Create or update payroll record
            const payrollRecord = await prisma_1.prisma.payrollRecord.upsert({
                where: {
                    payroll_period_id_employee_id: {
                        payroll_period_id: period.id,
                        employee_id: employee.id
                    }
                },
                update: {
                    original_salary: originalSalary,
                    total_fines: totalFines,
                    net_salary: netSalary
                },
                create: {
                    payroll_period_id: period.id,
                    employee_id: employee.id,
                    original_salary: originalSalary,
                    total_fines: totalFines,
                    net_salary: netSalary,
                    status: 'pending'
                }
            });
            // Reset employee salary to original (before fines)
            await prisma_1.prisma.employee.update({
                where: { id: employee.id },
                data: { salary: originalSalary }
            });
            return payrollRecord;
        }));
        // Mark period as processed
        await prisma_1.prisma.payrollPeriod.update({
            where: { id: period.id },
            data: {
                status: 'processed',
                processed_at: new Date(),
                processed_by: user?.employee_id || null
            }
        });
        // Get updated period with records
        const updatedPeriod = await prisma_1.prisma.payrollPeriod.findUnique({
            where: { id: period.id },
            include: {
                payrollRecords: {
                    include: {
                        employee: true
                    }
                }
            }
        });
        res.json({
            message: 'Month-end processed successfully',
            period: updatedPeriod,
            recordsCreated: payrollRecords.length
        });
    }
    catch (error) {
        console.error('Error processing month-end:', error);
        res.status(500).json({ error: 'Failed to process month-end', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});
/**
 * Get payroll records for a specific period
 */
router.get('/period/:periodId/records', auth_1.authenticateUser, async (req, res) => {
    try {
        const periodId = parseInt(req.params.periodId);
        const records = await prisma_1.prisma.payrollRecord.findMany({
            where: {
                payroll_period_id: periodId
            },
            include: {
                employee: {
                    include: {
                        truck: true
                    }
                },
                payrollPeriod: true
            },
            orderBy: {
                employee: {
                    name: 'asc'
                }
            }
        });
        res.json(records);
    }
    catch (error) {
        console.error('Error getting payroll records:', error);
        res.status(500).json({ error: 'Failed to get payroll records' });
    }
});
/**
 * Get monthly summary report
 */
router.get('/monthly-summary', auth_1.authenticateUser, async (req, res) => {
    try {
        const { year, month } = req.query;
        if (!year || !month) {
            return res.status(400).json({ error: 'Year and month are required' });
        }
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
        // Get fines summary
        const fines = await prisma_1.prisma.fine.findMany({
            where: {
                fine_date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                employee: true
            }
        });
        const finesByEmployee = fines.reduce((acc, fine) => {
            const empId = fine.employee_id;
            if (!acc[empId]) {
                acc[empId] = {
                    employee: fine.employee,
                    totalFines: 0,
                    fineCount: 0,
                    fines: []
                };
            }
            acc[empId].totalFines += fine.fine_cost;
            acc[empId].fineCount += 1;
            acc[empId].fines.push(fine);
            return acc;
        }, {});
        // Get deliveries summary
        const deliveries = await prisma_1.prisma.delivery.findMany({
            where: {
                delivery_date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                product: true,
                truck: true,
                employee: true
            }
        });
        const deliveryStats = {
            total: deliveries.length,
            delivered: deliveries.filter(d => d.status === 'delivered').length,
            pending: deliveries.filter(d => d.status === 'pending').length,
            totalIncome: deliveries
                .filter(d => d.status === 'delivered')
                .reduce((sum, d) => sum + (d.total_income || 0), 0),
            deliveries
        };
        // Get expenses summary
        const expenses = await prisma_1.prisma.expense.findMany({
            where: {
                expense_date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                truck: true,
                delivery: true
            }
        });
        const expenseStats = {
            total: expenses.length,
            totalAmount: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
            byType: expenses.reduce((acc, exp) => {
                const type = exp.expense_type || 'other';
                acc[type] = (acc[type] || 0) + (exp.amount || 0);
                return acc;
            }, {}),
            expenses
        };
        // Get payroll records if period exists
        const period = await prisma_1.prisma.payrollPeriod.findFirst({
            where: {
                year: parseInt(year),
                month: parseInt(month)
            },
            include: {
                payrollRecords: {
                    include: {
                        employee: true
                    }
                }
            }
        });
        res.json({
            period: {
                year: parseInt(year),
                month: parseInt(month),
                startDate,
                endDate
            },
            fines: {
                total: fines.length,
                totalAmount: fines.reduce((sum, f) => sum + f.fine_cost, 0),
                byEmployee: Object.values(finesByEmployee)
            },
            deliveries: deliveryStats,
            expenses: expenseStats,
            payroll: period ? {
                status: period.status,
                records: period.payrollRecords
            } : null
        });
    }
    catch (error) {
        console.error('Error getting monthly summary:', error);
        res.status(500).json({ error: 'Failed to get monthly summary' });
    }
});
exports.default = router;
//# sourceMappingURL=payroll.js.map