import mongoose from 'mongoose';
import Receipt from '../models/Receipt.js';
import Settings from '../models/Settings.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { scopeFilter, ensureRouteAccess } from '../middleware/rbac.js';
import { parsePagination, buildMeta, escapeRegex } from '../utils/query.js';

/**
 * GET /api/receipts
 * Role-scoped list with filters (month, routeId, search) + pagination.
 * Aggregates student + route + year so the table renders without N+1 queries.
 */
export const listReceipts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const match = { ...scopeFilter(req) };
  if (match.routeId) match.routeId = new mongoose.Types.ObjectId(match.routeId);
  if (req.query.month) match.month = req.query.month;
  if (req.query.routeId && req.user.role === 'superadmin') {
    match.routeId = new mongoose.Types.ObjectId(req.query.routeId);
  }

  const pipeline = [
    { $match: match },
    { $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'student' } },
    { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'routes', localField: 'routeId', foreignField: '_id', as: 'route' } },
    { $unwind: { path: '$route', preserveNullAndEmptyArrays: true } },
  ];

  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    pipeline.push({ $match: { $or: [{ receiptNumber: rx }, { 'student.name': rx }] } });
  }

  pipeline.push(
    {
      $project: {
        receiptNumber: 1, amount: 1, month: 1, generatedAt: 1, printedAt: 1,
        receiptType: 1,
        bulkDetails: 1,
        'student.name': 1, 'student.class': 1, 'student.mobile': 1, 'student.fatherName': 1,
        'route.routeName': 1, 'route.routeNumber': 1,
        feeRecordId: 1,
      },
    },
    { $sort: { generatedAt: -1 } }
  );

  const [result] = await Receipt.aggregate([
    ...pipeline,
    { $facet: { data: [{ $skip: skip }, { $limit: limit }], total: [{ $count: 'count' }] } },
  ]);

  const items = result?.data || [];
  const total = result?.total?.[0]?.count || 0;
  return ok(res, items, buildMeta({ page, limit, total }));
});

/** GET /api/receipts/:id — fully populated receipt for the print template. */
export const getReceipt = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findById(req.params.id)
    .populate('studentId')
    .populate('feeRecordId')
    .populate({ path: 'bulkDetails.feeRecordId', model: 'FeeRecord' })
    .populate('academicYearId', 'label')
    .populate('routeId', 'routeName routeNumber driverName')
    .populate('generatedBy', 'name')
    .lean();
  if (!receipt) throw ApiError.notFound('Receipt not found');
  ensureRouteAccess(req, receipt.routeId?._id ?? receipt.routeId);

  const settings = await Settings.findOne().lean();
  return ok(res, { receipt, settings: settings || null });
});

/** POST /api/receipts/:id/printed — stamp printedAt. */
export const markPrinted = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findById(req.params.id);
  if (!receipt) throw ApiError.notFound('Receipt not found');
  ensureRouteAccess(req, receipt.routeId);

  receipt.printedAt = new Date();
  await receipt.save();
  return ok(res, { id: receipt._id, printedAt: receipt.printedAt });
});
