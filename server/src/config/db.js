import mongoose from 'mongoose';
import dns from 'node:dns';
import { env } from './env.js';

// Override DNS to use Google's public resolvers (8.8.8.8 / 1.1.1.1).
// This fixes "querySrv ECONNREFUSED" on Windows machines where the system
// DNS resolver doesn't support SRV records needed by MongoDB Atlas +srv URIs.
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8:53', '8.8.4.4:53', '1.1.1.1:53']);

/**
 * Connects to MongoDB with automatic retry (up to 5 attempts).
 */
export async function connectDB() {
  mongoose.set('strictQuery', true);

  const attemptConnect = async (attempt = 1) => {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 25000,
        connectTimeoutMS: 25000,
        socketTimeoutMS: 45000,
      });
      console.log('✅ MongoDB connected:', mongoose.connection.host);
    } catch (err) {
      console.error(`❌ MongoDB connection error (attempt ${attempt}):`, err.message);
      if (attempt < 5) {
        const delay = attempt * 3000;
        console.log(`🔄 Retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
        return attemptConnect(attempt + 1);
      }
      process.exit(1);
    }
  };

  await attemptConnect();

  mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => console.log('🔄 MongoDB reconnected'));
}

/** Graceful shutdown helper used by the process signal handlers. */
export async function disconnectDB() {
  await mongoose.connection.close();
  console.log('🛑 MongoDB connection closed');
}
