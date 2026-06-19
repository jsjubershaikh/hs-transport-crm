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

    const feeSum = (arr) => arr.reduce((sum, x) => sum + (Number(x.monthlyFee) || 0), 0);

    for (const s of sourceStudents) {
      const nextClass = PROMOTION_MAP[s.class] ?? s.class;
      const isAlumni = nextClass === 'Alumni';

      // Family + transport fields shared by every record we create for this family.
      const family = {
        fatherName: s.fatherName,
        motherName: s.motherName,
        mobile: s.mobile,
        altMobile: s.altMobile,
        address: s.address,
        school: s.school,
        academicYearId: toYear._id,
        routeId: s.routeId,
        busId: s.busId,
        pickupPoint: s.pickupPoint,
        dropPoint: s.dropPoint,
      };

      // Carry embedded siblings forward, promoting each one's class too.
      // A sibling who graduates (-> Alumni) is dropped and their fee removed.
      const sourceSiblings = Array.isArray(s.siblings) ? s.siblings : [];
      const promotedSiblings = [];
      for (const sib of sourceSiblings) {
        const sibNextClass = PROMOTION_MAP[sib.class] ?? sib.class;
        if (sibNextClass === 'Alumni') continue; // graduated — drop from the family
        promotedSiblings.push({
          photo: sib.photo,
          name: sib.name,
          gender: sib.gender,
          dob: sib.dob,
          class: sibNextClass,
          section: sib.section,
          monthlyFee: sib.monthlyFee,
          academicYearId: toYear._id,
          admissionDate: sib.admissionDate,
        });
      }

      if (!isAlumni) {
        // Normal promotion: primary stays primary with the next class.
        const baseFee = Number(s.baseFee) || 0;
        const monthlyFee = sourceSiblings.length > 0 ? baseFee + feeSum(promotedSiblings) : s.monthlyFee;
        const [clone] = await Student.create(
          [{
            ...family,
            photo: s.photo, name: s.name, gender: s.gender, dob: s.dob,
            class: nextClass, section: s.section,
            baseFee: s.baseFee, monthlyFee, siblings: promotedSiblings,
            status: 'active', admissionDate: s.admissionDate,
          }],
          { session }
        );
        await createSeasonForStudent(clone, toYear._id, { session });
        promotedCount += 1;
        continue;
      }

      // Primary graduates -> Alumni. Keep them as an inactive Alumni record
      // (siblings are transferred to the new primary, so this record holds none).
      alumniCount += 1;
      await Student.create(
        [{
          ...family,
          photo: s.photo, name: s.name, gender: s.gender, dob: s.dob,
          class: 'Alumni', section: s.section,
          baseFee: 0, monthlyFee: sourceSiblings.length > 0 ? (Number(s.baseFee) || 0) : s.monthlyFee,
          siblings: [],
          status: 'inactive', admissionDate: s.admissionDate,
        }],
        { session }
      );

      // Promote the FIRST surviving sibling to be the new primary; the rest
      // remain as that primary's siblings. They inherit the family's transport.
      if (promotedSiblings.length > 0) {
        const [first, ...rest] = promotedSiblings;
        const baseFee = Number(first.monthlyFee) || 0;
        const [newPrimary] = await Student.create(
          [{
            ...family,
            photo: first.photo, name: first.name, gender: first.gender, dob: first.dob,
            class: first.class, section: first.section,
            baseFee, monthlyFee: baseFee + feeSum(rest), siblings: rest,
            status: 'active', admissionDate: first.admissionDate || s.admissionDate,
          }],
          { session }
        );
        await createSeasonForStudent(newPrimary, toYear._id, { session });
        promotedCount += 1;
      }
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
