import express from 'express';
import { login, getMe, updateMyPassword } from './controller.js';
import { protect } from '../../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/update-password', protect, updateMyPassword);

export default router;
