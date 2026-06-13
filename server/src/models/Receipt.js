import mongoose from 'mongoose';

const receiptSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true, unique: true }, // e.g. HT-2025-0042
    receiptType: { type: String, enum: ['monthly', 'bulk'], default: 'monthly' },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    feeRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeRecord' }, // null for bulk
    // For bulk receipts: array of { feeRecordId, month, amount }
    bulkDetails: [
      {
        feeRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeRecord' },
        month: { type: String },
        amount: { type: Number },
      },
    ],
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', index: true },
    amount: { type: Number, required: true, min: 0 }, // total amount for this receipt
    month: { type: String }, // primary month (for monthly receipts; first month for bulk)
    paymentMode: { type: String, default: '' }, // cash/online/cheque/upi
    generatedAt: { type: Date, default: Date.now, index: true }, // indexed for daily collection queries
    printedAt: { type: Date },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    collectedBy: { type: String, default: '' }, // name of staff who collected
  },
  { timestamps: true }
);

export default mongoose.model('Receipt', receiptSchema);
