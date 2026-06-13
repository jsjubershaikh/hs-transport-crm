import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema(
  {
    fromAcademicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
    toAcademicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
    mapping: { type: mongoose.Schema.Types.Mixed }, // { 'Jr KG':'Sr KG', '10':'Alumni', ... }
    studentsPromoted: { type: Number, default: 0 },
    alumniCount: { type: Number, default: 0 },
    promotedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    promotedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('Promotion', promotionSchema);
