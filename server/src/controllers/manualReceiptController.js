import mongoose from 'mongoose';
import ManualReceipt from '../models/ManualReceipt.js';
import Student from '../models/Student.js';
import AcademicYear from '../models/AcademicYear.js';
import Settings from '../models/Settings.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { parsePagination, buildMeta, escapeRegex } from '../utils/query.js';
import { nextManualReceiptNumber } from '../services/receiptService.js';
import { logActivity, clientIp } from '../utils/activityLogger.js';

/**
 * GET /api/manual-receipts
 * Paginated search of manual receipts with filters.
 */
export const listManualReceipts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const match = {};

  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    
    // We need to support searching by receiptNumber or student name.
    // For student name, we search the student pipeline after lookup.
    match.$or = [
      { receiptNumber: rx },
      { 'student.name': rx }
    ];
  }

  const pipeline = [
    {
      $lookup: {
        from: 'students',
        localField: 'studentId',
        foreignField: '_id',
        as: 'student',
      },
    },
    { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'routes',
        localField: 'routeId',
        foreignField: '_id',
        as: 'route',
      },
    },
    { $unwind: { path: '$route', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'academicyears',
        localField: 'academicYearId',
        foreignField: '_id',
        as: 'academicYear',
      },
    },
    { $unwind: { path: '$academicYear', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'creator',
      },
    },
    { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
  ];

  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    pipeline.push({
      $match: {
        $or: [
          { receiptNumber: rx },
          { 'student.name': rx },
          { 'student.fatherName': rx }
        ]
      }
    });
  }

  pipeline.push(
    {
      $project: {
        receiptNumber: 1,
        amount: 1,
        paymentMode: 1,
        collectedBy: 1,
        month: 1,
        receiptDate: 1,
        remarks: 1,
        'student._id': '$student._id',
        'student.name': '$student.name',
        'student.fatherName': '$student.fatherName',
        'student.class': '$student.class',
        'student.section': '$student.section',
        'student.mobile': '$student.mobile',
        'route.routeName': '$route.routeName',
        'route.routeNumber': '$route.routeNumber',
        'academicYear.label': '$academicYear.label',
        'creator.name': '$creator.name',
      },
    },
    { $sort: { receiptDate: -1 } }
  );

  const [result] = await ManualReceipt.aggregate([
    ...pipeline,
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: 'count' }],
        stats: [{ $group: { _id: null, totalAmount: { $sum: '$amount' } } }],
      },
    },
  ]);

  const items = result?.data || [];
  const total = result?.total?.[0]?.count || 0;
  const totalAmount = result?.stats?.[0]?.totalAmount || 0;

  return ok(res, items, {
    ...buildMeta({ page, limit, total }),
    totalAmount,
  });
});

/**
 * GET /api/manual-receipts/:id
 * Retrieve a populated manual receipt + settings for printing.
 */
export const getManualReceipt = asyncHandler(async (req, res) => {
  const receipt = await ManualReceipt.findById(req.params.id)
    .populate('studentId', 'name fatherName class section mobile address')
    .populate('routeId', 'routeName routeNumber driverName')
    .populate('academicYearId', 'label')
    .populate('createdBy', 'name')
    .lean();

  if (!receipt) throw ApiError.notFound('Manual receipt not found');

  const settings = await Settings.findOne().lean();
  return ok(res, { receipt, settings: settings || null });
});

/**
 * POST /api/manual-receipts
 * Create a new manual receipt.
 */
export const createManualReceipt = asyncHandler(async (req, res) => {
  const { studentId, amount, paymentMode, collectedBy, month, receiptDate, remarks } = req.body;

  if (!studentId) throw ApiError.badRequest('Student ID is required');
  if (amount === undefined || Number(amount) < 0) throw ApiError.badRequest('A valid amount is required');

  const student = await Student.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found');

  const academicYearId = student.academicYearId;
  const routeId = student.routeId;

  const year = await AcademicYear.findById(academicYearId).lean();
  if (!year) throw ApiError.notFound('Academic year not found');
  const startYear = year.startDate ? new Date(year.startDate).getFullYear() : new Date().getFullYear();

  const receiptNumber = await nextManualReceiptNumber(startYear);

  const receipt = await ManualReceipt.create({
    receiptNumber,
    studentId,
    academicYearId,
    routeId,
    amount: Number(amount),
    paymentMode: paymentMode || 'cash',
    collectedBy: collectedBy || '',
    month: month || '',
    receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
    remarks: remarks || '',
    createdBy: req.user.id,
  });

  const populated = await ManualReceipt.findById(receipt._id)
    .populate('studentId', 'name fatherName class section mobile')
    .populate('routeId', 'routeName routeNumber')
    .populate('academicYearId', 'label')
    .populate('createdBy', 'name')
    .lean();

  await logActivity({
    userId: req.user.id,
    action: 'manual_receipt.create',
    details: {
      receiptId: receipt._id,
      receiptNumber: receipt.receiptNumber,
      studentId: student._id,
      studentName: student.name,
      amount: receipt.amount,
    },
    ip: clientIp(req),
  });

  return ok(res, populated, undefined, 201);
});

/**
 * PUT /api/manual-receipts/:id
 * Edit an existing manual receipt.
 */
export const updateManualReceipt = asyncHandler(async (req, res) => {
  const { amount, paymentMode, collectedBy, month, receiptDate, remarks } = req.body;

  const receipt = await ManualReceipt.findById(req.params.id);
  if (!receipt) throw ApiError.notFound('Manual receipt not found');

  if (amount !== undefined) {
    if (Number(amount) < 0) throw ApiError.badRequest('Amount cannot be negative');
    receipt.amount = Number(amount);
  }
  if (paymentMode !== undefined) receipt.paymentMode = paymentMode;
  if (collectedBy !== undefined) receipt.collectedBy = collectedBy;
  if (month !== undefined) receipt.month = month;
  if (receiptDate !== undefined) receipt.receiptDate = new Date(receiptDate);
  if (remarks !== undefined) receipt.remarks = remarks;

  await receipt.save();

  const populated = await ManualReceipt.findById(receipt._id)
    .populate('studentId', 'name fatherName class section mobile')
    .populate('routeId', 'routeName routeNumber')
    .populate('academicYearId', 'label')
    .populate('createdBy', 'name')
    .lean();

  await logActivity({
    userId: req.user.id,
    action: 'manual_receipt.update',
    details: {
      receiptId: receipt._id,
      receiptNumber: receipt.receiptNumber,
      amount: receipt.amount,
    },
    ip: clientIp(req),
  });

  return ok(res, populated);
});

/**
 * DELETE /api/manual-receipts/:id
 * Delete a manual receipt.
 */
export const deleteManualReceipt = asyncHandler(async (req, res) => {
  const receipt = await ManualReceipt.findById(req.params.id);
  if (!receipt) throw ApiError.notFound('Manual receipt not found');

  await receipt.deleteOne();

  await logActivity({
    userId: req.user.id,
    action: 'manual_receipt.delete',
    details: {
      receiptId: receipt._id,
      receiptNumber: receipt.receiptNumber,
      studentId: receipt.studentId,
      amount: receipt.amount,
    },
    ip: clientIp(req),
  });

  return ok(res, { id: receipt._id });
});
