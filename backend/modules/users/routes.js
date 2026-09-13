import express from 'express';
import { 
  getUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  getRoles,
  updateRolePermissions,
  resetRolePermissions
} from './controller.js';
import { protect, hasPermission } from '../../middleware/auth.js';

const router = express.Router();

// Apply protect middleware to all routes in this router
router.use(protect);

router.get('/roles', hasPermission('user.manage'), getRoles);
router.put('/roles/:roleName/permissions', hasPermission('user.manage'), updateRolePermissions);
router.post('/roles/:roleName/reset', hasPermission('user.manage'), resetRolePermissions);

router.get('/', hasPermission('user.manage'), getUsers);
router.post('/', hasPermission('user.manage'), createUser);
router.put('/:id', hasPermission('user.manage'), updateUser);
router.delete('/:id', hasPermission('user.manage'), deleteUser);

export default router;
