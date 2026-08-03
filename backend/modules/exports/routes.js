import express from 'express';
import { exportProducts } from './controller.js';
import { protect, hasPermission } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(hasPermission('import.export'));

router.get('/products', exportProducts);

export default router;
