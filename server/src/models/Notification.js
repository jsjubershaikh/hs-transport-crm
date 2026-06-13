import mongoose from 'mongoose';
import { NOTIFICATION_TYPES } from '../utils/constants.js';

const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    targetRole: { type: String, enum: ['superadmin', 'subadmin', 'all'], default: 'all' },
    // null => global; otherwise scopes the notification to one route's subadmin.
    targetRouteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
    relatedId: { type: mongoose.Schema.Types.ObjectId }, // student / fee / receipt reference
  },
  { timestamps: true }
);

// Common query: unread notifications for a given route/role, newest first.
notificationSchema.index({ targetRouteId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
