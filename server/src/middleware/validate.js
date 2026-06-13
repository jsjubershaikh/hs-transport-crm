import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

/**
 * Runs after a chain of express-validator rules. Collects any failures into a
 * field map and throws a 422 ApiError so the central handler emits the standard
 * envelope: { success:false, error:{ message, code:'VALIDATION_ERROR', fields } }
 */
export function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const fields = {};
  for (const e of result.array()) {
    // express-validator v7 uses `path`; keep `param` as a fallback.
    const key = e.path || e.param || 'unknown';
    if (!fields[key]) fields[key] = e.msg;
  }
  next(new ApiError(422, 'Validation failed', { code: 'VALIDATION_ERROR', fields }));
}
