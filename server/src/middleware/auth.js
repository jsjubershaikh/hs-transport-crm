import { verifyToken } from '../utils/token.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

/**
 * Authentication gate. Reads the JWT from the httpOnly cookie OR the
 * `Authorization: Bearer` header, verifies it, then loads the user to confirm
 * they still exist and are active. Attaches a normalized req.user.
 */
export async function authenticate(req, res, next) {
  try {
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null;
    const token = req.cookies?.token || bearer;
    if (!token) throw ApiError.unauthorized('Authentication required');

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      throw ApiError.unauthorized('Invalid or expired session');
    }

    // Confirm the account is still valid (covers deletion / deactivation).
    const user = await User.findById(decoded.id).lean();
    if (!user) throw ApiError.unauthorized('Account no longer exists');
    if (!user.isActive) throw ApiError.forbidden('Account is disabled');

    req.user = {
      id: String(user._id),
      name: user.name,
      role: user.role,
      assignedRouteId: user.assignedRouteId ? String(user.assignedRouteId) : null,
      username: user.username,
    };
    next();
  } catch (err) {
    next(err);
  }
}
