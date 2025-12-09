import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
const router = Router();
/**
 * @swagger
 * /api/analytics/overview:
 *   get:
 *     tags: [Analytics]
 *     summary: Get analytics overview
 *     description: Retrieves comprehensive analytics data including revenue trends, expense trends, and delivery statistics
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y, all]
 *         description: Time period for analytics (default is 30d)
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/overview', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        // Calculate date range based on period
        const now = new Date();
        let startDate = new Date();
        switch (period) {
            case '7d':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(now.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(now.getDate() - 90);
                break;
            case '1y':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            case 'all':
                startDate = new Date(0); // Beginning of time
                break;
            default:
                startDate.setDate(now.getDate() - 30);
        }
        // Revenue trends (daily)
        const deliveries = await prisma.delivery.findMany({
            where: {
                delivery_date: { gte: startDate }
            },
            select: {
                delivery_date: true,
                total_income: true,
                cost: true,
                fuel_cost: true,
                mileage_cost: true,
                status: true
            },
            orderBy: { delivery_date: 'asc' }
        });
        // Expense trends
        const expenses = await prisma.expense.findMany({
            where: {
                expense_date: { gte: startDate }
            },
            select: {
                expense_date: true,
                amount: true,
                expense_type: true
            },
            orderBy: { expense_date: 'asc' }
        });
        // Group revenue by date
        const revenueByDate = {};
        deliveries.forEach(delivery => {
            const date = delivery.delivery_date.toISOString().split('T')[0];
            if (!revenueByDate[date]) {
                revenueByDate[date] = { revenue: 0, cost: 0, profit: 0 };
            }
            revenueByDate[date].revenue += delivery.total_income || 0;
            revenueByDate[date].cost += (delivery.cost || 0) + (delivery.fuel_cost || 0) + (delivery.mileage_cost || 0);
            revenueByDate[date].profit = revenueByDate[date].revenue - revenueByDate[date].cost;
        });
        // Group expenses by date
        const expensesByDate = {};
        expenses.forEach(expense => {
            const date = expense.expense_date.toISOString().split('T')[0];
            expensesByDate[date] = (expensesByDate[date] || 0) + expense.amount;
        });
        // Group expenses by type
        const expensesByType = {};
        expenses.forEach(expense => {
            expensesByType[expense.expense_type] = (expensesByType[expense.expense_type] || 0) + expense.amount;
        });
        // Delivery statistics
        const deliveryStats = {
            total: deliveries.length,
            delivered: deliveries.filter(d => d.status === 'delivered').length,
            pending: deliveries.filter(d => d.status === 'pending').length,
            inTransit: deliveries.filter(d => d.status === 'in-transit').length,
        };
        // Top performing trucks
        const truckPerformance = await prisma.truck.findMany({
            include: {
                deliveries: {
                    where: { delivery_date: { gte: startDate } },
                    select: { total_income: true }
                },
                expenses: {
                    where: { expense_date: { gte: startDate } },
                    select: { amount: true }
                }
            }
        });
        const truckStats = truckPerformance.map(truck => {
            const revenue = truck.deliveries.reduce((sum, d) => sum + (d.total_income || 0), 0);
            const expenses = truck.expenses.reduce((sum, e) => sum + e.amount, 0);
            return {
                id: truck.id,
                license_plate: truck.license_plate,
                model: truck.model,
                revenue,
                expenses,
                profit: revenue - expenses,
                deliveryCount: truck.deliveries.length
            };
        }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
        // Top performing employees
        const employeePerformance = await prisma.employee.findMany({
            include: {
                deliveries: {
                    where: { delivery_date: { gte: startDate } },
                    select: { total_income: true }
                }
            }
        });
        const employeeStats = employeePerformance.map(emp => {
            const revenue = emp.deliveries.reduce((sum, d) => sum + (d.total_income || 0), 0);
            return {
                id: emp.id,
                name: emp.name,
                revenue,
                deliveryCount: emp.deliveries.length
            };
        }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
        // Calculate totals
        const totalRevenue = deliveries.reduce((sum, d) => sum + (d.total_income || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalProfit = totalRevenue - totalExpenses;
        res.json({
            period,
            dateRange: {
                start: startDate.toISOString(),
                end: now.toISOString()
            },
            summary: {
                totalRevenue,
                totalExpenses,
                totalProfit,
                profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0
            },
            revenueTrends: Object.entries(revenueByDate).map(([date, data]) => ({
                date,
                revenue: data.revenue,
                cost: data.cost,
                profit: data.profit
            })),
            expenseTrends: Object.entries(expensesByDate).map(([date, amount]) => ({
                date,
                amount
            })),
            expensesByType: Object.entries(expensesByType).map(([type, amount]) => ({
                type,
                amount
            })),
            deliveryStats,
            topTrucks: truckStats,
            topEmployees: employeeStats
        });
    }
    catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
});
/**
 * @swagger
 * /api/analytics/revenue:
 *   get:
 *     tags: [Analytics]
 *     summary: Get revenue analytics
 *     description: Retrieves detailed revenue analytics by time period
 *     responses:
 *       200:
 *         description: Revenue analytics retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/revenue', async (req, res) => {
    try {
        const deliveries = await prisma.delivery.findMany({
            select: {
                delivery_date: true,
                total_income: true,
                price: true,
                cost: true,
                fuel_cost: true,
                status: true,
                product: {
                    select: { name: true }
                }
            },
            orderBy: { delivery_date: 'desc' }
        });
        const monthlyRevenue = {};
        const productRevenue = {};
        deliveries.forEach(delivery => {
            // Monthly grouping
            const month = delivery.delivery_date.toISOString().substring(0, 7); // YYYY-MM
            monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (delivery.total_income || 0);
            // Product grouping
            const productName = delivery.product.name;
            productRevenue[productName] = (productRevenue[productName] || 0) + (delivery.total_income || 0);
        });
        res.json({
            monthly: Object.entries(monthlyRevenue).map(([month, revenue]) => ({
                month,
                revenue
            })),
            byProduct: Object.entries(productRevenue).map(([product, revenue]) => ({
                product,
                revenue
            }))
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch revenue analytics' });
    }
});
export default router;
//# sourceMappingURL=analytics.js.map