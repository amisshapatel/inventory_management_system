import express from 'express';
import {
  getPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchaseStatus
} from './controller.js';
import { protect, hasPermission } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', hasPermission('purchase.view'), getPurchases);
router.get('/:id', hasPermission('purchase.view'), getPurchaseById);
router.post('/', hasPermission('purchase.create'), createPurchase);
router.put('/:id/status', hasPermission('purchase.edit'), updatePurchaseStatus);

export default router;
