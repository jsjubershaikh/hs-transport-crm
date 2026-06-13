import { Router } from 'express';
import { body } from 'express-validator';
import { listBuses, createBus, updateBus, deleteBus } from '../controllers/busController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

const rules = [
  body('busNumber').trim().notEmpty().withMessage('Bus number is required'),
  body('vehicleNumber').trim().notEmpty().withMessage('Vehicle number is required'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  body('driverContact').optional({ checkFalsy: true }).matches(/^[0-9]{10}$/).withMessage('Driver contact must be 10 digits'),
  body('assignedRouteId').optional({ checkFalsy: true }).isMongoId(),
];

router.get('/', listBuses);
router.post('/', requireRole('superadmin'), rules, validate, createBus);
router.put('/:id', requireRole('superadmin'), updateBus);
router.delete('/:id', requireRole('superadmin'), deleteBus);

export default router;
