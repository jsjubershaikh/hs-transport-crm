import Bus from '../models/Bus.js';
import Route from '../models/Route.js';
import Student from '../models/Student.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { emitToScope } from '../services/realtime.js';
import { logActivity, clientIp } from '../utils/activityLogger.js';

/**
 * GET /api/buses
 * All buses with computed occupancy = active students assigned / capacity.
 * Available to both roles as reference data (the Add-Student bus dropdown
 * filters by route on the client).
 */
export const listBuses = asyncHandler(async (req, res) => {
  const buses = await Bus.find()
    .populate('assignedRouteId', 'routeName routeNumber')
    .sort({ busNumber: 1 })
    .lean();

  // One grouped count for all buses rather than N queries.
  const counts = await Student.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$busId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  const withOccupancy = buses.map((b) => {
    const occupied = countMap.get(String(b._id)) || 0;
    return {
      ...b,
      occupied,
      occupancy: occupied,
      occupancyPct: b.capacity ? Math.round((occupied / b.capacity) * 100) : 0,
    };
  });

  return ok(res, withOccupancy);
});

/** POST /api/buses — create (superadmin only). */
export const createBus = asyncHandler(async (req, res) => {
  const bus = await Bus.create(req.body);
  if (bus.assignedRouteId) await Route.findByIdAndUpdate(bus.assignedRouteId, { busId: bus._id });

  emitToScope('bus:updated', { entity: bus.toObject(), label: `Bus added: ${bus.busNumber}` }, {});
  await logActivity({
    userId: req.user.id,
    action: 'bus.create',
    details: { busId: bus._id, busNumber: bus.busNumber },
    ip: clientIp(req),
  });
  return ok(res, bus, undefined, 201);
});

/** PUT /api/buses/:id — update (superadmin only). */
export const updateBus = asyncHandler(async (req, res) => {
  const bus = await Bus.findById(req.params.id);
  if (!bus) throw ApiError.notFound('Bus not found');

  const prevRoute = bus.assignedRouteId ? String(bus.assignedRouteId) : null;
  Object.assign(bus, req.body);
  await bus.save();

  // Keep the reciprocal route assignment consistent.
  if (String(bus.assignedRouteId) !== prevRoute) {
    if (prevRoute) await Route.findByIdAndUpdate(prevRoute, { busId: null });
    if (bus.assignedRouteId) await Route.findByIdAndUpdate(bus.assignedRouteId, { busId: bus._id });
  }

  emitToScope('bus:updated', { entity: bus.toObject(), label: `Bus updated: ${bus.busNumber}` }, {});
  await logActivity({
    userId: req.user.id,
    action: 'bus.update',
    details: { busId: bus._id, busNumber: bus.busNumber },
    ip: clientIp(req),
  });
  return ok(res, bus);
});

/** DELETE /api/buses/:id — superadmin only. Blocks if students are assigned. */
export const deleteBus = asyncHandler(async (req, res) => {
  const bus = await Bus.findById(req.params.id);
  if (!bus) throw ApiError.notFound('Bus not found');

  const assigned = await Student.countDocuments({ busId: bus._id, status: 'active' });
  if (assigned > 0 && req.query.force !== 'true') {
    throw ApiError.conflict(`Bus has ${assigned} active students. Reassign them or pass ?force=true.`);
  }

  if (bus.assignedRouteId) await Route.findByIdAndUpdate(bus.assignedRouteId, { busId: null });
  await bus.deleteOne();

  emitToScope('bus:updated', { entity: { _id: bus._id }, label: `Bus removed: ${bus.busNumber}` }, {});
  await logActivity({
    userId: req.user.id,
    action: 'bus.delete',
    details: { busId: bus._id, busNumber: bus.busNumber },
    ip: clientIp(req),
  });
  return ok(res, { id: bus._id, message: 'Bus deleted' });
});
