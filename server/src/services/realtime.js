/**
 * Socket.io emit helpers.
 *
 * Rooms (joined at connection time in index.js):
 *   role:superadmin           -> every superadmin
 *   role:subadmin             -> every subadmin
 *   route:{routeId}           -> the subadmin(s) assigned to that route
 *   route:all                 -> superadmins (they see every route)
 *
 * emitToScope() is the workhorse: it delivers an event to the relevant route
 * room AND always to superadmins, so a superadmin sees every change regardless
 * of which route it happened on.
 *
 * SCALE NOTE: to run multiple Node instances behind a load balancer, attach the
 * @socket.io/redis-adapter here so emits fan out across processes.
 */

let ioRef = null;

export function initRealtime(io) {
  ioRef = io;
}

export function getIo() {
  return ioRef;
}

/**
 * Emit an event to a route's subadmins and to all superadmins.
 * @param {string} event   - socket event name e.g. 'fee:updated'
 * @param {object} payload - { entity, label, ... }
 * @param {object} [opts]
 * @param {string|null} [opts.routeId] - route to scope to (null = broadcast to all)
 */
export function emitToScope(event, payload, { routeId = null } = {}) {
  if (!ioRef) return;
  // Superadmins always receive everything.
  ioRef.to('role:superadmin').emit(event, payload);
  if (routeId) {
    ioRef.to(`route:${String(routeId)}`).emit(event, payload);
  } else {
    // Global change (e.g. a route or bus edit) — notify every subadmin too.
    ioRef.to('role:subadmin').emit(event, payload);
  }
}

/** Emit to one or more explicit role rooms. */
export function emitToRoles(event, payload, roles = ['superadmin', 'subadmin']) {
  if (!ioRef) return;
  roles.forEach((r) => ioRef.to(`role:${r}`).emit(event, payload));
}

/**
 * Deliver a notification to its target audience based on targetRole/targetRouteId.
 * Superadmins always get it; subadmins only if it targets them or their route.
 */
export function emitNotification(notification) {
  if (!ioRef) return;
  const payload = { entity: notification, label: notification.message };
  ioRef.to('role:superadmin').emit('notification:created', payload);

  if (notification.targetRole === 'subadmin' || notification.targetRole === 'all') {
    if (notification.targetRouteId) {
      ioRef.to(`route:${String(notification.targetRouteId)}`).emit('notification:created', payload);
    } else {
      ioRef.to('role:subadmin').emit('notification:created', payload);
    }
  }
}
