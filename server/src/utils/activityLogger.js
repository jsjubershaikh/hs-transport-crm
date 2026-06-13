import ActivityLog from '../models/ActivityLog.js';

/**
 * Persists an audit entry to the activity_logs collection.
 *
 * Never throws into the request flow — logging failures are swallowed and
 * printed, because an audit-write problem should not break a real mutation.
 *
 * @param {object} opts
 * @param {string} opts.userId  - acting user's id
 * @param {string} opts.action  - dotted action name e.g. 'student.create'
 * @param {object} [opts.details] - JSON snapshot of relevant data
 * @param {string} [opts.ip]    - request IP
 */
export async function logActivity({ userId, action, details = {}, ip = '' }) {
  try {
    await ActivityLog.create({ userId, action, details, ip, timestamp: new Date() });
  } catch (err) {
    console.error('⚠️  activityLogger failed:', err.message);
  }
}

/** Convenience to pull the client IP off an Express request. */
export function clientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    ''
  );
}
