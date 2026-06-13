import { Router } from 'express';
import { body } from 'express-validator';
import { login, logout, me, verifyPassword } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

router.post('/logout', logout);
router.get('/me', authenticate, me);
router.post('/verify-password', authenticate, verifyPassword);

export default router;
