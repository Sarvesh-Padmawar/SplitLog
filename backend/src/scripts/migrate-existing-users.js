/**
 * migrate-existing-users.js
 * ─────────────────────────
 * One-shot migration: marks all users that existed BEFORE the email-verification
 * system was introduced as isVerified = true, so they can still log in.
 *
 * Run once with:
 *   node src/scripts/migrate-existing-users.js
 *
 * Safe to run multiple times (updates only users where isVerified is false/unset).
 */

import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.model.js";

// Resolve .env relative to this script's location (../../.env = backend/.env)
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../..", ".env") });



const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌  MONGO_URI not found in .env");
  process.exit(1);
}

(async () => {
  try {
    console.log("🔌  Connecting to MongoDB…");
    await mongoose.connect(MONGO_URI);
    console.log("✅  Connected\n");

    // Bulk-update: only touch users that haven't been verified yet
    const result = await User.updateMany(
      { isVerified: { $ne: true } },   // where isVerified is false or missing
      { $set: { isVerified: true } }
    );

    console.log(`✅  Migration complete`);
    console.log(`    Matched : ${result.matchedCount}`);
    console.log(`    Modified: ${result.modifiedCount}`);
  } catch (err) {
    console.error("❌  Migration failed:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌  Disconnected from MongoDB");
  }
})();
