import { Router } from 'express';
import {
  listManualReceipts,
  getManualReceipt,
  createManualReceipt,
  updateManualReceipt,
  deleteManualReceipt,
} from '../controllers/manualReceiptController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// Authenticate all requests first
router.use(authenticate);

// Limit CRUD operations to superadmin only
router.use(requireRole('superadmin'));

router.get('/', listManualReceipts);
router.get('/:id', getManualReceipt);
router.post('/', createManualReceipt);
router.put('/:id', updateManualReceipt);
router.delete('/:id', deleteManualReceipt);

export default router;
