import User from '../models/User.js';
import Notification from '../models/Notification.js';
import CollectionVerification from '../models/CollectionVerification.js';
import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { emitNotification } from '../services/realtime.js';

/**
 * POST /api/reports/verify-collection
 * Superadmin marks that cash was physically received from a specific collector
 * for a given date. Creates/updates a CollectionVerification record, then
 * fires a notification to the sub-admin's route room so they see it in real time.
 *
 * Body: { date, collectorName, amount, receiptCount }
 */
export const verifyCollection = asyncHandler(async (req, res) => {
  const { date, collectorName, amount, receiptCount } = req.body;

  if (!date || !collectorName || amount == null) {
    return res.status(400).json({ success: false, message: 'date, collectorName and amount are required' });
  }

  // Try to find the sub-admin user by matching their name (stored in collectedBy)
  const collectorUser = await User.findOne({ name: collectorName, role: 'subadmin' }).lean();

  // Upsert the verification record
  const verification = await CollectionVerification.findOneAndUpdate(
    { date, collectorName },
    {
      $set: {
        date,
        collectorName,
        collectorUserId: collectorUser?._id || null,
        collectorRouteId: collectorUser?.assignedRouteId || null,
        amount,
        receiptCount: receiptCount || 0,
        verifiedBy: req.user.id,
        verifiedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  // Create a persistent notification for the sub-admin
  const notification = await Notification.create({
    type: 'collection_verified',
    message: `✅ Your collection of ₹${amount.toLocaleString('en-IN')} on ${date} has been verified by ${req.user.name}.`,
    targetRole: collectorUser ? 'subadmin' : 'all',
    targetRouteId: collectorUser?.assignedRouteId || null,
    relatedId: verification._id,
    isRead: false,
  });

  // Emit real-time notification to the sub-admin
  emitNotification(notification);

  return ok(res, {
    verification,
    message: `Cash of ₹${amount} from ${collectorName} verified successfully.`,
  });
});
