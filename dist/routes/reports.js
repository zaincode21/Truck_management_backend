"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pdfkit_1 = __importDefault(require("pdfkit"));
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: PDF report generation operations
 */
/**
 * @swagger
 * /api/reports/financial:
 *   get:
 *     tags: [Reports]
 *     summary: Generate financial report PDF
 *     description: Generates a financial report PDF with deliveries, expenses, and fines
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: PDF generated successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Internal server error
 */
router.get('/financial', auth_1.authenticateUser, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        // Build date filters
        const where = {};
        if (startDate || endDate) {
            where.delivery_date = {};
            if (startDate) {
                where.delivery_date.gte = new Date(startDate);
            }
            if (endDate) {
                where.delivery_date.lte = new Date(endDate);
            }
        }
        // Fetch data
        const [deliveries, expenses, fines] = await Promise.all([
            prisma_1.prisma.delivery.findMany({
                where,
                include: {
                    product: true,
                    truck: true,
                    employee: {
                        select: {
                            id: true,
                            name: true,
                            license_number: true
                        }
                    }
                },
                orderBy: { delivery_date: 'desc' }
            }),
            prisma_1.prisma.expense.findMany({
                where: startDate || endDate ? {
                    expense_date: {
                        ...(startDate ? { gte: new Date(startDate) } : {}),
                        ...(endDate ? { lte: new Date(endDate) } : {})
                    }
                } : {},
                include: {
                    truck: {
                        select: {
                            id: true,
                            license_plate: true
                        }
                    }
                },
                orderBy: { expense_date: 'desc' }
            }),
            prisma_1.prisma.fine.findMany({
                where: startDate || endDate ? {
                    fine_date: {
                        ...(startDate ? { gte: new Date(startDate) } : {}),
                        ...(endDate ? { lte: new Date(endDate) } : {})
                    }
                } : {},
                select: {
                    id: true,
                    fine_type: true,
                    fine_date: true,
                    fine_cost: true,
                    description: true,
                    employee: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    truck: {
                        select: {
                            id: true,
                            license_plate: true
                        }
                    }
                },
                orderBy: { fine_date: 'desc' }
            })
        ]);
        // Calculate totals
        const totalDeliveryIncome = deliveries
            .filter(d => d.status !== 'cancelled')
            .reduce((sum, d) => sum + (d.total_income || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalFines = fines.reduce((sum, f) => sum + (f.fine_cost || 0), 0);
        const netIncome = totalDeliveryIncome - totalExpenses;
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="financial-report-${Date.now()}.pdf"`);
        // Create PDF document
        const doc = new pdfkit_1.default({ margin: 50 });
        doc.pipe(res);
        // Helper function to format currency
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-RW', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(amount);
        };
        // Helper function to format date
        const formatDate = (date) => {
            if (!date)
                return 'N/A';
            const d = new Date(date);
            return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        };
        // Header
        doc.fontSize(20).text('TruckFlow Logistics', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).text('KG 123 Street, Kacyiru', { align: 'center' });
        doc.text('Kigali, Rwanda', { align: 'center' });
        doc.text('Tel: +250 788 123 456 | Email: info@truckflow.rw', { align: 'center' });
        doc.moveDown(1);
        // Report title
        doc.fontSize(16).text('Financial Report', { align: 'center' });
        if (startDate || endDate) {
            doc.fontSize(10).text(`${startDate ? formatDate(startDate) : 'All Time'} - ${endDate ? formatDate(endDate) : 'Present'}`, { align: 'center' });
        }
        doc.moveDown(1);
        // Summary section
        doc.fontSize(12).text('Summary', { underline: true });
        doc.moveDown(0.5);
        const summaryY = doc.y;
        doc.fontSize(10);
        doc.text(`Total Delivery Income: RWF ${formatCurrency(totalDeliveryIncome)}`, 50, summaryY);
        doc.text(`Total Expenses: RWF ${formatCurrency(totalExpenses)}`, 50, summaryY + 20);
        doc.text(`Total Fines: RWF ${formatCurrency(totalFines)}`, 50, summaryY + 40);
        doc.fontSize(12).fillColor('#2e7d32');
        doc.text(`Net Income: RWF ${formatCurrency(netIncome)}`, 50, summaryY + 60);
        doc.fillColor('#000000');
        doc.moveDown(2);
        // Deliveries table
        doc.fontSize(12).text('Deliveries', { underline: true });
        doc.moveDown(0.5);
        if (deliveries.length > 0) {
            // Table header
            doc.fontSize(9).fillColor('#666666');
            let tableY = doc.y;
            doc.text('Code', 50, tableY);
            doc.text('Date', 150, tableY);
            doc.text('Origin', 250, tableY);
            doc.text('Destination', 350, tableY);
            doc.text('Status', 450, tableY);
            doc.text('Income', 500, tableY, { width: 50, align: 'right' });
            doc.moveDown(0.3);
            doc.strokeColor('#cccccc').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.2);
            // Table rows
            doc.fillColor('#000000');
            deliveries.forEach((delivery, index) => {
                if (doc.y > 700) {
                    doc.addPage();
                    tableY = 50;
                }
                doc.fontSize(8);
                doc.text(delivery.delivery_code || 'N/A', 50, doc.y);
                doc.text(formatDate(delivery.delivery_date), 150, doc.y);
                doc.text(delivery.origin || 'N/A', 250, doc.y, { width: 90 });
                doc.text(delivery.destination || 'N/A', 350, doc.y, { width: 90 });
                doc.text(delivery.status || 'N/A', 450, doc.y);
                doc.text(`RWF ${formatCurrency(delivery.total_income || 0)}`, 500, doc.y, { width: 50, align: 'right' });
                doc.moveDown(0.4);
                if (index < deliveries.length - 1) {
                    doc.strokeColor('#eeeeee').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
                    doc.moveDown(0.2);
                }
            });
        }
        else {
            doc.fontSize(10).text('No deliveries found', { indent: 20 });
        }
        doc.moveDown(1);
        // Expenses table
        doc.fontSize(12).text('Expenses', { underline: true });
        doc.moveDown(0.5);
        if (expenses.length > 0) {
            // Table header
            doc.fontSize(9).fillColor('#666666');
            doc.text('Date', 50, doc.y);
            doc.text('Type', 150, doc.y);
            doc.text('Truck', 250, doc.y);
            doc.text('Amount', 450, doc.y, { width: 100, align: 'right' });
            doc.moveDown(0.3);
            doc.strokeColor('#cccccc').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.2);
            // Table rows
            doc.fillColor('#000000');
            expenses.forEach((expense, index) => {
                if (doc.y > 700) {
                    doc.addPage();
                }
                doc.fontSize(8);
                doc.text(formatDate(expense.expense_date), 50, doc.y);
                doc.text(expense.expense_type || 'N/A', 150, doc.y, { width: 90 });
                doc.text(expense.truck?.license_plate || 'N/A', 250, doc.y);
                doc.text(`RWF ${formatCurrency(expense.amount || 0)}`, 450, doc.y, { width: 100, align: 'right' });
                doc.moveDown(0.4);
                if (index < expenses.length - 1) {
                    doc.strokeColor('#eeeeee').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
                    doc.moveDown(0.2);
                }
            });
        }
        else {
            doc.fontSize(10).text('No expenses found', { indent: 20 });
        }
        doc.moveDown(1);
        // Fines table
        doc.fontSize(12).text('Fines', { underline: true });
        doc.moveDown(0.5);
        if (fines.length > 0) {
            // Table header
            doc.fontSize(9).fillColor('#666666');
            doc.text('Date', 50, doc.y);
            doc.text('Type', 150, doc.y);
            doc.text('Employee', 250, doc.y);
            doc.text('Amount', 450, doc.y, { width: 100, align: 'right' });
            doc.moveDown(0.3);
            doc.strokeColor('#cccccc').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown(0.2);
            // Table rows
            doc.fillColor('#000000');
            fines.forEach((fine, index) => {
                if (doc.y > 700) {
                    doc.addPage();
                }
                doc.fontSize(8);
                doc.text(formatDate(fine.fine_date), 50, doc.y);
                doc.text(fine.fine_type || 'N/A', 150, doc.y, { width: 90 });
                doc.text(fine.employee?.name || 'N/A', 250, doc.y, { width: 90 });
                doc.text(`RWF ${formatCurrency(fine.fine_cost || 0)}`, 450, doc.y, { width: 100, align: 'right' });
                doc.moveDown(0.4);
                if (index < fines.length - 1) {
                    doc.strokeColor('#eeeeee').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
                    doc.moveDown(0.2);
                }
            });
        }
        else {
            doc.fontSize(10).text('No fines found', { indent: 20 });
        }
        // Footer
        doc.moveDown(2);
        doc.fontSize(8).fillColor('#666666').text(`Generated on ${new Date().toLocaleString()} | TruckFlow Logistics Management System`, { align: 'center' });
        // Finalize PDF
        doc.end();
    }
    catch (error) {
        console.error('Error generating financial report:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Failed to generate financial report',
                message: error.message
            });
        }
    }
});
exports.default = router;
//# sourceMappingURL=reports.js.map