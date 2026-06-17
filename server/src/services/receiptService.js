import mongoose from 'mongoose';
import Receipt from '../models/Receipt.js';
import Settings from '../models/Settings.js';

/**
 * Atomic per-year counter for receipt sequence numbers. Using a dedicated
 * counter document with $inc guarantees no two receipts ever collide, even
 * under concurrent fee collection (unlike countDocuments()+1 which races).
 */
const counterSchema = new mongoose.Schema({
  _id: String, // e.g. 'receipt-2025'
  seq: { type: Number, default: 0 },
});
const Counter =
  mongoose.models.Counter || mongoose.model('Counter', counterSchema);

/** Resolve the configured receipt prefix (defaults to 'HT'). */
async function getPrefix() {
  const settings = await Settings.findOne().lean();
  return settings?.receipt?.prefix || 'HT';
}

/**
 * Generate the next receipt number for a year, e.g. HT-2025-0042.
 * @param {number} year   - calendar year (academic year's start year)
 */
export async function nextReceiptNumber(year, { session } = {}) {
  const prefix = await getPrefix();
  const counter = await Counter.findByIdAndUpdate(
    `receipt-${year}`,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );
  const padded = String(counter.seq).padStart(4, '0');
  return `${prefix}-${year}-${padded}`;
}

/**
 * Create a Receipt document tied to a paid/partial fee record.
 *
 * @param {object} params
 * @param {object} params.feeRecord    - the FeeRecord just paid
 * @param {object} params.student      - the Student doc
 * @param {number} params.amount       - amount on this receipt
 * @param {number} params.year         - academic year's start year
 * @param {string} params.generatedBy  - user id
 * @param {import('mongoose').ClientSession} [params.session]
 */
export async function createReceipt({ feeRecord, student, amount, year, generatedBy, collectedBy = '', session }) {
  const receiptNumber = await nextReceiptNumber(year, { session });
  const [receipt] = await Receipt.create(
    [
      {
        receiptNumber,
        receiptType: 'monthly',
        studentId: student._id,
        feeRecordId: feeRecord._id,
        academicYearId: feeRecord.academicYearId,
        routeId: feeRecord.routeId,
        amount,
        month: feeRecord.month,
        paymentMode: feeRecord.paymentMode || '',
        generatedBy,
        collectedBy,
        generatedAt: new Date(),
      },
    ],
    { session }
  );
  return receipt;
}

/**
 * Generate the next manual receipt number for a year, e.g. M-HT-2025-0042.
 * @param {number} year   - calendar year (academic year's start year)
 */
export async function nextManualReceiptNumber(year, { session } = {}) {
  const prefix = await getPrefix();
  const counter = await Counter.findByIdAndUpdate(
    `manual-receipt-${year}`,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );
  const padded = String(counter.seq).padStart(4, '0');
  return `M-${prefix}-${year}-${padded}`;
}

