import mongoose from 'mongoose';

const academicYearSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, unique: true, trim: true }, // e.g. '2025-2026'
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Fast lookup of "the current year" — used on almost every scoped query.
academicYearSchema.index({ isCurrent: 1 });

export default mongoose.model('AcademicYear', academicYearSchema);
