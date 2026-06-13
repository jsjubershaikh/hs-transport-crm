import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/** Sign a 7-day (configurable) access token carrying the auth claims. */
export function signToken(user) {
  return jwt.sign(
    {
      id: String(user._id),
      role: user.role,
      assignedRouteId: user.assignedRouteId ? String(user.assignedRouteId) : null,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

/** Verify + decode a token; throws if invalid/expired. */
export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

/** Cookie options shared by login (set) and logout (clear). */
export function cookieOptions() {
  return {
    httpOnly: true,
    // Cross-site (frontend on Vercel, API on Render) needs SameSite=None+Secure.
    // In dev we stay on Lax so http://localhost works. Auth also works without
    // the cookie via the Bearer token returned in the login body.
    sameSite: env.isProd ? 'none' : 'lax',
    secure: env.isProd, // required when SameSite=None
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}
