import express from 'express';
import { getSettings, updateSystemSettings, updateNotificationSetting, seedNotificationSettings, sendTestEmail } from './controller.js';
import { protect, hasPermission } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', hasPermission('settings.manage'), getSettings);
router.put('/system', hasPermission('settings.manage'), updateSystemSettings);
router.put('/notifications/:id', hasPermission('settings.manage'), updateNotificationSetting);
router.post('/seed-notifications', hasPermission('settings.manage'), seedNotificationSettings);
router.post('/send-test-email', hasPermission('settings.manage'), sendTestEmail);

export default router;
