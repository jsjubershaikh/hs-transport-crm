import AcademicYear from '../models/AcademicYear.js';
import Student from '../models/Student.js';
import FeeRecord from '../models/FeeRecord.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { runPromotion } from '../services/promotionService.js';
import { logActivity, clientIp } from '../utils/activityLogger.js';
import { emitToScope } from '../services/realtime.js';

/** GET /api/academic-years — all years with student counts. */
export const listYears = asyncHandler(async (req, res) => {
  const years = await AcademicYear.find().sort({ startDate: -1 }).lean();
  // Count primaries + their embedded siblings so the total matches the dashboard/list.
  // Exclude graduated alumni — they live in the Alumni section, not the student total.
  const counts = await Student.aggregate([
    { $match: { class: { $ne: 'Alumni' } } },
    {
      $group: {
        _id: '$academicYearId',
        count: { $sum: { $add: [1, { $size: { $ifNull: ['$siblings', []] } }] } },
      },
    },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  const withCounts = years.map((y) => ({ ...y, studentsCount: countMap.get(String(y._id)) || 0 }));
  return ok(res, withCounts);
});

/** POST /api/academic-years — create a new year. */
export const createYear = asyncHandler(async (req, res) => {
  const { label, startDate, endDate } = req.body;
  const exists = await AcademicYear.findOne({ label }).lean();
  if (exists) throw ApiError.conflict('That academic year already exists', { fields: { label: 'exists' } });

  const year = await AcademicYear.create({ label, startDate, endDate });
  await logActivity({
    userId: req.user.id,
    action: 'academicYear.create',
    details: { label },
    ip: clientIp(req),
  });
  return ok(res, year, undefined, 201);
});

/** PUT /api/academic-years/:id — edit label/dates. */
export const updateYear = asyncHandler(async (req, res) => {
  const year = await AcademicYear.findById(req.params.id);
  if (!year) throw ApiError.notFound('Academic year not found');

  const { label, startDate, endDate } = req.body;
  if (label !== undefined) year.label = label;
  if (startDate !== undefined) year.startDate = startDate;
  if (endDate !== undefined) year.endDate = endDate;
  await year.save();
  return ok(res, year);
});

/**
 * POST /api/academic-years/:id/set-current — atomically make this the current
 * year (clears the flag on all others first).
 */
export const setCurrentYear = asyncHandler(async (req, res) => {
  const year = await AcademicYear.findById(req.params.id);
  if (!year) throw ApiError.notFound('Academic year not found');

  await AcademicYear.updateMany({}, { $set: { isCurrent: false } });
  year.isCurrent = true;
  year.isArchived = false;
  await year.save();

  await logActivity({
    userId: req.user.id,
    action: 'academicYear.setCurrent',
    details: { label: year.label },
    ip: clientIp(req),
  });
  return ok(res, year);
});

/** POST /api/academic-years/:id/archive — archive a (non-current) year. */
export const archiveYear = asyncHandler(async (req, res) => {
  const year = await AcademicYear.findById(req.params.id);
  if (!year) throw ApiError.notFound('Academic year not found');
  if (year.isCurrent) throw ApiError.badRequest('Cannot archive the current year — set another as current first');

  year.isArchived = true;
  await year.save();
  await logActivity({
    userId: req.user.id,
    action: 'academicYear.archive',
    details: { label: year.label },
    ip: clientIp(req),
  });
  return ok(res, year);
});

/**
 * DELETE /api/academic-years/:id
 * Superadmin only. Allows deleting any year including the current one.
 * If the deleted year was current, automatically promotes the most recent
 * non-archived year to current so the app is never left without a current year.
 */
export const deleteYear = asyncHandler(async (req, res) => {
  const year = await AcademicYear.findById(req.params.id);
  if (!year) throw ApiError.notFound('Academic year not found');

  const wasCurrent = year.isCurrent;

  // Cascade: remove all student records and their fee/receipt data for this year
  const students = await Student.find({ academicYearId: year._id }).lean();
  const studentIds = students.map((s) => s._id);

  if (studentIds.length > 0) {
    const { default: Receipt } = await import('../models/Receipt.js');
    await Promise.all([
      FeeRecord.deleteMany({ studentId: { $in: studentIds } }),
      Receipt.deleteMany({ studentId: { $in: studentIds } }),
      Student.deleteMany({ academicYearId: year._id }),
    ]);
  }

  await year.deleteOne();

  // If we just deleted the current year, auto-restore the most recent
  // non-archived year as current so the app always has a current year.
  let restoredYear = null;
  if (wasCurrent) {
    restoredYear = await AcademicYear.findOne({ isArchived: false })
      .sort({ startDate: -1 })
      .lean();
    if (restoredYear) {
      await AcademicYear.updateMany({}, { $set: { isCurrent: false } });
      await AcademicYear.findByIdAndUpdate(restoredYear._id, { $set: { isCurrent: true } });
    }
  }

  await logActivity({
    userId: req.user.id,
    action: 'academicYear.delete',
    details: {
      label: year.label,
      wasCurrent,
      studentsRemoved: studentIds.length,
      restoredCurrentYear: restoredYear?.label || null,
    },
    ip: clientIp(req),
  });

  return ok(res, {
    id: year._id,
    message: `${year.label} deleted${restoredYear ? `. "${restoredYear.label}" is now the current year.` : ''}`,
    restoredCurrentYear: restoredYear ? { _id: restoredYear._id, label: restoredYear.label } : null,
  });
});

/**
 * POST /api/academic-years/promote
 * Promote every active student into the next year (transaction-guarded).
 */
export const promote = asyncHandler(async (req, res) => {
  const { fromYearId, toYearId } = req.body;
  if (!fromYearId) throw ApiError.badRequest('fromYearId is required');

  const summary = await runPromotion({ fromYearId, toYearId, promotedBy: req.user.id });

  await logActivity({
    userId: req.user.id,
    action: 'academicYear.promote',
    details: summary,
    ip: clientIp(req),
  });
  // Broadcast so every open client refetches against the new current year.
  emitToScope('academicYear:promoted', { entity: summary, label: `Promoted to ${summary.newYearLabel}` }, {});

  return ok(res, summary);
});
