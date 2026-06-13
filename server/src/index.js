import http from 'http';
import { pathToFileURL } from 'url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { Server as SocketServer } from 'socket.io';

import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import apiRouter from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import { setupSockets } from './sockets/index.js';

/**
 * Build the Express app + HTTP server + Socket.io (and connect to Mongo) WITHOUT
 * starting to listen. Exported so tests / verification harnesses can drive it.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.connect=true] - connect to MongoDB during build
 */
export async function createServer({ connect = true } = {}) {
  if (connect) await connectDB();

  const app = express();
  const server = http.createServer(app);

  // --- Socket.io ---
  const io = new SocketServer(server, {
    cors: { origin: env.CLIENT_ORIGINS, credentials: true },
  });
  setupSockets(io);
  // Expose io on the app in case a controller ever needs it directly.
  app.set('io', io);

  // --- Security & parsing middleware ---
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.CLIENT_ORIGINS, credentials: true }));
  // Images now go directly to Cloudinary — 1 MB is more than enough for all API payloads
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(morgan(env.isProd ? 'combined' : 'dev'));

  // Basic API rate limiting (tune per route in production).
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', limiter);

  // --- Health check (used by Render for zero-downtime deploys) ---
  app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

  // --- Routes ---
  app.use('/api', apiRouter);

  // --- Error handling (must be last) ---
  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, server, io };
}

/** Boot the server for real (connect + listen + graceful shutdown). */
async function bootstrap() {
  const { server, io } = await createServer();

  server.listen(env.PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${env.PORT}`);
    console.log(`   API base:  http://localhost:${env.PORT}/api`);
    console.log(`   CORS origin: ${env.CLIENT_ORIGIN}`);
    console.log(`   Mode: ${env.NODE_ENV}`);
  });

  // --- Graceful shutdown ---
  const shutdown = async (signal) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    io.close();
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref(); // force-exit if it hangs
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));
}

// Start only when invoked directly (`node src/index.js` / nodemon).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  bootstrap().catch((err) => {
    console.error('Fatal bootstrap error:', err);
    process.exit(1);
  });
}

