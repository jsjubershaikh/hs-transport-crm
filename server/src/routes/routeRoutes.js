import { Router } from 'express';
import { body } from 'express-validator';
import {
  listRoutes,
  getRoute,
  createRoute,
  updateRoute,
  deleteRoute,
} from '../controllers/routeController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

const rules = [
  body('routeName').trim().notEmpty().withMessage('Route name is required'),
  body('routeNumber').trim().notEmpty().withMessage('Route number is required'),
  body('driverName').trim().notEmpty().withMessage('Driver name is required'),
  body('driverContact').matches(/^[0-9]{10}$/).withMessage('Driver contact must be 10 digits'),
  body('busId').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid bus'),
  body('defaultMonthlyFee').optional().isFloat({ min: 0 }),
];

// Reads available to both roles (subadmin auto-scoped to own route).
router.get('/', listRoutes);
router.get('/:id', getRoute);

// Writes are superadmin-only.
router.post('/', requireRole('superadmin'), rules, validate, createRoute);
router.put('/:id', requireRole('superadmin'), updateRoute);
router.delete('/:id', requireRole('superadmin'), deleteRoute);

export default router;
