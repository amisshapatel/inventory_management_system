import express from 'express';
import {
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse
} from './controller.js';
import { protect, hasPermission } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', hasPermission('warehouse.view'), getWarehouses);
router.get('/:id', hasPermission('warehouse.view'), getWarehouseById);
router.post('/', hasPermission('warehouse.create'), createWarehouse);
router.put('/:id', hasPermission('warehouse.edit'), updateWarehouse);
router.delete('/:id', hasPermission('warehouse.edit'), deleteWarehouse);

export default router;
