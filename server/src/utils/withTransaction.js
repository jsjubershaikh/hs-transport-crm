import mongoose from 'mongoose';

/**
 * Run `work(session)` inside a MongoDB transaction when the deployment supports
 * one (replica set / Atlas / mongos). On a standalone mongod — the common local
 * dev setup — transactions aren't available, so we transparently fall back to
 * running the same work WITHOUT a session.
 *
 * WHY THIS MATTERS: promotion and fee-collection touch several collections. On
 * production (Atlas) the transaction guarantees all-or-nothing consistency. The
 * fallback keeps local development runnable; each service is written to be
 * guarded/idempotent so a partial failure there is recoverable.
 *
 * @param {(session: import('mongoose').ClientSession|null) => Promise<any>} work
 */
export async function withTransaction(work) {
  let session = null;
  try {
    session = await mongoose.startSession();
  } catch {
    return work(null);
  }

  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (err) {
    // Standalone mongod rejects transactions with these codes/messages.
    const unsupported =
      err?.code === 20 ||
      err?.codeName === 'IllegalOperation' ||
      /Transaction numbers are only allowed on a replica set/i.test(err?.message || '') ||
      /replica set/i.test(err?.message || '');
    if (unsupported) {
      console.warn('ℹ️  Transactions unsupported (standalone mongod) — running without one.');
      return work(null);
    }
    throw err;
  } finally {
    await session?.endSession();
  }
}
