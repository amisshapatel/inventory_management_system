import express from 'express';
import { getDashboardStats, getAgingReport } from './controller.js';
import { protect, hasPermission } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboardStats); // Dashboard metric lookup
router.get('/aging', hasPermission('report.view'), getAgingReport);

export default router;
