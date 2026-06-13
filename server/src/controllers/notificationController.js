import Notification from '../models/Notification.js';
import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { parsePagination, buildMeta } from '../utils/query.js';

/**
 * Build the visibility filter for the current user.
 * - superadmin: sees everything.
 * - subadmin: sees notifications targeted to subadmins/all AND either global
 *   (no route) or scoped to their own route.
 */
function visibilityFilter(req) {
  if (req.user.role === 'superadmin') return {};
  return {
    targetRole: { $in: ['subadmin', 'all'] },
    $or: [{ targetRouteId: null }, { targetRouteId: req.user.assignedRouteId }],
  };
}

/** GET /api/notifications?status=unread&type=fee — scoped list + unreadCount. */
export const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 30 });
  const filter = visibilityFilter(req);

  if (req.query.status === 'unread') filter.isRead = false;
  if (req.query.type) {
    // Accept 'fee' shorthand for both fee-related types.
    if (req.query.type === 'fee') filter.type = { $in: ['fee_pending', 'payment_received'] };
    else if (req.query.type === 'student') filter.type = 'student_added';
    else filter.type = req.query.type;
  }

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...visibilityFilter(req), isRead: false }),
  ]);

  return ok(res, items, { ...buildMeta({ page, limit, total }), unreadCount });
});

/** POST /api/notifications/:id/read — mark one read. */
export const markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id }, { $set: { isRead: true } });
  return ok(res, { id: req.params.id, isRead: true });
});

/** POST /api/notifications/read-all — mark all visible notifications read. */
export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ ...visibilityFilter(req), isRead: false }, { $set: { isRead: true } });
  return ok(res, { message: 'All notifications marked read' });
});
