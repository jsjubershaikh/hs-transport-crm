import { Router } from 'express';
import { body } from 'express-validator';
import {
  listFees,
  feeOverview,
  collectFee,
  editFee,
  bulkCollect,
  adjustFees,
  getFamilyFees,
  familyCollect,
  sendReminders,
} from '../controllers/feeController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { PAYMENT_MODES } from '../utils/constants.js';

const router = Router();
router.use(authenticate);

router.get('/', listFees);
router.get('/overview', feeOverview);

router.post(
  '/:feeRecordId/collect',
  [
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than zero'),
    body('paymentMode').isIn(PAYMENT_MODES).withMessage('Invalid payment mode'),
    body('paymentDate').optional().isISO8601().withMessage('Invalid date'),
  ],
  validate,
  collectFee
);

router.put(
  '/:feeRecordId/edit',
  requireRole('superadmin'),
  [
    body('paidAmount').isFloat({ min: 0 }).withMessage('paidAmount must be >= 0'),
    body('paymentMode').optional().isIn(PAYMENT_MODES).withMessage('Invalid payment mode'),
    body('paymentDate').optional().isISO8601().withMessage('Invalid date'),
  ],
  validate,
  editFee
);

router.post('/reminders', sendReminders);

router.get('/family', getFamilyFees);

router.post(
  '/family-collect',
  [
    body('mobile').matches(/^[0-9]{10}$/).withMessage('mobile must be 10 digits'),
    body('academicYearId').notEmpty().isMongoId().withMessage('academicYearId required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than zero'),
    body('paymentMode').isIn(PAYMENT_MODES).withMessage('Invalid payment mode'),
    body('paymentDate').optional().isISO8601().withMessage('Invalid date'),
  ],
  validate,
  familyCollect
);

router.post(
  '/adjust',
  [
    body('studentId').notEmpty().isMongoId(),
    body('academicYearId').notEmpty().isMongoId(),
    body('months').isArray({ min: 1 }).withMessage('At least one month required'),
  ],
  validate,
  adjustFees
);

router.post(
  '/bulk-collect',
  [
    body('studentId').notEmpty().isMongoId().withMessage('studentId required'),
    body('academicYearId').notEmpty().isMongoId().withMessage('academicYearId required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than zero'),
    body('paymentMode').isIn(PAYMENT_MODES).withMessage('Invalid payment mode'),
    body('paymentDate').optional().isISO8601().withMessage('Invalid date'),
  ],
  validate,
  bulkCollect
);

export default router;
