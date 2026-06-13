import Settings from '../models/Settings.js';
import ActivityLog from '../models/ActivityLog.js';
import { asyncHandler, ok } from '../utils/asyncHandler.js';
import { parsePagination, buildMeta } from '../utils/query.js';
import { logActivity, clientIp } from '../utils/activityLogger.js';

/** Ensure a single Settings doc exists, creating it with defaults on first read. */
async function getOrCreateSettings() {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});
  return settings;
}

/** GET /api/settings — the single settings document. */
export const getSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();
  return ok(res, settings);
});

/** PUT /api/settings — deep-merge company/receipt/reminders/security sections. */
export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();
  const { company, receipt, reminders, security } = req.body;

  if (company) Object.assign(settings.company, company);
  if (receipt) Object.assign(settings.receipt, receipt);
  if (reminders) Object.assign(settings.reminders, reminders);
  if (security) Object.assign(settings.security, security);

  await settings.save();
  await logActivity({ userId: req.user.id, action: 'settings.update', ip: clientIp(req) });
  return ok(res, settings);
});

/** GET /api/settings/activity-logs — paginated audit trail (Security tab). */
export const getActivityLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 25 });
  const [items, total] = await Promise.all([
    ActivityLog.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name username role')
      .lean(),
    ActivityLog.countDocuments(),
  ]);
  return ok(res, items, buildMeta({ page, limit, total }));
});
