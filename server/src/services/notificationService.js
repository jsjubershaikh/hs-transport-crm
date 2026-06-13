import Notification from '../models/Notification.js';
import { emitNotification } from './realtime.js';

/**
 * Create a notification document and push it in real time to its audience.
 * Centralizes the create+emit pattern so controllers stay thin.
 *
 * @param {object} opts
 * @param {string} opts.type          - one of NOTIFICATION_TYPES
 * @param {string} opts.message
 * @param {string} [opts.targetRole]  - 'superadmin' | 'subadmin' | 'all'
 * @param {string|null} [opts.targetRouteId]
 * @param {string} [opts.relatedId]
 */
export async function notify({
  type,
  message,
  targetRole = 'all',
  targetRouteId = null,
  relatedId = null,
}) {
  const doc = await Notification.create({ type, message, targetRole, targetRouteId, relatedId });
  emitNotification(doc.toObject());
  return doc;
}
