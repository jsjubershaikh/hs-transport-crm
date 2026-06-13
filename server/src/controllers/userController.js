import User from '../models/User.js';
import Route from '../models/Route.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { logActivity, clientIp } from '../utils/activityLogger.js';

/** GET /api/users/subadmins — list subadmins with assigned route + status. */
export const listSubAdmins = asyncHandler(async (req, res) => {
  const subs = await User.find({ role: 'subadmin' })
    .populate('assignedRouteId', 'routeName routeNumber')
    .sort({ createdAt: -1 })
    .lean();
  return ok(res, subs);
});

/** POST /api/users/subadmins — create a subadmin (unique username, hashed pw). */
export const createSubAdmin = asyncHandler(async (req, res) => {
  const { name, mobile, username, password, confirmPassword, assignedRouteId, photo } = req.body;

  if (password !== confirmPassword) {
    throw ApiError.badRequest('Passwords do not match', { fields: { confirmPassword: 'Must match password' } });
  }
  const exists = await User.findOne({ username: String(username).toLowerCase().trim() }).lean();
  if (exists) throw ApiError.conflict('Username already taken', { fields: { username: 'already exists' } });

  const route = await Route.findById(assignedRouteId).lean();
  if (!route) throw ApiError.badRequest('Assigned route not found', { fields: { assignedRouteId: 'invalid route' } });

  const user = new User({ name, mobile, username, role: 'subadmin', assignedRouteId, photo: photo || '' });
  await user.setPassword(password);
  await user.save();

  await logActivity({
    userId: req.user.id,
    action: 'subadmin.create',
    details: { subAdminId: user._id, username: user.username, route: route.routeName },
    ip: clientIp(req),
  });

  const created = await User.findById(user._id).populate('assignedRouteId', 'routeName routeNumber').lean();
  return ok(res, created, undefined, 201);
});

/** PUT /api/users/subadmins/:id — update name/mobile/route/active. */
export const updateSubAdmin = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'subadmin' });
  if (!user) throw ApiError.notFound('Sub-admin not found');

  const { name, mobile, assignedRouteId, isActive, photo } = req.body;
  if (name !== undefined) user.name = name;
  if (mobile !== undefined) user.mobile = mobile;
  if (assignedRouteId !== undefined) user.assignedRouteId = assignedRouteId;
  if (isActive !== undefined) user.isActive = isActive;
  if (photo !== undefined) user.photo = photo;
  await user.save();

  await logActivity({
    userId: req.user.id,
    action: 'subadmin.update',
    details: { subAdminId: user._id, username: user.username },
    ip: clientIp(req),
  });

  const updated = await User.findById(user._id).populate('assignedRouteId', 'routeName routeNumber').lean();
  return ok(res, updated);
});

/** DELETE /api/users/subadmins/:id */
export const deleteSubAdmin = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'subadmin' });
  if (!user) throw ApiError.notFound('Sub-admin not found');
  await user.deleteOne();

  await logActivity({
    userId: req.user.id,
    action: 'subadmin.delete',
    details: { subAdminId: user._id, username: user.username },
    ip: clientIp(req),
  });
  return ok(res, { id: user._id, message: 'Sub-admin deleted' });
});

/** POST /api/users/subadmins/:id/reset-password — set a new password. */
export const resetSubAdminPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || String(newPassword).length < 6) {
    throw ApiError.badRequest('Password must be at least 6 characters', { fields: { newPassword: 'min 6 chars' } });
  }
  const user = await User.findOne({ _id: req.params.id, role: 'subadmin' });
  if (!user) throw ApiError.notFound('Sub-admin not found');

  await user.setPassword(newPassword);
  await user.save();

  await logActivity({
    userId: req.user.id,
    action: 'subadmin.reset_password',
    details: { subAdminId: user._id, username: user.username },
    ip: clientIp(req),
  });
  return ok(res, { id: user._id, message: 'Password reset successfully' });
});

/** PUT /api/users/me/profile — update own name / mobile / username (any role). */
export const updateOwnProfile = asyncHandler(async (req, res) => {
  const { name, mobile, username, photo } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');

  if (name !== undefined) user.name = String(name).trim();
  if (mobile !== undefined) user.mobile = String(mobile).trim();
  if (photo !== undefined) user.photo = photo;
  if (username !== undefined) {
    const normalized = String(username).toLowerCase().trim();
    // Check uniqueness only if username is actually changing
    if (normalized !== user.username) {
      const taken = await User.findOne({ username: normalized, _id: { $ne: user._id } }).lean();
      if (taken) throw ApiError.conflict('Username already taken', { fields: { username: 'already exists' } });
    }
    user.username = normalized;
  }

  await user.save();
  await logActivity({
    userId: req.user.id,
    action: 'user.update_profile',
    details: { updatedFields: Object.keys(req.body) },
    ip: clientIp(req),
  });

  const { passwordHash: _pw, ...safeUser } = user.toObject();
  return ok(res, safeUser);
});

/** POST /api/users/me/password — change own password (any role). */
export const changeOwnPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || String(newPassword).length < 6) {
    throw ApiError.badRequest('New password must be at least 6 characters', { fields: { newPassword: 'min 6 chars' } });
  }

  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!user) throw ApiError.notFound('User not found');

  const valid = await user.comparePassword(currentPassword);
  if (!valid) throw ApiError.badRequest('Current password is incorrect', { fields: { currentPassword: 'incorrect' } });

  await user.setPassword(newPassword);
  await user.save();

  await logActivity({ userId: req.user.id, action: 'user.change_password', ip: clientIp(req) });
  return ok(res, { message: 'Password updated successfully' });
});
