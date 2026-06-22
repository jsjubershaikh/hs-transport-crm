import { Router } from 'express';
import { body } from 'express-validator';
import {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  updateSiblings,
  setSiblingStatus,
  getStudentFees,
  getStudentReceipts,
  getStudentHistory,
} from '../controllers/studentController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { CLASSES, SECTIONS, GENDERS } from '../utils/constants.js';

const router = Router();
router.use(authenticate);

const createRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('fatherName').trim().notEmpty().withMessage('Father name is required'),
  body('motherName').trim().notEmpty().withMessage('Mother name is required'),
  body('mobile').matches(/^[0-9]{10}$/).withMessage('Mobile must be 10 digits'),
  body('altMobile').optional({ checkFalsy: true }).matches(/^[0-9]{10}$/).withMessage('Alt mobile must be 10 digits'),
  body('gender').optional().isIn(GENDERS),
  body('class').isIn(CLASSES).withMessage('Invalid class'),
  body('section').optional().isIn(SECTIONS),
  body('school').trim().notEmpty().withMessage('School is required'),
  body('routeId').notEmpty().withMessage('Route is required').isMongoId(),
  body('busId').notEmpty().withMessage('Bus is required').isMongoId(),
  body('pickupPoint').trim().notEmpty().withMessage('Pickup point is required'),
  body('dropPoint').trim().notEmpty().withMessage('Drop point is required'),
  body('monthlyFee').isFloat({ min: 0 }).withMessage('Monthly fee must be a positive number'),
];

router.get('/', listStudents);
router.get('/:id', getStudent);
router.get('/:id/fees', getStudentFees);
router.get('/:id/receipts', getStudentReceipts);
router.get('/:id/history', getStudentHistory);

router.post('/', createRules, validate, createStudent);
router.put('/:id', updateStudent);
router.put('/:id/siblings', updateSiblings);
router.patch('/:id/siblings/:siblingId/status', setSiblingStatus);
router.delete('/:id', requireRole('superadmin'), deleteStudent);

export default router;
