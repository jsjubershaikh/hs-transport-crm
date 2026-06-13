import mongoose from 'mongoose';
import FeeRecord from '../models/FeeRecord.js';
import Receipt from '../models/Receipt.js';
import Student from '../models/Student.js';
import CollectionVerification from '../models/CollectionVerification.js';
import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { resolveYearId } from '../utils/academic.js';
import { MONTHS, CLASSES } from '../utils/constants.js';

/**
 * Reports are superadmin-only (enforced in the route file) and run MongoDB
 * aggregation pipelines over the whole dataset.
 *
 * SCALE NOTE: these read-heavy aggregations are good candidates to cache in
 * Redis (keyed by yearId/month) for high read volume.
 */

/** GET /api/reports/financial/monthly?yearId= — 11-month collection table + chart. */
export const financialMonthly = asyncHandler(async (req, res) => {
  const yearId = await resolveYearId(req.query);
  const match = yearId ? { academicYearId: new mongoose.Types.ObjectId(yearId) } : {};

  const rows = await FeeRecord.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$month',
        expected: { $sum: '$monthlyFee' },
        collected: { $sum: '$paidAmount' },
        pending: { $sum: '$remainingAmount' },
      },
    },
  ]);
  const map = new Map(rows.map((r) => [r._id, r]));
  const series = MONTHS.map((m) => ({
    month: m,
    expected: map.get(m)?.expected || 0,
    collected: map.get(m)?.collected || 0,
    pending: map.get(m)?.pending || 0,
  }));
  const totals = series.reduce(
    (acc, r) => ({
      expected: acc.expected + r.expected,
      collected: acc.collected + r.collected,
      pending: acc.pending + r.pending,
    }),
    { expected: 0, collected: 0, pending: 0 }
  );
  return ok(res, { yearId, series, totals });
});

/** GET /api/reports/financial/route-wise?yearId=&month= — per-route collection. */
export const financialRouteWise = asyncHandler(async (req, res) => {
  const yearId = await resolveYearId(req.query);
  const match = {};
  if (yearId) match.academicYearId = new mongoose.Types.ObjectId(yearId);
  if (req.query.month) match.month = req.query.month;

  const rows = await FeeRecord.aggregate([
    { $match: match },
    { $group: { _id: '$routeId', collected: { $sum: '$paidAmount' }, pending: { $sum: '$remainingAmount' }, expected: { $sum: '$monthlyFee' } } },
    { $lookup: { from: 'routes', localField: '_id', foreignField: '_id', as: 'route' } },
    { $unwind: { path: '$route', preserveNullAndEmptyArrays: true } },
    { $project: { routeName: '$route.routeName', routeNumber: '$route.routeNumber', collected: 1, pending: 1, expected: 1 } },
    { $sort: { routeNumber: 1 } },
  ]);
  return ok(res, { yearId, month: req.query.month || null, rows });
});

/** GET /api/reports/financial/pending?yearId=&class=&routeId=&month= */
export const financialPending = asyncHandler(async (req, res) => {
  const yearId = await resolveYearId(req.query);
  const match = { remainingAmount: { $gt: 0 } };
  if (yearId) match.academicYearId = new mongoose.Types.ObjectId(yearId);
  if (req.query.routeId) match.routeId = new mongoose.Types.ObjectId(req.query.routeId);
  if (req.query.month) match.month = req.query.month;

  const pipeline = [
    { $match: match },
    { $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'student' } },
    { $unwind: '$student' },
  ];
  if (req.query.class) pipeline.push({ $match: { 'student.class': req.query.class } });
  pipeline.push(
    { $lookup: { from: 'routes', localField: 'routeId', foreignField: '_id', as: 'route' } },
    { $unwind: { path: '$route', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        studentName: '$student.name', fatherName: '$student.fatherName', class: '$student.class',
        mobile: '$student.mobile', routeName: '$route.routeName', month: 1, remainingAmount: 1, status: 1,
      },
    },
    { $sort: { remainingAmount: -1 } }
  );
  const rows = await FeeRecord.aggregate(pipeline);
  const totalPending = rows.reduce((s, r) => s + r.remainingAmount, 0);
  return ok(res, { yearId, totalPending, count: rows.length, rows });
});

/** GET /api/reports/financial/year-comparison — totals per academic year. */
export const financialYearComparison = asyncHandler(async (req, res) => {
  const rows = await FeeRecord.aggregate([
    {
      $group: {
        _id: '$academicYearId',
        collected: { $sum: '$paidAmount' },
        pending: { $sum: '$remainingAmount' },
        expected: { $sum: '$monthlyFee' },
      },
    },
    { $lookup: { from: 'academicyears', localField: '_id', foreignField: '_id', as: 'year' } },
    { $unwind: { path: '$year', preserveNullAndEmptyArrays: true } },
    { $project: { label: '$year.label', startDate: '$year.startDate', collected: 1, pending: 1, expected: 1 } },
    { $sort: { startDate: 1 } },
  ]);
  return ok(res, { rows });
});

/** GET /api/reports/students/by-class?yearId= — active students per class. */
export const studentsByClass = asyncHandler(async (req, res) => {
  const yearId = await resolveYearId(req.query);
  const match = { status: 'active' };
  if (yearId) match.academicYearId = new mongoose.Types.ObjectId(yearId);

  const rows = await Student.aggregate([
    { $match: match },
    { $group: { _id: '$class', count: { $sum: 1 } } },
  ]);
  const map = new Map(rows.map((r) => [r._id, r.count]));
  const series = CLASSES.filter((c) => c !== 'Alumni').map((c) => ({ class: c, count: map.get(c) || 0 }));
  const total = series.reduce((s, r) => s + r.count, 0);
  return ok(res, { yearId, series, total });
});

/** GET /api/reports/students/route-wise?yearId= — students per route. */
export const studentsRouteWise = asyncHandler(async (req, res) => {
  const yearId = await resolveYearId(req.query);
  const match = { status: 'active' };
  if (yearId) match.academicYearId = new mongoose.Types.ObjectId(yearId);

  const rows = await Student.aggregate([
    { $match: match },
    { $group: { _id: '$routeId', count: { $sum: 1 } } },
    { $lookup: { from: 'routes', localField: '_id', foreignField: '_id', as: 'route' } },
    { $unwind: { path: '$route', preserveNullAndEmptyArrays: true } },
    { $project: { routeName: '$route.routeName', routeNumber: '$route.routeNumber', count: 1 } },
    { $sort: { routeNumber: 1 } },
  ]);
  return ok(res, { yearId, rows });
});

/** GET /api/reports/students/admissions?yearId= — new admissions per month. */
export const studentsAdmissions = asyncHandler(async (req, res) => {
  const yearId = await resolveYearId(req.query);
  const match = {};
  if (yearId) match.academicYearId = new mongoose.Types.ObjectId(yearId);

  const rows = await Student.aggregate([
    { $match: match },
    { $group: { _id: { $month: '$admissionDate' }, count: { $sum: 1 } } },
  ]);
  const calendarToSeason = { 6: 'Jun', 7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec', 1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr' };
  const map = new Map();
  for (const r of rows) {
    const s = calendarToSeason[r._id];
    if (s) map.set(s, (map.get(s) || 0) + r.count);
  }
  const series = MONTHS.map((m) => ({ month: m, count: map.get(m) || 0 }));
  return ok(res, { yearId, series });
});

/** GET /api/reports/students/alumni — class Alumni (promoted) + inactive students. */
export const studentsAlumni = asyncHandler(async (req, res) => {
  const [promoted, inactive] = await Promise.all([
    // Class Alumni — promoted from Class 10
    Student.find({ class: 'Alumni' })
      .populate('academicYearId', 'label')
      .populate('routeId', 'routeName')
      .select('name fatherName mobile photo school class status academicYearId routeId')
      .sort({ name: 1 })
      .lean(),
    // Inactive students — left transport mid-year (any class, status=inactive)
    Student.find({ status: 'inactive', class: { $ne: 'Alumni' } })
      .populate('academicYearId', 'label')
      .populate('routeId', 'routeName')
      .select('name fatherName mobile photo school class section status academicYearId routeId monthlyFee')
      .sort({ name: 1 })
      .lean(),
  ]);

  return ok(res, {
    count: promoted.length + inactive.length,
    rows: promoted,          // class Alumni
    inactive,                // inactive mid-year students
  });
});

/**
 * GET /api/reports/daily-collection?date=YYYY-MM-DD
 * All receipts generated on a given day, grouped by collector.
 * Uses ONLY monthly receipts for the total — bulk receipts cover the same
 * cash as their constituent monthly receipts, so counting both would double-count.
 * Accessible to both superadmin and subadmin (scoped by route for subadmin).
 */
export const dailyCollection = asyncHandler(async (req, res) => {
  const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd   = new Date(`${dateStr}T23:59:59.999Z`);

  const match = {
    generatedAt: { $gte: dayStart, $lte: dayEnd },
    // Exclude bulk receipts to avoid double-counting:
    // bulkCollect creates N individual monthly receipts AND 1 bulk summary receipt.
    // The monthly receipts already capture the full cash amount; the bulk receipt
    // is just a summary document. Counting both would double the total.
    receiptType: 'monthly',
  };

  // Scope subadmins to their route
  if (req.user.role === 'subadmin' && req.user.assignedRouteId) {
    match.routeId = new mongoose.Types.ObjectId(req.user.assignedRouteId);
  }

  const receipts = await Receipt.find(match)
    .populate({ path: 'studentId',   select: 'name class section mobile' })
    .populate({ path: 'routeId',     select: 'routeName routeNumber' })
    .populate({ path: 'generatedBy', select: 'name username role' })
    .sort({ generatedAt: -1 })
    .lean();

  // Also load bulk receipts for display (but NOT for the total amount)
  const bulkMatch = { ...match, receiptType: 'bulk' };
  delete bulkMatch.receiptType;
  bulkMatch.receiptType = 'bulk';
  const bulkReceipts = await Receipt.find({
    generatedAt: { $gte: dayStart, $lte: dayEnd },
    receiptType: 'bulk',
    ...(req.user.role === 'subadmin' && req.user.assignedRouteId
      ? { routeId: new mongoose.Types.ObjectId(req.user.assignedRouteId) }
      : {}),
  })
    .populate({ path: 'studentId',   select: 'name class section mobile' })
    .populate({ path: 'routeId',     select: 'routeName routeNumber' })
    .populate({ path: 'generatedBy', select: 'name username role' })
    .sort({ generatedAt: -1 })
    .lean();

  // Total = sum of monthly receipts only (accurate cash collected)
  const totalCollected = receipts.reduce((s, r) => s + r.amount, 0);
  const receiptCount   = receipts.length;

  // Group by collector name for the summary card
  const byCollector = {};
  for (const r of receipts) {
    const key = r.collectedBy || r.generatedBy?.name || 'Unknown';
    if (!byCollector[key]) byCollector[key] = { name: key, count: 0, total: 0 };
    byCollector[key].count += 1;
    byCollector[key].total += r.amount;
  }

  // Enrich byCollector with verification status for the selected date
  const collectorNames = Object.keys(byCollector);
  const verifications = collectorNames.length
    ? await CollectionVerification.find({ date: dateStr, collectorName: { $in: collectorNames } }).lean()
    : [];
  const verifMap = new Map(verifications.map((v) => [v.collectorName, v]));
  const byCollectorList = Object.values(byCollector)
    .sort((a, b) => b.total - a.total)
    .map((c) => {
      const v = verifMap.get(c.name);
      return {
        ...c,
        isVerified: !!v,
        verifiedAt: v?.verifiedAt || null,
        verifiedBy: v?.verifiedBy || null,
      };
    });

  return ok(res, {
    date: dateStr,
    totalCollected,
    receiptCount,
    byCollector: byCollectorList,
    receipts: [...receipts, ...bulkReceipts].sort((a, b) =>
      new Date(b.generatedAt) - new Date(a.generatedAt)
    ),
  });
});
