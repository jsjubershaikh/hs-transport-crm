import dotenv from 'dotenv';

dotenv.config();

/**
 * Reads a required environment variable or throws on startup.
 * Failing fast here prevents the server from booting in a half-configured state.
 */
function required(key) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

// CLIENT_ORIGIN may be a single origin or a comma-separated list (handy when
// Vite falls back to another port, e.g. 5174, if 5173 is taken).
const rawOrigins = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const originList = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);

export const env = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: required('MONGODB_URI'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_ORIGIN: originList[0], // primary (used for cookie context / logging)
  CLIENT_ORIGINS: originList, // full allow-list for CORS / sockets
  NODE_ENV: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
};
