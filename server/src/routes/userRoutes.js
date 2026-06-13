import { Router } from 'express';
import { body } from 'express-validator';
import {
  listSubAdmins,
  createSubAdmin,
  updateSubAdmin,
  deleteSubAdmin,
  resetSubAdminPassword,
  changeOwnPassword,
  updateOwnProfile,
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

// Any authenticated user can change their own password or update their profile.
router.post(
  '/me/password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  validate,
  changeOwnPassword
);

router.put(
  '/me/profile',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('mobile').optional().matches(/^[0-9]{10}$/).withMessage('Mobile must be 10 digits'),
    body('username').optional().trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  ],
  validate,
  updateOwnProfile
);

// Everything below is superadmin-only.
router.use(requireRole('superadmin'));

const createRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('mobile').matches(/^[0-9]{10}$/).withMessage('Mobile must be 10 digits'),
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('assignedRouteId').notEmpty().isMongoId().withMessage('Assigned route is required'),
];

router.get('/subadmins', listSubAdmins);
router.post('/subadmins', createRules, validate, createSubAdmin);
router.put('/subadmins/:id', updateSubAdmin);
router.delete('/subadmins/:id', deleteSubAdmin);
router.post('/subadmins/:id/reset-password', resetSubAdminPassword);

export default router;
