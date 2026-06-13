import cookie from 'cookie';
import { verifyToken } from '../utils/token.js';
import { initRealtime } from '../services/realtime.js';

/**
 * Wire up Socket.io: authenticate every socket from its JWT, then place it in
 * the right rooms so server-side emits reach exactly the right admins.
 *
 *   role:superadmin / role:subadmin   -> by role
 *   route:{assignedRouteId}           -> a subadmin's own route
 *   route:all                         -> superadmins (see every route)
 */
export function setupSockets(io) {
  initRealtime(io);

  // Handshake authentication — runs once per connection.
  io.use((socket, next) => {
    try {
      const fromAuth = socket.handshake.auth?.token;
      const header = socket.handshake.headers?.authorization;
      const fromHeader = header?.startsWith('Bearer ') ? header.slice(7) : null;
      const cookies = socket.handshake.headers?.cookie
        ? cookie.parse(socket.handshake.headers.cookie)
        : {};
      const token = fromAuth || fromHeader || cookies.token;
      if (!token) return next(new Error('Socket auth required'));

      const decoded = verifyToken(token);
      socket.user = {
        id: decoded.id,
        role: decoded.role,
        assignedRouteId: decoded.assignedRouteId || null,
      };
      next();
    } catch {
      next(new Error('Socket authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const { role, assignedRouteId, id } = socket.user;
    socket.join(`role:${role}`);
    if (role === 'subadmin' && assignedRouteId) {
      socket.join(`route:${assignedRouteId}`);
    }
    if (role === 'superadmin') {
      socket.join('route:all');
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔌 socket connected: user=${id} role=${role}`);
    }

    socket.on('disconnect', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔌 socket disconnected: user=${id}`);
      }
    });
  });
}
