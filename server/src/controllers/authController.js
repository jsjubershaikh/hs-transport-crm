import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { signToken, cookieOptions } from '../utils/token.js';
import { logActivity, clientIp } from '../utils/activityLogger.js';

/**
 * POST /api/auth/login
 * Verifies credentials, signs a JWT, sets it as an httpOnly cookie AND returns
 * it in the body (so the SPA can also keep it in memory / localStorage).
 */
export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // passwordHash is select:false, so explicitly include it here.
  const user = await User.findOne({ username: String(username).toLowerCase().trim() }).select(
    '+passwordHash'
  );
  if (!user) throw ApiError.unauthorized('Invalid username or password');
  if (!user.isActive) throw ApiError.forbidden('Your account has been disabled');

  const valid = await user.comparePassword(password);
  if (!valid) throw ApiError.unauthorized('Invalid username or password');

  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken(user);
  res.cookie('token', token, cookieOptions());

  await logActivity({
    userId: user._id,
    action: 'auth.login',
    details: { username: user.username, role: user.role },
    ip: clientIp(req),
  });

  return ok(res, {
    token,
    user: {
      id: String(user._id),
      name: user.name,
      username: user.username,
      role: user.role,
      assignedRouteId: user.assignedRouteId ? String(user.assignedRouteId) : null,
      mobile: user.mobile,
      photo: user.photo || '',
    },
  });
});

/**
 * POST /api/auth/verify-password  (authenticated)
 * Verifies the current user's password — used as a security gate before
 * sensitive operations like editing or deleting academic years.
 */
export const verifyPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) throw ApiError.badRequest('Password is required');

  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Account not found');

  const valid = await user.comparePassword(password);
  if (!valid) throw ApiError.unauthorized('Incorrect password');

  return ok(res, { verified: true });
});

/** POST /api/auth/logout — clears the cookie. */
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', cookieOptions());
  if (req.user) {
    await logActivity({ userId: req.user.id, action: 'auth.logout', ip: clientIp(req) });
  }
  return ok(res, { message: 'Logged out' });
});

/**
 * GET /api/auth/me — returns the current user (for auto-login on refresh).
 * Populates the assigned route label for subadmins so the UI can show it.
 */
export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('assignedRouteId', 'routeName routeNumber')
    .lean();
  if (!user) throw ApiError.unauthorized('Account no longer exists');

  return ok(res, {
    user: {
      id: String(user._id),
      name: user.name,
      username: user.username,
      role: user.role,
      mobile: user.mobile,
      photo: user.photo || '',
      assignedRouteId: user.assignedRouteId?._id ? String(user.assignedRouteId._id) : null,
      assignedRoute: user.assignedRouteId
        ? { routeName: user.assignedRouteId.routeName, routeNumber: user.assignedRouteId.routeNumber }
        : null,
    },
  });
});
