import mongoose from 'mongoose';

const manualReceiptSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true, unique: true }, // e.g. M-HT-2026-0001
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true, index: true },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMode: { type: String, enum: ['cash', 'upi', 'online', 'cheque'], default: 'cash' },
    collectedBy: { type: String, default: '' },
    month: { type: String, default: '' }, // optional month tag, e.g. 'Jun'
    receiptDate: { type: Date, required: true, default: Date.now, index: true },
    remarks: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('ManualReceipt', manualReceiptSchema);
