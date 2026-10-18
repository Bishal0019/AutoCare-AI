/**
 * MongoDB connection singleton — AutoCare AI
 *
 * Maintains a single Mongoose connection across the entire application
 * lifetime. In Next.js development mode, hot-reloads would create new
 * connections on every module re-evaluation — the global cache pattern
 * prevents connection exhaustion.
 *
 * Usage (inside any Server Component or Route Handler):
 *   import { connectDB } from '@/lib/db/mongoose';
 *   await connectDB();
 *   // Mongoose models are now ready to query.
 *
 * Authorization contract:
 *   ALWAYS filter queries by the clerkId obtained from auth().
 *   Example: Vehicle.findOne({ clerkId: userId, _id: vehicleId })
 *   Never trust a userId provided by the client request body.
 */

import mongoose from 'mongoose';


/**
 * MONGODB_URI is read lazily inside connectDB() so importing this module
 * never crashes — the error only surfaces when a query is actually attempted.
 * This allows per-section error handling in Server Components.
 */


/** @type {{ conn: mongoose.Mongoose | null, promise: Promise<mongoose.Mongoose> | null }} */
let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

/**
 * Returns a resolved Mongoose connection, reusing the cached connection
 * when already established.
 *
 * @returns {Promise<mongoose.Mongoose>}
 */
export async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not defined. Copy .env.example to .env.local and set your MongoDB URI.'
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,   // Fail fast instead of buffering when disconnected
      })
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    // Reset the promise so the next call retries the connection
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}
