import express from 'express';
import multer from 'multer';
import { previewUpload, validateMappedData, commitImport } from './controller.js';
import { protect, hasPermission } from '../../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);
router.use(hasPermission('import.export'));

router.post('/preview', upload.single('file'), previewUpload);
router.post('/validate', validateMappedData);
router.post('/commit', commitImport);

export default router;
