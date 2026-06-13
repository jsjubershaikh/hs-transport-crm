import FeeRecord from '../models/FeeRecord.js';
import { MONTHS } from '../utils/constants.js';

/**
 * Fee domain logic. Controllers call into here so the "11 months per student"
 * rule and the collect math live in exactly one place.
 */

/**
 * Create the full 11-month fee season (Jun->Apr) for a student in a given
 * academic year. Idempotent-ish: uses the unique index to skip months that
 * already exist (ordered:false so one duplicate doesn't abort the batch).
 *
 * @param {object} student        - a Student doc (needs _id, routeId, monthlyFee)
 * @param {string} academicYearId
 * @param {object} [opts]
 * @param {import('mongoose').ClientSession} [opts.session] - for transactions
 * @returns {Promise<FeeRecord[]>}
 */
export async function createSeasonForStudent(student, academicYearId, { session } = {}) {
  const fee = Number(student.monthlyFee) || 0;
  const docs = MONTHS.map((month) => ({
    studentId: student._id,
    academicYearId,
    routeId: student.routeId,
    month,
    monthlyFee: fee,
    paidAmount: 0,
    remainingAmount: fee,
    status: 'pending',
  }));

  try {
    // insertMany with ordered:false so pre-existing months are skipped, not fatal.
    return await FeeRecord.insertMany(docs, { ordered: false, session });
  } catch (err) {
    // Duplicate-key (11000) just means some months already existed — safe to ignore.
    if (err.code === 11000 || err.writeErrors) return [];
    throw err;
  }
}

/**
 * Apply a payment to a single fee record. Caps the payment at the remaining
 * balance and lets the FeeRecord pre-save hook recompute status/remaining.
 *
 * @returns {{ accepted:number, feeRecord:FeeRecord }}
 */
export function applyPayment(feeRecord, { amount, paymentMode, paymentDate, notes }) {
  const remaining = feeRecord.remainingAmount;
  const accepted = Math.max(0, Math.min(Number(amount), remaining));
  feeRecord.paidAmount += accepted;
  feeRecord.paymentMode = paymentMode;
  feeRecord.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
  if (notes !== undefined) feeRecord.notes = notes;
  return { accepted, feeRecord };
}

/** When a student's route changes, keep their fee records' denormalized routeId in sync. */
export async function syncRouteOnFees(studentId, routeId) {
  await FeeRecord.updateMany({ studentId }, { $set: { routeId } });
}

/**
 * When a student's monthly fee is edited mid-year, update ONLY the months
 * where no payment has been collected yet (paidAmount === 0, status === 'pending').
 *
 * Months with any payment (partial or fully paid) are intentionally left
 * untouched so existing receipt amounts remain historically accurate.
 *
 * Each record is saved individually so the pre-save recompute hook fires
 * correctly on every document.
 *
 * @param {ObjectId|string} studentId
 * @param {number} newFee
 */
export async function syncFeeAmountForStudent(studentId, newFee) {
  const fee = Number(newFee) || 0;

  // Only touch records that have never had any payment recorded
  const unpaidRecords = await FeeRecord.find({
    studentId,
    paidAmount: 0,
    status: 'pending',
  });

  for (const record of unpaidRecords) {
    record.monthlyFee = fee;
    record.paidAmount = 0;
    // pre-save hook will recompute remainingAmount and status
    await record.save();
  }
}
