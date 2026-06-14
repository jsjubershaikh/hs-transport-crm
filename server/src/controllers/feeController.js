import mongoose from 'mongoose';
import FeeRecord from '../models/FeeRecord.js';
import Receipt from '../models/Receipt.js';
import Student from '../models/Student.js';
import AcademicYear from '../models/AcademicYear.js';
import Settings from '../models/Settings.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { scopeFilter, ensureRouteAccess } from '../middleware/rbac.js';
import { parsePagination, buildMeta } from '../utils/query.js';
import { resolveYearId, getCurrentYear } from '../utils/academic.js';
import { applyPayment } from '../services/feeService.js';
import { createReceipt, nextReceiptNumber } from '../services/receiptService.js';
import { notify } from '../services/notificationService.js';
import { emitToScope } from '../services/realtime.js';
import { logActivity, clientIp } from '../utils/activityLogger.js';
import { MONTH_LABELS } from '../utils/constants.js';

/**
 * GET /api/fees
 * Fee-management table. Filters: month, routeId, class, status, academicYearId.
 * Uses an aggregation so we can filter by the student's class and return the
 * student/route labels in one round trip. Subadmins are auto-scoped.
 */
export const listFees = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  const match = { ...scopeFilter(req) };
  const yearId = await resolveYearId(req.query);
  if (yearId) match.academicYearId = new mongoose.Types.ObjectId(yearId);
  if (req.query.month) match.month = req.query.month;
  if (req.query.status) match.status = req.query.status;
  if (req.query.routeId && req.user.role === 'superadmin') {
    match.routeId = new mongoose.Types.ObjectId(req.query.routeId);
  }

  const pipeline = [
    { $match: match },
    { $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'student' } },
    { $unwind: '$student' },
    { $lookup: { from: 'routes', localField: 'routeId', foreignField: '_id', as: 'route' } },
    { $unwind: { path: '$route', preserveNullAndEmptyArrays: true } },
  ];
  if (req.query.class) pipeline.push({ $match: { 'student.class': req.query.class } });
  if (req.query.search) {
    const rx = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    pipeline.push({ $match: { 'student.name': rx } });
  }

  pipeline.push(
    {
      $project: {
        month: 1, monthlyFee: 1, paidAmount: 1, remainingAmount: 1, status: 1,
        paymentDate: 1, paymentMode: 1, receiptNumber: 1, academicYearId: 1, routeId: 1,
        studentId: 1,
        'student.name': 1, 'student.class': 1, 'student.section': 1, 'student.mobile': 1,
        'route.routeName': 1, 'route.routeNumber': 1,
      },
    },
    { $sort: { 'student.name': 1, month: 1 } }
  );

  const facet = [
    ...pipeline,
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: 'count' }],
      },
    },
  ];

  const [result] = await FeeRecord.aggregate(facet);
  const items = result?.data || [];
  const total = result?.total?.[0]?.count || 0;

  return ok(res, items, buildMeta({ page, limit, total }));
});

/**
 * GET /api/fees/overview
 * Aggregated cards: current-month collection (from Receipts, not FeeRecords so
 * advance/bulk payments are counted in the month they were RECEIVED),
 * total pending, students with dues, fully-paid students. Scoped by role.
 */
export const feeOverview = asyncHandler(async (req, res) => {
  const scope = scopeFilter(req);
  const yearId = await resolveYearId(req.query);
  const current = await getCurrentYear();
  const currentMonth = req.query.month || guessCurrentMonth(current);

  const baseMatch = { ...scope };
  if (yearId) baseMatch.academicYearId = new mongoose.Types.ObjectId(yearId);

  // Current-month collection — sum of monthly receipts generated THIS calendar month.
  // Using Receipt (not FeeRecord) means advance/bulk payments appear in the month
  // they were physically collected, not the month they were billed for.
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const receiptScope = {};
  if (scope.routeId) receiptScope.routeId = scope.routeId;

  const monthReceiptAgg = await Receipt.aggregate([
    {
      $match: {
        ...receiptScope,
        receiptType: 'monthly', // exclude bulk to avoid double-counting
        generatedAt: { $gte: monthStart, $lt: monthEnd },
      },
    },
    { $group: { _id: null, collected: { $sum: '$amount' } } },
  ]);

  // Current academic month's pending (from FeeRecord — how much is still owed for this month)
  const monthFeeAgg = await FeeRecord.aggregate([
    { $match: { ...baseMatch, month: currentMonth } },
    { $group: { _id: null, pending: { $sum: '$remainingAmount' } } },
  ]);

  // Whole-year pending + students-with-dues (distinct) + fully-paid count.
  const yearAgg = await FeeRecord.aggregate([
    { $match: baseMatch },
    {
      $group: {
        _id: '$studentId',
        remaining: { $sum: '$remainingAmount' },
        paid: { $sum: '$paidAmount' },
        fee: { $sum: '$monthlyFee' },
      },
    },
    {
      $group: {
        _id: null,
        totalPending: { $sum: '$remaining' },
        studentsWithDues: { $sum: { $cond: [{ $gt: ['$remaining', 0] }, 1, 0] } },
        fullyPaidStudents: { $sum: { $cond: [{ $eq: ['$remaining', 0] }, 1, 0] } },
      },
    },
  ]);

  const collected = monthReceiptAgg[0]?.collected || 0;
  const pending   = monthFeeAgg[0]?.pending       || 0;
  const y = yearAgg[0] || { totalPending: 0, studentsWithDues: 0, fullyPaidStudents: 0 };

  return ok(res, {
    month: currentMonth,
    currentMonthCollection: collected,
    currentMonthPending: pending,
    totalPending: y.totalPending,
    studentsWithDues: y.studentsWithDues,
    fullyPaidStudents: y.fullyPaidStudents,
  });
});

/**
 * POST /api/fees/:feeRecordId/collect
 * Apply a (possibly partial) payment, generate a Receipt, notify + emit + log.
 */
export const collectFee = asyncHandler(async (req, res) => {
  const { amount, paymentMode, paymentDate, notes, collectedBy } = req.body;

  const fee = await FeeRecord.findById(req.params.feeRecordId);
  if (!fee) throw ApiError.notFound('Fee record not found');
  ensureRouteAccess(req, fee.routeId);

  if (fee.remainingAmount <= 0) throw ApiError.badRequest('This month is already fully paid');
  if (Number(amount) <= 0) throw ApiError.badRequest('Amount must be greater than zero');
  if (Number(amount) > fee.remainingAmount) {
    throw ApiError.badRequest(`Amount exceeds remaining balance of ₹${fee.remainingAmount}`);
  }

  const { accepted } = applyPayment(fee, { amount, paymentMode, paymentDate, notes });
  if (collectedBy !== undefined) fee.collectedBy = collectedBy;

  const year = await AcademicYear.findById(fee.academicYearId).lean();
  const startYear = year?.startDate ? new Date(year.startDate).getFullYear() : new Date().getFullYear();
  const student = await Student.findById(fee.studentId).lean();

  const receipt = await createReceipt({
    feeRecord: fee,
    student,
    amount: accepted,
    year: startYear,
    generatedBy: req.user.id,
    collectedBy: collectedBy || '',
  });

  fee.receiptNumber = receipt.receiptNumber;
  await fee.save();

  await notify({
    type: 'payment_received',
    message: `Payment of ₹${accepted} received for ${student.name} (${MONTH_LABELS[fee.month] || fee.month})`,
    targetRouteId: fee.routeId,
    relatedId: fee._id,
  });
  emitToScope(
    'fee:updated',
    { entity: fee.toObject(), label: `Fee collected: ${student.name}` },
    { routeId: fee.routeId }
  );
  emitToScope(
    'receipt:created',
    { entity: receipt.toObject(), label: `Receipt ${receipt.receiptNumber}` },
    { routeId: fee.routeId }
  );
  await logActivity({
    userId: req.user.id,
    action: 'fee.collect',
    details: {
      studentId: student._id, name: student.name, month: fee.month,
      amount: accepted, receiptNumber: receipt.receiptNumber,
    },
    ip: clientIp(req),
  });

  return ok(res, { feeRecord: fee.toObject(), receipt: receipt.toObject() }, undefined, 201);
});

/**
 * PUT /api/fees/:feeRecordId/edit  (superadmin only)
 * Correct a previously-collected fee. Resets paidAmount to the supplied value,
 * deletes all receipts linked to this fee record, and re-derives status.
 * A new receipt is generated if the corrected paidAmount > 0.
 */
export const editFee = asyncHandler(async (req, res) => {
  const { paidAmount, paymentMode, paymentDate, notes, collectedBy } = req.body;

  const fee = await FeeRecord.findById(req.params.feeRecordId);
  if (!fee) throw ApiError.notFound('Fee record not found');
  ensureRouteAccess(req, fee.routeId);

  const corrected = Number(paidAmount);
  if (isNaN(corrected) || corrected < 0) throw ApiError.badRequest('paidAmount must be >= 0');
  if (corrected > fee.monthlyFee) {
    throw ApiError.badRequest(`paidAmount cannot exceed monthly fee of ₹${fee.monthlyFee}`);
  }

  // Delete all existing receipts for this fee record.
  await Receipt.deleteMany({ feeRecordId: fee._id });

  fee.paidAmount = corrected;

  // When resetting to 0, clear all payment metadata completely
  if (corrected === 0) {
    fee.paymentMode = undefined;
    fee.paymentDate = undefined;
    fee.collectedBy = '';
    fee.notes = '';
  } else {
    if (paymentMode !== undefined) fee.paymentMode = paymentMode || undefined;
    if (paymentDate !== undefined) fee.paymentDate = paymentDate ? new Date(paymentDate) : undefined;
    if (notes !== undefined) fee.notes = notes;
    if (collectedBy !== undefined) fee.collectedBy = collectedBy;
  }

  fee.receiptNumber = '';
  await fee.save(); // pre-save hook recomputes remainingAmount + status

  const student = await Student.findById(fee.studentId).lean();

  let receipt = null;
  if (fee.paidAmount > 0) {
    const year = await AcademicYear.findById(fee.academicYearId).lean();
    const startYear = year?.startDate ? new Date(year.startDate).getFullYear() : new Date().getFullYear();
    receipt = await createReceipt({
      feeRecord: fee,
      student,
      amount: fee.paidAmount,
      year: startYear,
      generatedBy: req.user.id,
      collectedBy: fee.collectedBy || '',
    });
    fee.receiptNumber = receipt.receiptNumber;
    await fee.save();
  }

  emitToScope('fee:updated', { entity: fee.toObject(), label: `Fee edited: ${student?.name}` }, { routeId: fee.routeId });
  await logActivity({
    userId: req.user.id,
    action: 'fee.edit',
    details: { feeRecordId: fee._id, studentId: fee.studentId, month: fee.month, paidAmount: corrected },
    ip: clientIp(req),
  });

  return ok(res, { feeRecord: fee.toObject(), receipt: receipt?.toObject() || null });
});

/**
 * POST /api/fees/bulk-collect
 * Accept a lump-sum payment for a student and auto-distribute it across
 * pending/partial months in chronological order (oldest first).
 *
 * Algorithm:
 *  1. Load all pending/partial fee records for the student in academic-year month order.
 *  2. Walk through them oldest-first, applying the remaining budget to each:
 *     - If budget >= month's remaining → fully settle that month, carry over.
 *     - If budget < month's remaining → partial payment, stop.
 *  3. Generate ONE bulk receipt covering all months touched.
 *
 * Body: { studentId, academicYearId, amount, paymentMode, paymentDate, notes, collectedBy }
 */
export const bulkCollect = asyncHandler(async (req, res) => {
  const { studentId, academicYearId, amount, paymentMode, paymentDate, notes, collectedBy } = req.body;

  if (!studentId) throw ApiError.badRequest('studentId is required');
  if (!academicYearId) throw ApiError.badRequest('academicYearId is required');
  if (!Number(amount) || Number(amount) <= 0) throw ApiError.badRequest('Amount must be greater than zero');

  const student = await Student.findById(studentId).lean();
  if (!student) throw ApiError.notFound('Student not found');
  ensureRouteAccess(req, student.routeId);

  // Load all outstanding fee records for this student+year, sorted by month order
  const MONTH_ORDER = ['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr'];
  const feeRecords = await FeeRecord.find({
    studentId,
    academicYearId,
    status: { $in: ['pending', 'partial'] },
  }).lean();

  if (!feeRecords.length) throw ApiError.badRequest('No pending fees found for this student');

  // Sort by canonical month order
  feeRecords.sort((a, b) => MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month));

  let budget = Number(amount);
  const settled = []; // { feeRecordId, month, amountApplied }

  for (const fr of feeRecords) {
    if (budget <= 0) break;
    const apply = Math.min(budget, fr.remainingAmount);
    if (apply <= 0) continue;

    // Update fee record directly (bypass pre-save hook issue with lean)
    const doc = await FeeRecord.findById(fr._id);
    doc.paidAmount += apply;
    doc.paymentMode = paymentMode || 'cash';
    doc.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
    if (notes) doc.notes = notes;
    if (collectedBy) doc.collectedBy = collectedBy;
    await doc.save(); // pre-save hook recomputes remainingAmount + status

    settled.push({ feeRecordId: doc._id, month: doc.month, amount: apply, monthlyFee: doc.monthlyFee });
    budget -= apply;
  }

  if (!settled.length) throw ApiError.badRequest('No fees were settled — check pending balance');

  const totalApplied = Number(amount) - budget;

  const year = await AcademicYear.findById(academicYearId).lean();
  const startYear = year?.startDate ? new Date(year.startDate).getFullYear() : new Date().getFullYear();

  // 1. Generate individual MONTHLY receipts for each settled month
  //    so they appear in the standard Receipts tab per month.
  for (const s of settled) {
    const monthlyReceiptNum = await nextReceiptNumber(startYear);
    await Receipt.create({
      receiptNumber: monthlyReceiptNum,
      receiptType: 'monthly',
      studentId: student._id,
      feeRecordId: s.feeRecordId,
      academicYearId,
      routeId: student.routeId,
      amount: s.amount,
      month: s.month,
      paymentMode: paymentMode || 'cash',
      collectedBy: collectedBy || '',
      generatedBy: req.user.id,
      generatedAt: new Date(),
    });
    // Stamp the monthly receipt number onto the fee record
    await FeeRecord.findByIdAndUpdate(s.feeRecordId, { receiptNumber: monthlyReceiptNum });
    s.monthlyReceiptNumber = monthlyReceiptNum;
  }

  // 2. Generate ONE BULK receipt that covers all months (goes to Bulk Receipts tab)
  const bulkReceiptNum = await nextReceiptNumber(startYear);
  const bulkReceipt = await Receipt.create({
    receiptNumber: bulkReceiptNum,
    receiptType: 'bulk',
    studentId: student._id,
    feeRecordId: null,
    bulkDetails: settled.map((s) => ({ feeRecordId: s.feeRecordId, month: s.month, amount: s.amount })),
    academicYearId,
    routeId: student.routeId,
    amount: totalApplied,
    month: settled[0].month,
    collectedBy: collectedBy || '',
    generatedBy: req.user.id,
    generatedAt: new Date(),
  });

  await notify({
    type: 'payment_received',
    message: `Bulk payment of ₹${totalApplied} received for ${student.name} (${settled.length} month${settled.length > 1 ? 's' : ''})`,
    targetRouteId: student.routeId,
    relatedId: bulkReceipt._id,
  });
  emitToScope('fee:updated', { label: `Bulk fee collected: ${student.name}` }, { routeId: student.routeId });
  emitToScope('receipt:created', { entity: bulkReceipt.toObject() }, { routeId: student.routeId });

  await logActivity({
    userId: req.user.id,
    action: 'fee.bulk_collect',
    details: { studentId: student._id, name: student.name, totalAmount: totalApplied, monthsSettled: settled.length },
    ip: clientIp(req),
  });

  return ok(res, {
    receipt: bulkReceipt.toObject(),
    settled,
    totalApplied,
    remainingBudget: budget,
  }, undefined, 201);
});

/**
 * GET /api/fees/family?mobile=&academicYearId=
 * Find all students in the same family (same father mobile) and return
 * their fee summaries for the given academic year.
 */
export const getFamilyFees = asyncHandler(async (req, res) => {
  const { mobile, academicYearId } = req.query;
  if (!mobile) throw ApiError.badRequest('mobile is required');

  const yearId = academicYearId || (await resolveYearId(req.query));
  if (!yearId) throw ApiError.badRequest('academicYearId is required');

  // Find all students with this mobile number (scoped by role)
  const scope = scopeFilter(req);
  const students = await Student.find({
    mobile: String(mobile).trim(),
    academicYearId: yearId,
    ...scope.routeId ? { routeId: scope.routeId } : {},
  })
    .populate('routeId', 'routeName routeNumber')
    .populate('busId', 'busNumber')
    .lean();

  if (!students.length) throw ApiError.notFound('No students found with this mobile number');

  const MONTH_ORDER = ['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr'];

  // Load fee records for all students in this family
  const familyData = await Promise.all(students.map(async (s) => {
    const fees = await FeeRecord.find({ studentId: s._id, academicYearId: yearId }).lean();
    fees.sort((a, b) => MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month));
    const totalPending = fees.reduce((sum, f) => sum + f.remainingAmount, 0);
    const totalPaid = fees.reduce((sum, f) => sum + f.paidAmount, 0);
    const pendingMonths = fees.filter((f) => f.status !== 'paid' || f.remainingAmount > 0).length;
    return { student: s, fees, totalPending, totalPaid, pendingMonths };
  }));

  const grandTotalPending = familyData.reduce((s, d) => s + d.totalPending, 0);
  const grandTotalPaid = familyData.reduce((s, d) => s + d.totalPaid, 0);

  return ok(res, {
    mobile,
    familyName: students[0]?.fatherName || 'Family',
    studentCount: students.length,
    grandTotalPending,
    grandTotalPaid,
    members: familyData,
  });
});

/**
 * POST /api/fees/family-collect
 * Collect one payment for a whole family. Distributes across all members
 * oldest-due-first within each student, then moves to the next student.
 *
 * Distribution order: student order as returned (same as family query),
 * within each student: oldest month first.
 *
 * Body: { mobile, academicYearId, amount, paymentMode, paymentDate, notes, collectedBy }
 */
export const familyCollect = asyncHandler(async (req, res) => {
  const { mobile, academicYearId, amount, paymentMode, paymentDate, notes, collectedBy } = req.body;

  if (!mobile) throw ApiError.badRequest('mobile is required');
  if (!academicYearId) throw ApiError.badRequest('academicYearId is required');
  if (!Number(amount) || Number(amount) <= 0) throw ApiError.badRequest('Amount must be greater than zero');

  const scope = scopeFilter(req);
  const students = await Student.find({
    mobile: String(mobile).trim(),
    academicYearId,
    ...scope.routeId ? { routeId: scope.routeId } : {},
  }).lean();

  if (!students.length) throw ApiError.notFound('No students found with this mobile number');

  const MONTH_ORDER = ['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr'];
  const year = await AcademicYear.findById(academicYearId).lean();
  const startYear = year?.startDate ? new Date(year.startDate).getFullYear() : new Date().getFullYear();
  const { nextReceiptNumber } = await import('../services/receiptService.js');

  let budget = Number(amount);
  const allSettled = []; // { studentId, studentName, feeRecordId, month, amount }

  for (const student of students) {
    if (budget <= 0) break;

    const feeRecords = await FeeRecord.find({
      studentId: student._id,
      academicYearId,
      status: { $in: ['pending', 'partial'] },
    }).lean();
    feeRecords.sort((a, b) => MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month));

    for (const fr of feeRecords) {
      if (budget <= 0) break;
      const apply = Math.min(budget, fr.remainingAmount);
      if (apply <= 0) continue;

      const doc = await FeeRecord.findById(fr._id);
      doc.paidAmount += apply;
      doc.paymentMode = paymentMode || 'cash';
      doc.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
      if (notes) doc.notes = notes;
      if (collectedBy) doc.collectedBy = collectedBy;
      await doc.save();

      // Generate individual monthly receipt for this student+month
      const monthlyReceiptNum = await nextReceiptNumber(startYear);
      await Receipt.create({
        receiptNumber: monthlyReceiptNum,
        receiptType: 'monthly',
        studentId: student._id,
        feeRecordId: doc._id,
        academicYearId,
        routeId: student.routeId,
        amount: apply,
        month: doc.month,
        collectedBy: collectedBy || '',
        generatedBy: req.user.id,
        generatedAt: new Date(),
      });
      await FeeRecord.findByIdAndUpdate(doc._id, { receiptNumber: monthlyReceiptNum });

      allSettled.push({
        studentId: student._id,
        studentName: student.name,
        feeRecordId: doc._id,
        month: doc.month,
        amount: apply,
      });
      budget -= apply;
    }
  }

  if (!allSettled.length) throw ApiError.badRequest('No pending fees found for this family');

  const totalApplied = Number(amount) - budget;

  // One family bulk receipt covering all students + months
  const bulkReceiptNum = await nextReceiptNumber(startYear);
  const familyReceipt = await Receipt.create({
    receiptNumber: bulkReceiptNum,
    receiptType: 'bulk',
    studentId: students[0]._id, // primary student for reference
    feeRecordId: null,
    bulkDetails: allSettled.map((s) => ({ feeRecordId: s.feeRecordId, month: s.month, amount: s.amount })),
    academicYearId,
    routeId: students[0].routeId,
    amount: totalApplied,
    month: allSettled[0].month,
    collectedBy: collectedBy || '',
    generatedBy: req.user.id,
    generatedAt: new Date(),
  });

  await notify({
    type: 'payment_received',
    message: `Family payment of ₹${totalApplied} received for ${students[0].fatherName}'s family (${students.length} students, ${allSettled.length} months)`,
    targetRouteId: students[0].routeId,
    relatedId: familyReceipt._id,
  });
  emitToScope('fee:updated', { label: `Family fee collected: ${students[0].fatherName}` }, { routeId: students[0].routeId });

  await logActivity({
    userId: req.user.id,
    action: 'fee.family_collect',
    details: { mobile, familyName: students[0].fatherName, totalAmount: totalApplied, studentsCount: students.length, monthsSettled: allSettled.length },
    ip: clientIp(req),
  });

  return ok(res, {
    receipt: familyReceipt.toObject(),
    settled: allSettled,
    totalApplied,
    remainingBudget: budget,
    studentsCount: students.length,
  }, undefined, 201);
});

/**
 * POST /api/fees/adjust
 * Mark specific months as waived/N-A for a student who joined mid-year.
 * Sets monthlyFee=0, paidAmount=0, status=paid (effectively free) on the
 * selected months so they don't count as outstanding.
 * Body: { studentId, academicYearId, months: ['Jun','Jul'] }
 */
export const adjustFees = asyncHandler(async (req, res) => {
  const { studentId, academicYearId, months, reason, restore, restoreFee } = req.body;
  if (!studentId || !academicYearId || !Array.isArray(months) || !months.length) {
    throw ApiError.badRequest('studentId, academicYearId and months[] are required');
  }

  const student = await Student.findById(studentId).lean();
  if (!student) throw ApiError.notFound('Student not found');
  ensureRouteAccess(req, student.routeId);

  const updated = [];
  for (const month of months) {
    const fee = await FeeRecord.findOne({ studentId, academicYearId, month });
    if (!fee) continue;

    if (restore) {
      // Restore a previously-waived month back to the student's current monthly fee.
      // We only set monthlyFee and paidAmount=0 — the pre-save hook recomputes
      // remainingAmount and status correctly (pending, since paid=0 and fee>0).
      const feeAmount = Number(restoreFee) || Number(student.monthlyFee) || 0;
      await Receipt.deleteMany({ feeRecordId: fee._id });
      fee.monthlyFee    = feeAmount;
      fee.paidAmount    = 0;
      fee.notes         = reason || 'Restored after student rejoin';
      fee.collectedBy   = '';
      fee.paymentDate   = undefined;
      fee.paymentMode   = undefined;
      fee.receiptNumber = '';
      // Let the pre-save hook set remainingAmount and status from these values
    } else {
      // Waive — set monthlyFee=0, paidAmount=0. The pre-save hook will set
      // remainingAmount=0 and status='pending' (not 'paid') because with fee=0,
      // paid=0: remaining = max(0-0,0)=0, status = pending (paid<=0).
      // This is fine — a ₹0 pending month won't show as a due.
      await Receipt.deleteMany({ feeRecordId: fee._id });
      fee.monthlyFee    = 0;
      fee.paidAmount    = 0;
      fee.notes         = reason || 'Waived — student left transport';
      fee.collectedBy   = '';
      fee.paymentDate   = undefined;
      fee.paymentMode   = undefined;
      fee.receiptNumber = '';
    }
    await fee.save();
    updated.push(month);
  }

  emitToScope('fee:updated', { label: `Fees adjusted for ${student.name}` }, { routeId: student.routeId });
  await logActivity({
    userId: req.user.id,
    action: 'fee.adjust',
    details: { studentId, name: student.name, months: updated, reason, restore: !!restore },
    ip: clientIp(req),
  });

  return ok(res, { adjusted: updated, studentName: student.name });
});

/**
 * POST /api/fees/reminders
 * Renders a reminder message + wa.me link per student. Does NOT actually send.
 *
 * INTEGRATION POINT: to really send, replace the link-building below with a call
 * to the WhatsApp Business API / Twilio / MSG91 using the keys configured in
 * Settings, then mark each reminder as dispatched.
 */
export const sendReminders = asyncHandler(async (req, res) => {
  const { feeRecordIds = [], channel = 'whatsapp' } = req.body;
  if (!Array.isArray(feeRecordIds) || feeRecordIds.length === 0) {
    throw ApiError.badRequest('Select at least one fee record');
  }

  const scope = scopeFilter(req);
  const fees = await FeeRecord.find({ _id: { $in: feeRecordIds }, ...scope })
    .populate('studentId', 'name mobile class')
    .lean();

  const settings = await Settings.findOne().lean();
  const template =
    channel === 'sms'
      ? settings?.reminders?.smsTemplate
      : settings?.reminders?.whatsappTemplate;
  const fallback =
    'Dear Parent of {studentName}, Transport fee for {month} is ₹{remaining} pending. Kindly pay at earliest. - HS School Bus';

  const messages = fees
    .filter((f) => f.studentId)
    .map((f) => {
      const text = (template || fallback)
        .replace(/{studentName}/g, f.studentId.name)
        .replace(/{month}/g, MONTH_LABELS[f.month] || f.month)
        .replace(/{remaining}/g, f.remainingAmount);
      return {
        feeRecordId: f._id,
        studentName: f.studentId.name,
        mobile: f.studentId.mobile,
        month: f.month,
        remaining: f.remainingAmount,
        message: text,
        waLink: `https://wa.me/91${f.studentId.mobile}?text=${encodeURIComponent(text)}`,
      };
    });

  await logActivity({
    userId: req.user.id,
    action: 'fee.reminders',
    details: { count: messages.length, channel },
    ip: clientIp(req),
  });

  return ok(res, { channel, count: messages.length, messages });
});

// --- helpers ---

/** Best-effort "current month" within the academic season for the overview card. */
function guessCurrentMonth(year) {
  const codes = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const season = ['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr'];
  const now = new Date();
  const code = codes[now.getMonth()];
  if (season.includes(code)) return code;
  // Outside the season (May) default to the first collectable month.
  return 'Jun';
}
