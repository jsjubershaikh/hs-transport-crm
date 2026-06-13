import mongoose from 'mongoose';
import Student from '../models/Student.js';
import Route from '../models/Route.js';
import Bus from '../models/Bus.js';
import FeeRecord from '../models/FeeRecord.js';
import Receipt from '../models/Receipt.js';
import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { scopeFilter } from '../middleware/rbac.js';
import { resolveYearId, getCurrentYear } from '../utils/academic.js';
import { MONTHS } from '../utils/constants.js';

/**
 * GET /api/dashboard/stats?yearId=
 * Returns every stat-card number, all chart series and the recent-activity
 * lists in ONE role-scoped payload so the dashboard loads in a single request.
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const scope = scopeFilter(req); // {} (superadmin) or { routeId } (subadmin)
  const yearId = await resolveYearId(req.query);
  const yearObjId = yearId ? new mongoose.Types.ObjectId(yearId) : null;
  const isSub = req.user.role === 'subadmin';

  const studentMatch = { ...scope };
  if (yearId) studentMatch.academicYearId = yearId;

  const feeMatch = { ...scope };
  if (yearObjId) feeMatch.academicYearId = yearObjId;

  const current = await getCurrentYear();
  const currentMonth = currentSeasonMonth();

  const [
    totalStudents,
    activeStudents,
    totalRoutes,
    totalBuses,
    feeTotals,
    thisMonthCollectionRaw,
    monthSeriesRaw,
    routeWiseRaw,
    admissionsRaw,
    recentStudents,
    recentPaymentsRaw,
    pendingAlertsRaw,
  ] = await Promise.all([
    Student.countDocuments(studentMatch),
    Student.countDocuments({ ...studentMatch, status: 'active' }),
    isSub ? Promise.resolve(1) : Route.countDocuments(),
    isSub ? Bus.countDocuments({ assignedRouteId: req.user.assignedRouteId }) : Bus.countDocuments(),

    // Whole-year fee totals: received / pending / partial.
    FeeRecord.aggregate([
      { $match: feeMatch },
      {
        $group: {
          _id: null,
          received: { $sum: '$paidAmount' },
          totalFee: { $sum: '$monthlyFee' },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$remainingAmount', 0] } },
          partial: { $sum: { $cond: [{ $eq: ['$status', 'partial'] }, '$remainingAmount', 0] } },
        },
      },
    ]),

    // This-month cash actually collected (from receipts generated this calendar month).
    // Using Receipt instead of FeeRecord so advance/bulk payments show in the
    // month they were RECEIVED, not the month they were billed for.
    Receipt.aggregate([
      {
        $match: {
          ...scope,
          receiptType: 'monthly', // exclude bulk to avoid double-counting
          generatedAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            $lt:  new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
          },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    // Per-month collected vs pending (for the Jun->Apr bar chart).
    FeeRecord.aggregate([
      { $match: feeMatch },
      {
        $group: {
          _id: '$month',
          collected: { $sum: '$paidAmount' },
          pending: { $sum: '$remainingAmount' },
        },
      },
    ]),

    // Route-wise collection (grouped bar).
    FeeRecord.aggregate([
      { $match: feeMatch },
      { $group: { _id: '$routeId', collected: { $sum: '$paidAmount' }, pending: { $sum: '$remainingAmount' } } },
      { $lookup: { from: 'routes', localField: '_id', foreignField: '_id', as: 'route' } },
      { $unwind: { path: '$route', preserveNullAndEmptyArrays: true } },
      { $project: { routeName: '$route.routeName', routeNumber: '$route.routeNumber', collected: 1, pending: 1 } },
      { $sort: { routeNumber: 1 } },
    ]),

    // New admissions per month-of-year (for the student-growth line).
    Student.aggregate([
      { $match: studentMatch },
      { $group: { _id: { $month: '$admissionDate' }, count: { $sum: 1 } } },
    ]),

    // Recent activity lists.
    Student.find(studentMatch)
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name class section photo createdAt admissionDate')
      .lean(),

    Receipt.aggregate([
      { $match: { ...scope } },
      { $sort: { generatedAt: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'student' } },
      { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          receiptNumber: 1, amount: 1, month: 1, generatedAt: 1,
          studentName: '$student.name', studentClass: '$student.class',
        },
      },
    ]),

    FeeRecord.aggregate([
      { $match: { ...feeMatch, remainingAmount: { $gt: 0 } } },
      { $sort: { remainingAmount: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'student' } },
      { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          remainingAmount: 1, month: 1, status: 1,
          studentName: '$student.name', studentClass: '$student.class',
        },
      },
    ]),
  ]);

  const totals = feeTotals[0] || { received: 0, totalFee: 0, pending: 0, partial: 0 };
  const thisMonthCollection = thisMonthCollectionRaw[0]?.total || 0;

  // Normalize the month series into the canonical Jun->Apr order.
  const monthMap = new Map(monthSeriesRaw.map((m) => [m._id, m]));
  const monthlyCollectionSeries = MONTHS.map((m) => ({
    month: m,
    collected: monthMap.get(m)?.collected || 0,
    pending: monthMap.get(m)?.pending || 0,
  }));

  // Student growth: cumulative admissions across the season.
  const calendarToSeason = { 6: 'Jun', 7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec', 1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr' };
  const admitMap = new Map();
  for (const a of admissionsRaw) {
    const season = calendarToSeason[a._id];
    if (season) admitMap.set(season, (admitMap.get(season) || 0) + a.count);
  }
  let running = 0;
  const studentGrowthSeries = MONTHS.map((m) => {
    running += admitMap.get(m) || 0;
    return { month: m, students: running };
  });

  const totalPendingForPie = totals.pending + totals.partial;

  return ok(res, {
    yearId,
    yearLabel: current?.label || null,
    month: currentMonth,
    cards: {
      totalStudents,
      activeStudents,
      totalRoutes,
      totalBuses,
      monthlyCollection: thisMonthCollection,
      pendingFees: totals.pending + totals.partial,
      receivedFees: totals.received,
    },
    charts: {
      monthlyCollection: monthlyCollectionSeries,
      feeBreakdown: [
        { name: 'Received', value: totals.received },
        { name: 'Pending', value: totals.pending },
        { name: 'Partial', value: totals.partial },
      ],
      studentGrowth: studentGrowthSeries,
      routeWise: routeWiseRaw,
    },
    recent: {
      students: recentStudents,
      payments: recentPaymentsRaw,
      pendingAlerts: pendingAlertsRaw,
    },
    meta: { totalPendingForPie },
  });
});

/** Current month as a season code. Returns the last season month ('Apr') if outside the season (May). */
function currentSeasonMonth() {
  const codes  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const season = ['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr'];
  const code   = codes[new Date().getMonth()];
  // May is the off-season — show April (last collectable month) as the reference
  return season.includes(code) ? code : 'Apr';
}
