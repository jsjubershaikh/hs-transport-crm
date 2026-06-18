import mongoose from 'mongoose';

/**
 * Manually-issued receipt. COMPLETELY SEPARATE from the auto-generated Receipt
 * collection and from the fee ledger:
 *  - It NEVER touches FeeRecord / paidAmount, so it cannot affect fee totals
 *    or collection reports. It is purely a printable document an admin makes
 *    when a parent specifically asks for a custom receipt.
 *  - A studentSnapshot is stored so the document stays correct even if the
 *    student's record later changes.
 */
const manualReceiptSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true, unique: true }, // e.g. HT-M-2025-0007
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    studentSnapshot: {
      name: { type: String, default: '' },
      fatherName: { type: String, default: '' },
      class: { type: String, default: '' },
      section: { type: String, default: '' },
      mobile: { type: String, default: '' },
    },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', index: true },
    // Line items — paid months and/or free-form charges chosen by the admin.
    items: [
      {
        description: { type: String, required: true },
        month: { type: String, default: '' }, // optional reference month
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    amount: { type: Number, required: true, min: 0 }, // total of all items
    paymentMode: { type: String, default: '' }, // cash/online/cheque/upi
    paymentDate: { type: Date },
    collectedBy: { type: String, default: '' },
    note: { type: String, default: '' },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    generatedAt: { type: Date, default: Date.now, index: true },
    printedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('ManualReceipt', manualReceiptSchema);
