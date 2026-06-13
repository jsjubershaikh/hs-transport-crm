import { Router } from 'express';
import { body } from 'express-validator';
import {
  listYears,
  createYear,
  updateYear,
  deleteYear,
  setCurrentYear,
  archiveYear,
  promote,
} from '../controllers/academicYearController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

// All authenticated users can READ years (needed for the year selector dropdown).
router.get('/', listYears);

// Writes are superadmin-only.
router.use(requireRole('superadmin'));

const createRules = [
  body('label').matches(/^\d{4}-\d{4}$/).withMessage('Label must look like 2025-2026'),
  body('startDate').isISO8601().withMessage('Valid start date required'),
  body('endDate').isISO8601().withMessage('Valid end date required'),
];

router.post('/', createRules, validate, createYear);
router.put('/:id', updateYear);
router.delete('/:id', deleteYear);
router.post('/:id/set-current', setCurrentYear);
router.post('/:id/archive', archiveYear);
router.post('/promote', promote);

export default router;
