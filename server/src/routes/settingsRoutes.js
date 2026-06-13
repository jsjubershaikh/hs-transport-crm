import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  getActivityLogs,
} from '../controllers/settingsController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();
router.use(authenticate, requireRole('superadmin'));

router.get('/', getSettings);
router.put('/', updateSettings);
router.get('/activity-logs', getActivityLogs);

export default router;
