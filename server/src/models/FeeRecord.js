import mongoose from 'mongoose';
import { MONTHS, FEE_STATUS, PAYMENT_MODES } from '../utils/constants.js';

const feeRecordSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
      index: true,
    },
    // routeId is denormalized from the student so route-scoped fee dashboards
    // don't need an extra $lookup on every aggregation.
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true, index: true },

    month: { type: String, enum: MONTHS, required: true },
    monthlyFee: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    remainingAmount: { type: Number, required: true },
    status: { type: String, enum: FEE_STATUS, default: 'pending' },

    paymentDate: { type: Date },
    paymentMode: { type: String, enum: PAYMENT_MODES },
    notes: { type: String, default: '' },
    collectedBy: { type: String, default: '' },  // name of person who collected
    receiptNumber: { type: String, default: '' },
  },
  { timestamps: true }
);

// One fee record per student per month per academic year.
feeRecordSchema.index({ studentId: 1, academicYearId: 1, month: 1 }, { unique: true });
// Powers route-scoped fee dashboards and month/status filters.
feeRecordSchema.index({ routeId: 1, academicYearId: 1, month: 1, status: 1 });

/**
 * Keep remainingAmount and status derived from monthlyFee/paidAmount on every
 * write. This is the single source of truth for fee math so controllers only
 * ever set paidAmount.
 */
function recompute(doc) {
  const fee = Number(doc.monthlyFee) || 0;
  const paid = Math.min(Number(doc.paidAmount) || 0, fee);
  doc.paidAmount = paid;
  doc.remainingAmount = Math.max(fee - paid, 0);
  if (paid <= 0) doc.status = 'pending';
  else if (paid >= fee) doc.status = 'paid';
  else doc.status = 'partial';
}

feeRecordSchema.pre('save', function preSave(next) {
  recompute(this);
  next();
});

export default mongoose.model('FeeRecord', feeRecordSchema);
