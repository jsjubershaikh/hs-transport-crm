import Student from '../models/Student.js';
import AcademicYear from '../models/AcademicYear.js';
import FeeRecord from '../models/FeeRecord.js';
import Promotion from '../models/Promotion.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../utils/withTransaction.js';
import { createSeasonForStudent } from './feeService.js';
import { PROMOTION_MAP, MONTHS } from '../utils/constants.js';

/**
 * Promote every active student from one academic year into the next.
 *
 * MODEL: students are per-academic-year snapshots. Promotion CLONES each active
 * student into the target year with the next class, then generates a fresh
 * 11-month fee season for the clone. The source year is archived (its students,
 * fees and receipts stay intact as read-only history — that's what the Archive
 * module reads), and the new year becomes current.
 *
 * Runs inside a transaction on replica-set/Atlas deployments; degrades to a
 * guarded sequential run on standalone mongod (see withTransaction).
 *
 * @param {object} params
 * @param {string} params.fromYearId
 * @param {string} [params.toYearId]    - target year; auto-created if omitted
 * @param {string} params.promotedBy    - acting user id
 * @returns {{ promotedCount:number, alumniCount:number, newYearLabel:string, toYearId:string }}
 */
export async function runPromotion({ fromYearId, toYearId, promotedBy }) {
  const fromYear = await AcademicYear.findById(fromYearId);
  if (!fromYear) throw ApiError.notFound('Source academic year not found');

  return withTransaction(async (session) => {
    // 1) Resolve (or create) the destination year.
    let toYear = toYearId ? await AcademicYear.findById(toYearId).session(session) : null;
    if (!toYear) {
      const nextLabel = computeNextLabel(fromYear.label);
      toYear = await AcademicYear.findOne({ label: nextLabel }).session(session);
      if (!toYear) {
        const startYear = parseInt(nextLabel.split('-')[0], 10);
        [toYear] = await AcademicYear.create(
          [
            {
              label: nextLabel,
              startDate: new Date(`${startYear}-06-01`),
              endDate: new Date(`${startYear + 1}-04-30`),
              isCurrent: false,
              isArchived: false,
            },
          ],
          { session }
        );
      }
    }

    // Guard: don't promote into a year that already has students (idempotency).
    const existingInTarget = await Student.countDocuments({ academicYearId: toYear._id }).session(
      session
    );
    if (existingInTarget > 0) {
      throw ApiError.conflict(
        `Target year ${toYear.label} already has ${existingInTarget} students — promotion already run?`
      );
    }

    // 2) Clone every active student with the promoted class.
    const sourceStudents = await Student.find({
      academicYearId: fromYear._id,
      status: 'active',
    }).session(session);

    let promotedCount = 0;
    let alumniCount = 0;

    for (const s of sourceStudents) {
      const nextClass = PROMOTION_MAP[s.class] ?? s.class;
      const isAlumni = nextClass === 'Alumni';
      if (isAlumni) alumniCount += 1;

      const [clone] = await Student.create(
        [
          {
            photo: s.photo,
            name: s.name,
            fatherName: s.fatherName,
            motherName: s.motherName,
            mobile: s.mobile,
            altMobile: s.altMobile,
            address: s.address,
            gender: s.gender,
            dob: s.dob,
            class: nextClass,
            section: s.section,
            school: s.school,
            academicYearId: toYear._id,
            routeId: s.routeId,
            busId: s.busId,
            pickupPoint: s.pickupPoint,
            dropPoint: s.dropPoint,
            monthlyFee: s.monthlyFee,
            // Alumni are inactive in the new year (no longer riding the bus).
            status: isAlumni ? 'inactive' : 'active',
            admissionDate: s.admissionDate,
          },
        ],
        { session }
      );

      // Fresh fee season only for students still active (alumni don't pay).
      if (!isAlumni) {
        await createSeasonForStudent(clone, toYear._id, { session });
      }
      promotedCount += 1;
    }

    // 3) Archive the source year, make the target year current.
    await AcademicYear.updateOne(
      { _id: fromYear._id },
      { $set: { isArchived: true, isCurrent: false } },
      { session }
    );
    await AcademicYear.updateMany({ _id: { $ne: toYear._id } }, { $set: { isCurrent: false } }, { session });
    await AcademicYear.updateOne(
      { _id: toYear._id },
      { $set: { isCurrent: true, isArchived: false } },
      { session }
    );

    // 4) Record the promotion run for audit/history.
    await Promotion.create(
      [
        {
          fromAcademicYearId: fromYear._id,
          toAcademicYearId: toYear._id,
          mapping: PROMOTION_MAP,
          studentsPromoted: promotedCount,
          alumniCount,
          promotedBy,
        },
      ],
      { session }
    );

    return {
      promotedCount,
      alumniCount,
      newYearLabel: toYear.label,
      toYearId: String(toYear._id),
    };
  });
}

/** '2024-2025' -> '2025-2026' */
function computeNextLabel(label) {
  const [a, b] = label.split('-').map((n) => parseInt(n, 10));
  if (Number.isNaN(a) || Number.isNaN(b)) {
    throw ApiError.badRequest('Academic year label must look like "2024-2025"');
  }
  return `${a + 1}-${b + 1}`;
}

export { MONTHS };
