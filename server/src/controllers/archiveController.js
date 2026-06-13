import mongoose from 'mongoose';
import AcademicYear from '../models/AcademicYear.js';
import Student from '../models/Student.js';
import FeeRecord from '../models/FeeRecord.js';
import Receipt from '../models/Receipt.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { parsePagination, buildMeta, escapeRegex } from '../utils/query.js';

/** GET /api/archive/years — archived years with student counts + total collected. */
export const listArchivedYears = asyncHandler(async (req, res) => {
  const years = await AcademicYear.find({ isArchived: true }).sort({ startDate: -1 }).lean();

  const enriched = await Promise.all(
    years.map(async (y) => {
      const [studentsCount, feeAgg] = await Promise.all([
        Student.countDocuments({ academicYearId: y._id }),
        FeeRecord.aggregate([
          { $match: { academicYearId: new mongoose.Types.ObjectId(y._id) } },
          { $group: { _id: null, collected: { $sum: '$paidAmount' }, pending: { $sum: '$remainingAmount' } } },
        ]),
      ]);
      const f = feeAgg[0] || { collected: 0, pending: 0 };
      return { ...y, studentsCount, totalCollected: f.collected, totalPending: f.pending };
    })
  );

  return ok(res, enriched);
});

/**
 * GET /api/archive/years/:id — read-only students for an archived year, with
 * search/filter + pagination. Everything is preserved; nothing is mutable here.
 */
export const getArchivedYear = asyncHandler(async (req, res) => {
  const year = await AcademicYear.findById(req.params.id).lean();
  if (!year) throw ApiError.notFound('Academic year not found');

  const { page, limit, skip } = parsePagination(req.query);
  const filter = { academicYearId: year._id };
  if (req.query.class) filter.class = req.query.class;
  if (req.query.routeId) filter.routeId = req.query.routeId;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: rx }, { mobile: rx }, { fatherName: rx }];
  }

  const [students, total, feeAgg] = await Promise.all([
    Student.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .populate('routeId', 'routeName routeNumber')
      .lean(),
    Student.countDocuments(filter),
    FeeRecord.aggregate([
      { $match: { academicYearId: new mongoose.Types.ObjectId(year._id) } },
      { $group: { _id: null, collected: { $sum: '$paidAmount' }, pending: { $sum: '$remainingAmount' }, expected: { $sum: '$monthlyFee' } } },
    ]),
  ]);

  const summary = feeAgg[0] || { collected: 0, pending: 0, expected: 0 };
  return ok(res, { year, students, summary }, buildMeta({ page, limit, total }));
});

/** GET /api/archive/years/:id/students/:studentId — read-only fees + receipts. */
export const getArchivedStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.studentId)
    .populate('routeId', 'routeName routeNumber')
    .populate('busId', 'busNumber')
    .lean();
  if (!student) throw ApiError.notFound('Student not found');

  const [fees, receipts] = await Promise.all([
    FeeRecord.find({ studentId: student._id }).lean(),
    Receipt.find({ studentId: student._id }).sort({ generatedAt: -1 }).lean(),
  ]);
  return ok(res, { student, fees, receipts });
});
