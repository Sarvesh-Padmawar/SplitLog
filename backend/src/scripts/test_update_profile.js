import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import jwt from "jsonwebtoken";
import app from "../app.js";
import User from "../models/User.model.js";

dotenv.config();

const run = async () => {
  let server;
  let user;

  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    // 2. Start Server on Port 5002
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(5002, resolve));
    console.log("Test server running on port 5002.");

    // 3. Create test user
    user = await User.create({
      name: "Original Name",
      username: `test_profile_${Date.now()}`,
      email: `test_profile_${Date.now()}@test.com`,
      isVerified: true,
    });
    console.log(`Created test user: ${user.name} (${user.username})`);

    // 4. Generate JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

    // 5. Test Case 1: Valid Profile Update
    console.log("Running Case 1: Valid profile update...");
    const res1 = await fetch("http://localhost:5002/api/users/me/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `jwt=${token}`,
      },
      body: JSON.stringify({ name: "Updated Name" }),
    });

    const data1 = await res1.json();
    if (res1.status === 200 && data1.user.name === "Updated Name") {
      console.log("✅ Case 1 Passed: Profile updated successfully!");
    } else {
      console.error("❌ Case 1 Failed:", res1.status, data1);
      process.exit(1);
    }

    // 6. Test Case 2: Empty Name (should fail Joi validation)
    console.log("Running Case 2: Empty name...");
    const res2 = await fetch("http://localhost:5002/api/users/me/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `jwt=${token}`,
      },
      body: JSON.stringify({ name: "" }),
    });

    const data2 = await res2.json();
    if (res2.status === 400 && data2.message.includes("Name cannot be empty")) {
      console.log("✅ Case 2 Passed: Empty name validation rejected correctly!");
    } else {
      console.error("❌ Case 2 Failed:", res2.status, data2);
      process.exit(1);
    }

    // 7. Test Case 3: Missing Name (should fail Joi validation)
    console.log("Running Case 3: Missing name field...");
    const res3 = await fetch("http://localhost:5002/api/users/me/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `jwt=${token}`,
      },
      body: JSON.stringify({}),
    });

    const data3 = await res3.json();
    if (res3.status === 400 && data3.message.includes("Name is required")) {
      console.log("✅ Case 3 Passed: Missing name field rejected correctly!");
    } else {
      console.error("❌ Case 3 Failed:", res3.status, data3);
      process.exit(1);
    }

    // Cleanup and exit
    server.close();
    await User.deleteOne({ _id: user._id });
    console.log("Database cleaned and server closed. All tests passed successfully!");
    process.exit(0);

  } catch (err) {
    console.error("❌ Test crashed with error:", err);
    if (server) server.close();
    if (user) await User.deleteOne({ _id: user._id });
    process.exit(1);
  }
};

run();
