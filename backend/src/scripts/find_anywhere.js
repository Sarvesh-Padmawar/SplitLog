import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const db = mongoose.connection.db;
    const adminDb = db.admin();
    const dbs = await adminDb.listDatabases();
    console.log("Databases in cluster:");
    for (const d of dbs.databases) {
      console.log(`- ${d.name} (${d.sizeOnDisk} bytes)`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
