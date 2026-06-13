import { Router } from 'express';
import {
  listArchivedYears,
  getArchivedYear,
  getArchivedStudent,
} from '../controllers/archiveController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();
router.use(authenticate, requireRole('superadmin'));

router.get('/years', listArchivedYears);
router.get('/years/:id', getArchivedYear);
router.get('/years/:id/students/:studentId', getArchivedStudent);

export default router;
