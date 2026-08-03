import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCustomFieldDefinitions,
  createCustomFieldDefinition,
  deleteCustomFieldDefinition
} from './controller.js';
import { protect, hasPermission } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Custom fields endpoints (Manageable by users who can edit settings or products)
router.get('/custom-fields', getCustomFieldDefinitions);
router.post('/custom-fields', hasPermission('settings.manage'), createCustomFieldDefinition);
router.delete('/custom-fields/:id', hasPermission('settings.manage'), deleteCustomFieldDefinition);

// Product CRUD endpoints
router.get('/', hasPermission('product.view'), getProducts);
router.get('/:id', hasPermission('product.view'), getProductById);
router.post('/', hasPermission('product.create'), createProduct);
router.put('/:id', hasPermission('product.edit'), updateProduct);
router.delete('/:id', hasPermission('product.delete'), deleteProduct);

export default router;
