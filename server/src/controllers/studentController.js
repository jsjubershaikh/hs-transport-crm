import mongoose from 'mongoose';
import Student from '../models/Student.js';
import FeeRecord from '../models/FeeRecord.js';
import Receipt from '../models/Receipt.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { scopeFilter, ensureRouteAccess, enforceRouteOnBody } from '../middleware/rbac.js';
import { parsePagination, buildMeta, escapeRegex } from '../utils/query.js';
import { resolveYearId } from '../utils/academic.js';
import { createSeasonForStudent, syncRouteOnFees, syncFeeAmountForStudent } from '../services/feeService.js';
import { notify } from '../services/notificationService.js';
import { emitToScope } from '../services/realtime.js';
import { logActivity, clientIp } from '../utils/activityLogger.js';

/**
 * GET /api/students
 * List with pagination + filters (search, class, gender, routeId, status,
 * academicYearId). Subadmins are auto-scoped to their route.
 */
export const listStudents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = { ...scopeFilter(req) };

  const yearId = await resolveYearId(req.query);
  if (yearId) filter.academicYearId = yearId;

  if (req.query.class) filter.class = req.query.class;
  if (req.query.gender) filter.gender = req.query.gender;
  if (req.query.status) filter.status = req.query.status;
  // Superadmin may filter by route; subadmin's route is already forced by scopeFilter.
  if (req.query.routeId && req.user.role === 'superadmin') filter.routeId = req.query.routeId;

  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: rx }, { mobile: rx }, { fatherName: rx }, { class: rx }];
  }

  const [items, total] = await Promise.all([
    Student.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('routeId', 'routeName routeNumber')
      .populate('busId', 'busNumber vehicleNumber')
      .lean(),
    Student.countDocuments(filter),
  ]);

  // Attach current-month fee status badge data efficiently for the listed page.
  const withFees = await attachCurrentFeeStatus(items, yearId);

  return ok(res, withFees, buildMeta({ page, limit, total }));
});

/** GET /api/students/:id — single student with populated refs (RBAC-checked). */
export const getStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate('routeId', 'routeName routeNumber driverName driverContact')
    .populate('busId', 'busNumber vehicleNumber capacity')
    .populate('academicYearId', 'label isCurrent isArchived')
    .lean();
  if (!student) throw ApiError.notFound('Student not found');
  ensureRouteAccess(req, student.routeId?._id ?? student.routeId);
  return ok(res, student);
});

/**
 * POST /api/students
 * Creates the student, auto-generates the 11-month fee season, fires a
 * notification + socket event, and logs the activity.
 */
export const createStudent = asyncHandler(async (req, res) => {
  enforceRouteOnBody(req); // subadmin forced to own route

  const yearId = req.body.academicYearId || (await resolveYearId({}));
  if (!yearId) throw ApiError.badRequest('No academic year available; create one first');

  const student = await Student.create({ ...req.body, academicYearId: yearId });

  // Auto-create the 11 monthly fee records (Jun -> Apr), all pending.
  await createSeasonForStudent(student, yearId);

  const populated = await Student.findById(student._id)
    .populate('routeId', 'routeName routeNumber')
    .populate('busId', 'busNumber')
    .lean();

  await notify({
    type: 'student_added',
    message: `New student added: ${student.name} (Class ${student.class})`,
    targetRouteId: student.routeId,
    relatedId: student._id,
  });
  emitToScope(
    'student:created',
    { entity: populated, label: `Student added: ${student.name}` },
    { routeId: student.routeId }
  );
  await logActivity({
    userId: req.user.id,
    action: 'student.create',
    details: { studentId: student._id, name: student.name, class: student.class },
    ip: clientIp(req),
  });

  return ok(res, populated, undefined, 201);
});

/** PUT /api/students/:id — update; keep fee routeId and monthlyFee in sync if changed. */
export const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw ApiError.notFound('Student not found');
  ensureRouteAccess(req, student.routeId);

  const prevRouteId = String(student.routeId);
  const prevFee = Number(student.monthlyFee);

  // Subadmins cannot move a student to another route.
  if (req.user.role === 'subadmin') {
    req.body.routeId = student.routeId;
  }

  const editable = [
    'photo', 'name', 'fatherName', 'motherName', 'mobile', 'altMobile', 'address',
    'gender', 'dob', 'class', 'section', 'school', 'routeId', 'busId',
    'pickupPoint', 'dropPoint', 'monthlyFee', 'baseFee', 'status',
  ];
  for (const key of editable) {
    if (req.body[key] !== undefined) student[key] = req.body[key];
  }
  await student.save();

  // If the route changed, update the denormalized routeId on the fee records.
  if (String(student.routeId) !== prevRouteId) {
    await syncRouteOnFees(student._id, student.routeId);
  }

  // If monthly fee changed, update ONLY future unpaid months (paidAmount === 0).
  // Months that have any payment recorded are preserved as-is to keep receipt
  // history accurate.
  const newFee = Number(student.monthlyFee);
  if (newFee !== prevFee) {
    await syncFeeAmountForStudent(student._id, newFee);
  }

  const populated = await Student.findById(student._id)
    .populate('routeId', 'routeName routeNumber')
    .populate('busId', 'busNumber')
    .lean();

  emitToScope(
    'student:updated',
    { entity: populated, label: `Student updated: ${student.name}` },
    { routeId: student.routeId }
  );
  // Also emit fee:updated so the profile's fee tab re-fetches immediately
  emitToScope(
    'fee:updated',
    { label: `Fee amount updated: ${student.name}` },
    { routeId: student.routeId }
  );
  await logActivity({
    userId: req.user.id,
    action: 'student.update',
    details: { studentId: student._id, name: student.name, prevFee, newFee },
    ip: clientIp(req),
  });

  return ok(res, populated);
});

/**
 * DELETE /api/students/:id — superadmin only (policy default). Cascades to the
 * student's fee records and receipts so no orphans remain.
 */
export const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw ApiError.notFound('Student not found');

  const routeId = student.routeId;
  await Promise.all([
    FeeRecord.deleteMany({ studentId: student._id }),
    Receipt.deleteMany({ studentId: student._id }),
  ]);
  await student.deleteOne();

  emitToScope(
    'student:deleted',
    { entity: { _id: student._id }, label: `Student removed: ${student.name}` },
    { routeId }
  );
  await logActivity({
    userId: req.user.id,
    action: 'student.delete',
    details: { studentId: student._id, name: student.name },
    ip: clientIp(req),
  });

  return ok(res, { id: student._id, message: 'Student and related records deleted' });
});

/**
 * PUT /api/students/:id/siblings
 * Replace the entire siblings array. Recalculates combined monthlyFee as:
 *   combinedFee = baseFee + sum(sibling.monthlyFee)
 * Then syncs all unpaid FeeRecords to the new combined fee.
 * Body: { siblings: [{ photo, name, class, section, monthlyFee }], baseFee }
 */
export const updateSiblings = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw ApiError.notFound('Student not found');
  ensureRouteAccess(req, student.routeId);

  const siblings = (Array.isArray(req.body.siblings) ? req.body.siblings : [])
    .map((s) => ({
      photo:          s.photo          || '',
      name:           String(s.name || '').trim(),
      gender:         s.gender         || undefined,
      dob:            s.dob            || undefined,
      class:          s.class          || undefined,
      section:        s.section        || 'A',
      monthlyFee:     Number(s.monthlyFee) || 0,
      academicYearId: s.academicYearId || undefined,
      admissionDate:  s.admissionDate  || undefined,
    }))
    .filter((s) => s.name);

  // baseFee can be passed explicitly (when editing mid-year), or falls back to
  // current baseFee, or to current monthlyFee if baseFee was never set.
  const baseFee = req.body.baseFee !== undefined
    ? Number(req.body.baseFee)
    : (Number(student.baseFee) || Number(student.monthlyFee) || 0);

  const siblingTotal = siblings.reduce((sum, s) => sum + s.monthlyFee, 0);
  const combinedFee  = baseFee + siblingTotal;

  student.siblings   = siblings;
  student.baseFee    = baseFee;
  student.monthlyFee = combinedFee;
  await student.save();

  // Sync all unpaid fee records to the new combined fee
  await syncFeeAmountForStudent(student._id, combinedFee);

  const populated = await Student.findById(student._id)
    .populate('routeId', 'routeName routeNumber driverName driverContact')
    .populate('busId', 'busNumber vehicleNumber capacity')
    .populate('academicYearId', 'label isCurrent isArchived')
    .lean();

  emitToScope('student:updated', { entity: populated, label: `Siblings updated: ${student.name}` }, { routeId: student.routeId });
  emitToScope('fee:updated', { label: `Fee updated for ${student.name}` }, { routeId: student.routeId });

  await logActivity({
    userId: req.user.id,
    action: 'student.update_siblings',
    details: { studentId: student._id, siblingCount: siblings.length, combinedFee },
    ip: clientIp(req),
  });

  return ok(res, populated);
});

/** GET /api/students/:id/fees?academicYearId= — fee records for a student/year. */
export const getStudentFees = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).lean();
  if (!student) throw ApiError.notFound('Student not found');
  ensureRouteAccess(req, student.routeId);

  const yearId = req.query.academicYearId || student.academicYearId;
  const fees = await FeeRecord.find({ studentId: student._id, academicYearId: yearId })
    .sort({ createdAt: 1 })
    .lean();

  // Keep the canonical Jun->Apr order regardless of insertion order.
  const order = ['Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr'];
  fees.sort((a, b) => order.indexOf(a.month) - order.indexOf(b.month));

  return ok(res, fees);
});

/**
 * GET /api/students/:id/family — get all family members (same familyId or mobile).
 * Returns the student themselves + all siblings, with basic fee summary.
 */
export const getFamilyMembers = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).lean();
  if (!student) throw ApiError.notFound('Student not found');
  ensureRouteAccess(req, student.routeId);

  // Find by familyId first, fallback to mobile grouping
  const familyRoot = student.familyId || student._id;
  const members = await Student.find({
    $or: [
      { familyId: familyRoot },
      { _id: familyRoot },
      { familyId: student._id },
    ],
    academicYearId: student.academicYearId,
  })
    .populate('routeId', 'routeName routeNumber')
    .populate('busId', 'busNumber')
    .lean();

  // Deduplicate
  const seen = new Set();
  const unique = members.filter((m) => {
    const k = String(m._id);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return ok(res, unique);
});

/**
 * POST /api/students/:id/members — add a sibling to this student's family.
 * The new student inherits all transport details from the primary student.
 * Only basic personal + academic fields are required in the body:
 *   { photo, name, gender, dob, class, section, school, academicYearId }
 * monthlyFee can be overridden, defaults to primary student's fee.
 */
export const addFamilyMember = asyncHandler(async (req, res) => {
  const primary = await Student.findById(req.params.id).lean();
  if (!primary) throw ApiError.notFound('Student not found');
  ensureRouteAccess(req, primary.routeId);

  const familyRoot = primary.familyId || primary._id;

  // Merge: transport from primary, personal/academic from body
  const { photo = '', name, gender, dob, class: cls, section = 'A', school, academicYearId, monthlyFee } = req.body;

  if (!name?.trim()) throw ApiError.badRequest('Name is required', { fields: { name: 'required' } });
  if (!cls) throw ApiError.badRequest('Class is required', { fields: { class: 'required' } });

  const yearId = academicYearId || primary.academicYearId;

  const member = await Student.create({
    photo,
    name: name.trim(),
    fatherName: primary.fatherName,
    motherName: primary.motherName,
    mobile: primary.mobile,
    altMobile: primary.altMobile || '',
    address: primary.address || '',
    gender: gender || primary.gender,
    dob: dob || undefined,
    class: cls,
    section,
    school: school?.trim() || primary.school,
    academicYearId: yearId,
    routeId: primary.routeId,
    busId: primary.busId,
    pickupPoint: primary.pickupPoint,
    dropPoint: primary.dropPoint,
    monthlyFee: monthlyFee !== undefined ? Number(monthlyFee) : primary.monthlyFee,
    status: 'active',
    familyId: familyRoot,
  });

  // Also mark the primary student with familyId if not already set
  if (!primary.familyId) {
    await Student.findByIdAndUpdate(primary._id, { familyId: familyRoot });
  }

  // Auto-generate fee season for new member
  await createSeasonForStudent(member, yearId);

  const populated = await Student.findById(member._id)
    .populate('routeId', 'routeName routeNumber')
    .populate('busId', 'busNumber')
    .lean();

  await logActivity({
    userId: req.user.id,
    action: 'student.add_family_member',
    details: { primaryId: primary._id, memberId: member._id, name: member.name },
    ip: clientIp(req),
  });

  return ok(res, populated, undefined, 201);
});

/** GET /api/students/:id/receipts — receipts for a student. Optional ?type=monthly|bulk filter. */
export const getStudentReceipts = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).lean();
  if (!student) throw ApiError.notFound('Student not found');
  ensureRouteAccess(req, student.routeId);

  const query = { studentId: student._id };
  if (req.query.type) query.receiptType = req.query.type;

  const receipts = await Receipt.find(query)
    .sort({ generatedAt: -1 })
    .lean();
  return ok(res, receipts);
});

/**
 * GET /api/students/:id/history — academic timeline. Because students are
 * per-year snapshots, we link the "same" student across years by mobile (the
 * natural family key in this dataset) and summarize fees per year.
 */
export const getStudentHistory = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).lean();
  if (!student) throw ApiError.notFound('Student not found');
  ensureRouteAccess(req, student.routeId);

  const siblings = await Student.find({ mobile: student.mobile, name: student.name })
    .populate('academicYearId', 'label startDate isArchived isCurrent')
    .lean();

  const history = await Promise.all(
    siblings.map(async (s) => {
      const agg = await FeeRecord.aggregate([
        { $match: { studentId: new mongoose.Types.ObjectId(s._id) } },
        {
          $group: {
            _id: null,
            totalFees: { $sum: '$monthlyFee' },
            totalPaid: { $sum: '$paidAmount' },
            totalPending: { $sum: '$remainingAmount' },
          },
        },
      ]);
      const sums = agg[0] || { totalFees: 0, totalPaid: 0, totalPending: 0 };
      return {
        studentId: s._id,
        academicYear: s.academicYearId,
        class: s.class,
        section: s.section,
        status: s.status,
        ...sums,
      };
    })
  );

  // Newest year first.
  history.sort(
    (a, b) =>
      new Date(b.academicYear?.startDate || 0).getTime() -
      new Date(a.academicYear?.startDate || 0).getTime()
  );

  return ok(res, history);
});

// --- helpers ---

/**
 * Attach a `currentFeeStatus` (paid/partial/pending) for the latest-relevant
 * month to each listed student, in one query, for the list table badge.
 */
async function attachCurrentFeeStatus(students, yearId) {
  if (!students.length || !yearId) return students.map((s) => ({ ...s, currentFeeStatus: 'pending' }));

  const ids = students.map((s) => s._id);
  // Summarize each student's fees for the year: any pending => has dues.
  const sums = await FeeRecord.aggregate([
    {
      $match: {
        studentId: { $in: ids },
        academicYearId: new mongoose.Types.ObjectId(yearId),
      },
    },
    {
      $group: {
        _id: '$studentId',
        totalRemaining: { $sum: '$remainingAmount' },
        totalFee: { $sum: '$monthlyFee' },
        totalPaid: { $sum: '$paidAmount' },
      },
    },
  ]);
  const map = new Map(sums.map((s) => [String(s._id), s]));

  return students.map((s) => {
    const f = map.get(String(s._id));
    let status = 'pending';
    if (f) {
      if (f.totalRemaining <= 0) status = 'paid';
      else if (f.totalPaid > 0) status = 'partial';
    }
    return { ...s, currentFeeStatus: status, feeSummary: f || null };
  });
}
