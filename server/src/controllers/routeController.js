import mongoose from 'mongoose';
import Route from '../models/Route.js';
import Bus from '../models/Bus.js';
import Student from '../models/Student.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { ensureRouteAccess } from '../middleware/rbac.js';
import { resolveYearId } from '../utils/academic.js';
import { emitToScope } from '../services/realtime.js';
import { logActivity, clientIp } from '../utils/activityLogger.js';

/**
 * GET /api/routes
 * All routes with computed studentCount + totalMonthlyCollection. Subadmins are
 * restricted to their own route (used for the Add-Student route dropdown).
 */
export const listRoutes = asyncHandler(async (req, res) => {
  const match = {};
  if (req.user.role === 'subadmin') match._id = new mongoose.Types.ObjectId(req.user.assignedRouteId);
  const yearId = await resolveYearId(req.query);

  const routes = await Route.aggregate([
    { $match: match },
    { $lookup: { from: 'buses', localField: 'busId', foreignField: '_id', as: 'bus' } },
    { $unwind: { path: '$bus', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'students',
        let: { routeId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$routeId', '$$routeId'] },
                  { $eq: ['$status', 'active'] },
                  ...(yearId
                    ? [{ $eq: ['$academicYearId', new mongoose.Types.ObjectId(yearId)] }]
                    : []),
                ],
              },
            },
          },
          { $group: { _id: null, count: { $sum: 1 }, monthly: { $sum: '$monthlyFee' } } },
        ],
        as: 'stats',
      },
    },
    {
      $addFields: {
        studentCount: { $ifNull: [{ $arrayElemAt: ['$stats.count', 0] }, 0] },
        totalMonthlyCollection: { $ifNull: [{ $arrayElemAt: ['$stats.monthly', 0] }, 0] },
      },
    },
    { $project: { stats: 0 } },
    { $sort: { routeNumber: 1 } },
  ]);

  return ok(res, routes);
});

/** GET /api/routes/:id — route detail + its students (RBAC-checked). */
export const getRoute = asyncHandler(async (req, res) => {
  const route = await Route.findById(req.params.id).populate('busId', 'busNumber vehicleNumber capacity').lean();
  if (!route) throw ApiError.notFound('Route not found');
  ensureRouteAccess(req, route._id);

  const yearId = await resolveYearId(req.query);
  const studentFilter = { routeId: route._id };
  if (yearId) studentFilter.academicYearId = yearId;

  const students = await Student.find(studentFilter)
    .select('name fatherName class section mobile monthlyFee status busId')
    .populate('busId', 'busNumber')
    .sort({ name: 1 })
    .lean();

  return ok(res, { route, students });
});

/** POST /api/routes — create (superadmin only). Keeps bus<->route link in sync. */
export const createRoute = asyncHandler(async (req, res) => {
  const route = await Route.create(req.body);
  if (route.busId) await Bus.findByIdAndUpdate(route.busId, { assignedRouteId: route._id });

  emitToScope('route:updated', { entity: route.toObject(), label: `Route added: ${route.routeName}` }, {});
  await logActivity({
    userId: req.user.id,
    action: 'route.create',
    details: { routeId: route._id, routeName: route.routeName },
    ip: clientIp(req),
  });
  return ok(res, route, undefined, 201);
});

/** PUT /api/routes/:id — update (superadmin only). */
export const updateRoute = asyncHandler(async (req, res) => {
  const route = await Route.findById(req.params.id);
  if (!route) throw ApiError.notFound('Route not found');

  const prevBus = route.busId ? String(route.busId) : null;
  Object.assign(route, req.body);
  await route.save();

  // Maintain the reciprocal bus assignment if the bus changed.
  if (String(route.busId) !== prevBus) {
    if (prevBus) await Bus.findByIdAndUpdate(prevBus, { assignedRouteId: null });
    if (route.busId) await Bus.findByIdAndUpdate(route.busId, { assignedRouteId: route._id });
  }

  emitToScope('route:updated', { entity: route.toObject(), label: `Route updated: ${route.routeName}` }, {});
  await logActivity({
    userId: req.user.id,
    action: 'route.update',
    details: { routeId: route._id, routeName: route.routeName },
    ip: clientIp(req),
  });
  return ok(res, route);
});

/**
 * DELETE /api/routes/:id — superadmin only. Blocks (409) when the route still
 * has students unless ?force=true is passed.
 */
export const deleteRoute = asyncHandler(async (req, res) => {
  const route = await Route.findById(req.params.id);
  if (!route) throw ApiError.notFound('Route not found');

  const studentCount = await Student.countDocuments({ routeId: route._id });
  if (studentCount > 0 && req.query.force !== 'true') {
    throw ApiError.conflict(
      `Route has ${studentCount} students. Reassign them first or pass ?force=true.`
    );
  }

  if (route.busId) await Bus.findByIdAndUpdate(route.busId, { assignedRouteId: null });
  await route.deleteOne();

  emitToScope('route:updated', { entity: { _id: route._id }, label: `Route removed: ${route.routeName}` }, {});
  await logActivity({
    userId: req.user.id,
    action: 'route.delete',
    details: { routeId: route._id, routeName: route.routeName, forced: req.query.force === 'true' },
    ip: clientIp(req),
  });
  return ok(res, { id: route._id, message: 'Route deleted' });
});
