import mongoose from 'mongoose';

/**
 * Records that a superadmin has physically verified and received cash
 * from a collector for a specific date.
 *
 * One document per (date + collectorName) pair — upserted on verification.
 */
const collectionVerificationSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },                                      // 'YYYY-MM-DD'
    collectorName: { type: String, required: true },                             // matches Receipt.collectedBy
    collectorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // resolved for notification
    collectorRouteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
    amount: { type: Number, required: true },                                     // total amount verified
    receiptCount: { type: Number, required: true },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // superadmin
    verifiedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Ensure one verification per collector per day (upsert pattern)
collectionVerificationSchema.index({ date: 1, collectorName: 1 }, { unique: true });

export default mongoose.model('CollectionVerification', collectionVerificationSchema);
