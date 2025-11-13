"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get comprehensive dashboard statistics
 *     description: Retrieves aggregated statistics for trucks, employees, deliveries, products, and financials
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardStats'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stats', async (req, res) => {
    try {
        const [totalTrucks, activeTrucks, totalEmployees, activeEmployees, totalDeliveries, pendingDeliveries, inTransitDeliveries, deliveredDeliveries, totalProducts, totalExpenses, totalRevenue] = await Promise.all([
            prisma_1.prisma.truck.count(),
            prisma_1.prisma.truck.count({ where: { status: 'active' } }),
            prisma_1.prisma.employee.count(),
            prisma_1.prisma.employee.count({ where: { status: 'active' } }),
            prisma_1.prisma.delivery.count(),
            prisma_1.prisma.delivery.count({ where: { status: 'pending' } }),
            prisma_1.prisma.delivery.count({ where: { status: 'in-transit' } }),
            prisma_1.prisma.delivery.count({ where: { status: 'delivered' } }),
            prisma_1.prisma.product.count(),
            prisma_1.prisma.expense.aggregate({
                where: { expense_type: { not: 'other' } },
                _sum: { amount: true }
            }),
            prisma_1.prisma.delivery.aggregate({ _sum: { total_income: true } })
        ]);
        res.json({
            trucks: {
                total: totalTrucks,
                active: activeTrucks,
                inactive: totalTrucks - activeTrucks
            },
            employees: {
                total: totalEmployees,
                active: activeEmployees,
                inactive: totalEmployees - activeEmployees
            },
            deliveries: {
                total: totalDeliveries,
                pending: pendingDeliveries,
                inTransit: inTransitDeliveries,
                delivered: deliveredDeliveries
            },
            products: {
                total: totalProducts
            },
            financials: {
                totalExpenses: totalExpenses._sum.amount || 0,
                totalRevenue: totalRevenue._sum.total_income || 0,
                netIncome: (totalRevenue._sum.total_income || 0) - (totalExpenses._sum.amount || 0)
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});
/**
 * @swagger
 * /api/dashboard/recent-deliveries:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get recent deliveries
 *     description: Retrieves the 5 most recent deliveries with related product, truck, and employee information
 *     responses:
 *       200:
 *         description: Recent deliveries retrieved successfully
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
router.get('/recent-deliveries', async (req, res) => {
    try {
        const deliveries = await prisma_1.prisma.delivery.findMany({
            take: 5,
            include: {
                product: true,
                truck: true,
                employee: true
            },
            orderBy: { created_at: 'desc' }
        });
        res.json(deliveries);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch recent deliveries' });
    }
});
/**
 * @swagger
 * /api/dashboard/recent-expenses:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get recent expenses
 *     description: Retrieves the 5 most recent expenses with related truck information
 *     responses:
 *       200:
 *         description: Recent expenses retrieved successfully
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
router.get('/recent-expenses', async (req, res) => {
    try {
        const expenses = await prisma_1.prisma.expense.findMany({
            take: 5,
            include: {
                truck: true
            },
            orderBy: { expense_date: 'desc' }
        });
        res.json(expenses);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch recent expenses' });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map