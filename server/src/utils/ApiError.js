/**
 * Application error carrying an HTTP status, a stable machine code and
 * optional field-level details. The central error handler turns any thrown
 * ApiError into the standard error envelope.
 */
export default class ApiError extends Error {
  constructor(statusCode, message, { code, fields } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code || httpCodeName(statusCode);
    this.fields = fields; // optional { fieldName: 'reason' }
    this.isOperational = true;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(msg = 'Bad request', opts) {
    return new ApiError(400, msg, opts);
  }
  static unauthorized(msg = 'Unauthorized', opts) {
    return new ApiError(401, msg, opts);
  }
  static forbidden(msg = 'Forbidden', opts) {
    return new ApiError(403, msg, opts);
  }
  static notFound(msg = 'Not found', opts) {
    return new ApiError(404, msg, opts);
  }
  static conflict(msg = 'Conflict', opts) {
    return new ApiError(409, msg, opts);
  }
}

function httpCodeName(status) {
  const map = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    500: 'INTERNAL_ERROR',
  };
  return map[status] || 'ERROR';
}
