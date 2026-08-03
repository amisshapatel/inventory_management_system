import express from 'express';
import { getUsers, createUser, updateUser, deleteUser } from './controller.js';
import { protect, hasPermission } from '../../middleware/auth.js';

const router = express.Router();

// Apply protect middleware to all routes in this router
router.use(protect);

router.get('/', hasPermission('user.manage'), getUsers);
router.post('/', hasPermission('user.manage'), createUser);
router.put('/:id', hasPermission('user.manage'), updateUser);
router.delete('/:id', hasPermission('user.manage'), deleteUser);

export default router;
