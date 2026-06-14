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

// CLIENT_ORIGIN may be a single origin or a comma-separated list.
// We clean them and automatically append the www/non-www counterpart.
const rawOrigins = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const parsedOrigins = rawOrigins
  .split(',')
  .map((o) => o.trim().replace(/,$/, '').replace(/\/$/, ''))
  .filter(Boolean);

const autoOrigins = [];
for (const origin of parsedOrigins) {
  try {
    const url = new URL(origin);
    if (url.hostname.startsWith('www.')) {
      const nonWww = `${url.protocol}//${url.hostname.substring(4)}${url.port ? ':' + url.port : ''}`;
      if (!parsedOrigins.includes(nonWww)) {
        autoOrigins.push(nonWww);
      }
    } else if (!url.hostname.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/) && url.hostname !== 'localhost') {
      const www = `${url.protocol}//www.${url.hostname}${url.port ? ':' + url.port : ''}`;
      if (!parsedOrigins.includes(www)) {
        autoOrigins.push(www);
      }
    }
  } catch (e) {
    // Ignore invalid URLs
  }
}

const originList = [...parsedOrigins, ...autoOrigins];

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
