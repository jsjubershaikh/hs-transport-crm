import { Router } from 'express';
import { listReceipts, getReceipt, markPrinted } from '../controllers/receiptController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', listReceipts);
router.get('/:id', getReceipt);
router.post('/:id/printed', markPrinted);

export default router;
