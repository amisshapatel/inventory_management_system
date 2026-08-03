import express from 'express';
import {
  getTransfers,
  getTransferById,
  createTransfer,
  updateTransferStatus
} from './controller.js';
import { protect, hasPermission } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', hasPermission('stock.view'), getTransfers);
router.get('/:id', hasPermission('stock.view'), getTransferById);
router.post('/', hasPermission('stock.transfer'), createTransfer);
router.put('/:id/status', hasPermission('stock.transfer'), updateTransferStatus);

export default router;
