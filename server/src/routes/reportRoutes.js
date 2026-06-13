import { Router } from 'express';
import {
  financialMonthly,
  financialRouteWise,
  financialPending,
  financialYearComparison,
  studentsByClass,
  studentsRouteWise,
  studentsAdmissions,
  studentsAlumni,
  dailyCollection,
} from '../controllers/reportController.js';
import { verifyCollection } from '../controllers/verificationController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();
router.use(authenticate);

// Financial reports — superadmin only
router.get('/financial/monthly',         requireRole('superadmin'), financialMonthly);
router.get('/financial/route-wise',      requireRole('superadmin'), financialRouteWise);
router.get('/financial/pending',         requireRole('superadmin'), financialPending);
router.get('/financial/year-comparison', requireRole('superadmin'), financialYearComparison);

// Student reports — superadmin only
router.get('/students/by-class',   requireRole('superadmin'), studentsByClass);
router.get('/students/route-wise', requireRole('superadmin'), studentsRouteWise);
router.get('/students/admissions', requireRole('superadmin'), studentsAdmissions);
router.get('/students/alumni',     requireRole('superadmin'), studentsAlumni);

// Daily collection — available to both superadmin and subadmin
router.get('/daily-collection', dailyCollection);

// Cash handover verification — superadmin only
router.post('/verify-collection', requireRole('superadmin'), verifyCollection);

export default router;

