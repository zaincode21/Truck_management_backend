import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
const router = Router();
/**
 * @swagger
 * /api/settings:
 *   get:
 *     tags: [Settings]
 *     summary: Get all settings
 *     description: Retrieves application and company settings
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
    try {
        const appSettings = await prisma.settings.findUnique({
            where: { setting_type: 'app' }
        });
        const companySettings = await prisma.settings.findUnique({
            where: { setting_type: 'company' }
        });
        res.json({
            app: appSettings || {
                currency: 'RFW',
                date_format: 'YYYY-MM-DD',
                language: 'en',
                theme: 'system',
                items_per_page: '10'
            },
            company: companySettings || {
                company_name: '',
                company_email: '',
                company_phone: '',
                company_address: '',
                company_city: '',
                company_website: ''
            }
        });
    }
    catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});
/**
 * @swagger
 * /api/settings/app:
 *   put:
 *     tags: [Settings]
 *     summary: Update application settings
 *     description: Updates application preferences
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currency:
 *                 type: string
 *               date_format:
 *                 type: string
 *               language:
 *                 type: string
 *               theme:
 *                 type: string
 *               items_per_page:
 *                 type: string
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       500:
 *         description: Internal server error
 */
router.put('/app', async (req, res) => {
    try {
        const { currency, date_format, language, theme, items_per_page } = req.body;
        const settings = await prisma.settings.upsert({
            where: { setting_type: 'app' },
            update: {
                currency: currency || null,
                date_format: date_format || null,
                language: language || null,
                theme: theme || null,
                items_per_page: items_per_page || null,
            },
            create: {
                setting_type: 'app',
                currency: currency || 'RFW',
                date_format: date_format || 'YYYY-MM-DD',
                language: language || 'en',
                theme: theme || 'system',
                items_per_page: items_per_page || '10',
            }
        });
        res.json(settings);
    }
    catch (error) {
        console.error('Error updating app settings:', error);
        res.status(500).json({ error: 'Failed to update application settings' });
    }
});
/**
 * @swagger
 * /api/settings/company:
 *   put:
 *     tags: [Settings]
 *     summary: Update company settings
 *     description: Updates company information
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               company_name:
 *                 type: string
 *               company_email:
 *                 type: string
 *               company_phone:
 *                 type: string
 *               company_address:
 *                 type: string
 *               company_city:
 *                 type: string
 *               company_website:
 *                 type: string
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       500:
 *         description: Internal server error
 */
router.put('/company', async (req, res) => {
    try {
        const { company_name, company_email, company_phone, company_address, company_city, company_website } = req.body;
        const settings = await prisma.settings.upsert({
            where: { setting_type: 'company' },
            update: {
                company_name: company_name || null,
                company_email: company_email || null,
                company_phone: company_phone || null,
                company_address: company_address || null,
                company_city: company_city || null,
                company_website: company_website || null,
            },
            create: {
                setting_type: 'company',
                company_name: company_name || null,
                company_email: company_email || null,
                company_phone: company_phone || null,
                company_address: company_address || null,
                company_city: company_city || null,
                company_website: company_website || null,
            }
        });
        res.json(settings);
    }
    catch (error) {
        console.error('Error updating company settings:', error);
        res.status(500).json({ error: 'Failed to update company settings' });
    }
});
export default router;
//# sourceMappingURL=settings.js.map