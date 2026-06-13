import ApiError from '../utils/ApiError.js';
import { env } from '../config/env.js';

/** 404 fallback for unmatched routes. */
export function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Central error handler. Normalizes ApiError, Mongoose validation errors,
 * duplicate-key errors and cast errors into the consistent error envelope.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_ERROR';
  let fields = err.fields;

  // Mongoose validation error -> 422 with per-field messages.
  if (err.name === 'ValidationError') {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    fields = {};
    for (const [key, val] of Object.entries(err.errors)) fields[key] = val.message;
  }

  // Duplicate unique key -> 409.
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value for ${field}: '${err.keyValue?.[field]}'`;
    fields = { [field]: 'already exists' };
  }

  // Bad ObjectId -> 400.
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid ${err.path}: ${err.value}`;
  }

  if (statusCode >= 500) {
    console.error('💥 Error:', err);
  }

  const body = { success: false, error: { message, code } };
  if (fields) body.error.fields = fields;
  if (!env.isProd && statusCode >= 500) body.error.stack = err.stack;

  res.status(statusCode).json(body);
}
