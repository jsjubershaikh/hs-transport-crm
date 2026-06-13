import AcademicYear from '../models/AcademicYear.js';

/** Returns the current academic year document (or null if none flagged). */
export async function getCurrentYear() {
  return AcademicYear.findOne({ isCurrent: true }).lean();
}

/**
 * Resolve which academic year a request targets: an explicit ?yearId wins,
 * otherwise fall back to the current year. Returns the year's id as a string,
 * or null if nothing is available.
 */
export async function resolveYearId(query = {}) {
  if (query.academicYearId) return query.academicYearId;
  if (query.yearId) return query.yearId;
  const current = await getCurrentYear();
  return current ? String(current._id) : null;
}
