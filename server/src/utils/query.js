/**
 * Parse ?page & ?limit into safe pagination values plus a Mongoose skip.
 * Caps limit at 100 to protect the server from huge page sizes.
 */
export function parsePagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;
  return { page, limit, skip: (page - 1) * limit };
}

/** Build the meta object returned alongside paginated lists. */
export function buildMeta({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/** Escape a user string before using it in a RegExp (search boxes). */
export function escapeRegex(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
