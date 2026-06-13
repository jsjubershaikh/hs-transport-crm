import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true }, // 'student.create', 'fee.collect', ...
    details: { type: mongoose.Schema.Types.Mixed }, // arbitrary JSON snapshot
    ip: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Activity feed is read newest-first.
activityLogSchema.index({ timestamp: -1 });

export default mongoose.model('ActivityLog', activityLogSchema);
