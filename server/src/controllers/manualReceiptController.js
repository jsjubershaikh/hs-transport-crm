import ManualReceipt from '../models/ManualReceipt.js';
import Student from '../models/Student.js';
import Settings from '../models/Settings.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { nextManualReceiptNumber } from '../services/receiptService.js';
import { parsePagination, buildMeta, escapeRegex } from '../utils/query.js';

/**
 * POST /api/manual-receipts
 * Create a manual receipt. Purely a document — it does NOT touch any FeeRecord,
 * so fee balances and collection reports are unaffected.
 */
export const createManualReceipt = asyncHandler(async (req, res) => {
  const { studentId, academicYearId, items, paymentMode, paymentDate, collectedBy, note } = req.body;

  if (!studentId) throw ApiError.badRequest('Student is required');
  if (!Array.isArray(items) || items.length === 0) {
    throw ApiError.badRequest('Add at least one line item');
  }

  const clean = items
    .map((it) => ({
      description: String(it.description || '').trim(),
      month: it.month || '',
      amount: Number(it.amount) || 0,
    }))
    .filter((it) => it.description && it.amount > 0);

  if (!clean.length) throw ApiError.badRequest('Each line item needs a description and an amount above zero');

  const student = await Student.findById(studentId).lean();
  if (!student) throw ApiError.notFound('Student not found');

  const total = clean.reduce((sum, it) => sum + it.amount, 0);
  const year = new Date().getFullYear();
  const receiptNumber = await nextManualReceiptNumber(year);

  const receipt = await ManualReceipt.create({
    receiptNumber,
    studentId: student._id,
    studentSnapshot: {
      name: student.name || '',
      fatherName: student.fatherName || '',
      class: student.class || '',
      section: student.section || '',
      mobile: student.mobile || '',
    },
    academicYearId: academicYearId || null,
    routeId: student.routeId || null,
    items: clean,
    amount: total,
    paymentMode: paymentMode || '',
    paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
    collectedBy: collectedBy || '',
    note: note || '',
    generatedBy: req.user.id,
    generatedAt: new Date(),
  });

  return ok(res, receipt, undefined, 201);
});

/** GET /api/manual-receipts — paginated list with search. */
export const listManualReceipts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ receiptNumber: rx }, { 'studentSnapshot.name': rx }];
  }

  const [items, total] = await Promise.all([
    ManualReceipt.find(filter)
      .sort({ generatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('studentId', 'name class mobile')
      .lean(),
    ManualReceipt.countDocuments(filter),
  ]);

  return ok(res, items, buildMeta({ page, limit, total }));
});

/** GET /api/manual-receipts/:id — fully populated receipt for the template. */
export const getManualReceipt = asyncHandler(async (req, res) => {
  const receipt = await ManualReceipt.findById(req.params.id)
    .populate('studentId')
    .populate('academicYearId', 'label')
    .populate('routeId', 'routeName routeNumber')
    .populate('generatedBy', 'name')
    .lean();
  if (!receipt) throw ApiError.notFound('Manual receipt not found');

  const settings = await Settings.findOne().lean();
  return ok(res, { receipt, settings: settings || null });
});

/** POST /api/manual-receipts/:id/printed — stamp printedAt. */
export const markManualPrinted = asyncHandler(async (req, res) => {
  const receipt = await ManualReceipt.findByIdAndUpdate(
    req.params.id,
    { printedAt: new Date() },
    { new: true }
  );
  if (!receipt) throw ApiError.notFound('Manual receipt not found');
  return ok(res, { id: receipt._id, printedAt: receipt.printedAt });
});

/** DELETE /api/manual-receipts/:id — remove a manual receipt (no ledger impact). */
export const deleteManualReceipt = asyncHandler(async (req, res) => {
  const receipt = await ManualReceipt.findByIdAndDelete(req.params.id);
  if (!receipt) throw ApiError.notFound('Manual receipt not found');
  return ok(res, { id: receipt._id, message: 'Manual receipt deleted' });
});
