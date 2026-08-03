import express from 'express';
import { getSettings, updateSystemSettings, updateNotificationSetting } from './controller.js';
import { protect, hasPermission } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', hasPermission('settings.manage'), getSettings);
router.put('/system', hasPermission('settings.manage'), updateSystemSettings);
router.put('/notifications/:id', hasPermission('settings.manage'), updateNotificationSetting);

export default router;
