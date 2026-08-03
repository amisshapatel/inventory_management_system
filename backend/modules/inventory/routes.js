import express from 'express';
import { getInventory, adjustStockManual, getStockMovements } from './controller.js';
import { protect, hasPermission } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', hasPermission('stock.view'), getInventory);
router.post('/adjust', hasPermission('stock.adjust'), adjustStockManual);
router.get('/movements', hasPermission('stock.view'), getStockMovements);

export default router;
