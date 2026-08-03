import express from 'express';
import {
  getSales,
  getSaleById,
  createSale,
  updateSaleStatus
} from './controller.js';
import { protect, hasPermission } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', hasPermission('sale.view'), getSales);
router.get('/:id', hasPermission('sale.view'), getSaleById);
router.post('/', hasPermission('sale.create'), createSale);

// Endpoint to change status (Requires create permission for Complete, and cancel permission for Cancel)
router.put('/:id/status', (req, res, next) => {
  const { status } = req.body;
  if (status === 'Cancelled') {
    return hasPermission('sale.cancel')(req, res, next);
  }
  return hasPermission('sale.create')(req, res, next);
}, updateSaleStatus);

export default router;
