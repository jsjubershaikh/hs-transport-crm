import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';

/**
 * Role gate. Usage: router.post('/', requireRole('superadmin'), handler)
 * Returns 403 if the authenticated user's role isn't in the allow-list.
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
}

/**
 * Build a Mongoose filter fragment that scopes a query to the caller's data.
 * - superadmin: no restriction ({})
 * - subadmin:   forced { routeId: <their route> }
 *
 * Merge it into every list query:  Model.find({ ...scopeFilter(req), ...otherFilters })
 * This is the AUTHORITATIVE enforcement — the UI hiding nav is not enough.
 *
 * routeId is returned as an ObjectId (not the raw JWT string): find() would
 * auto-cast a string, but aggregation $match does NOT — so a string here would
 * silently match nothing in fee/dashboard pipelines.
 */
export function scopeFilter(req) {
  if (req.user?.role === 'subadmin' && req.user.assignedRouteId) {
    return { routeId: new mongoose.Types.ObjectId(req.user.assignedRouteId) };
  }
  return {};
}

/**
 * Guard a single-document access by its routeId. Call after loading a doc:
 *   ensureRouteAccess(req, student.routeId)
 * A subadmin hitting another route's resource by id gets a hard 403.
 */
export function ensureRouteAccess(req, routeId) {
  if (req.user?.role === 'subadmin') {
    if (String(routeId) !== String(req.user.assignedRouteId)) {
      throw ApiError.forbidden("You cannot access another route's data");
    }
  }
}

/**
 * For create/update bodies: a subadmin may only write within their own route.
 * Forces routeId onto the payload and rejects an explicit foreign routeId.
 */
export function enforceRouteOnBody(req) {
  if (req.user?.role === 'subadmin') {
    if (req.body.routeId && String(req.body.routeId) !== String(req.user.assignedRouteId)) {
      throw ApiError.forbidden('Sub-admins can only manage their assigned route');
    }
    req.body.routeId = req.user.assignedRouteId;
  }
}
