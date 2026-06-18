import { Router } from 'express';
import {
  createManualReceipt,
  listManualReceipts,
  getManualReceipt,
  markManualPrinted,
  deleteManualReceipt,
} from '../controllers/manualReceiptController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

// Manual receipts are a sensitive, ledger-independent override → superadmin only.
const router = Router();
router.use(authenticate, requireRole('superadmin'));

router.get('/', listManualReceipts);
router.post('/', createManualReceipt);
router.get('/:id', getManualReceipt);
router.post('/:id/printed', markManualPrinted);
router.delete('/:id', deleteManualReceipt);

export default router;
