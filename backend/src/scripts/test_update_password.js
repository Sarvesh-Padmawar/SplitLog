import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
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

    // 2. Start Server on Port 5003
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(5003, resolve));
    console.log("Test server running on port 5003.");

    // 3. Create test user with hashed password
    const hashedPassword = await bcrypt.hash("oldpassword123", 10);
    user = await User.create({
      name: "Password Tester",
      username: `test_pass_${Date.now()}`,
      email: `test_pass_${Date.now()}@test.com`,
      password: hashedPassword,
      isVerified: true,
    });
    console.log(`Created test user: ${user.name} (${user.username})`);

    // 4. Generate JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

    // 5. Test Case 1: Incorrect Current Password
    console.log("Running Case 1: Incorrect current password...");
    const res1 = await fetch("http://localhost:5003/api/users/me/password", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `jwt=${token}`,
      },
      body: JSON.stringify({
        currentPassword: "wrongpassword",
        newPassword: "newpassword123",
      }),
    });

    const data1 = await res1.json();
    if (res1.status === 400 && data1.message.includes("Incorrect current password")) {
      console.log("✅ Case 1 Passed: Incorrect password change rejected correctly.");
    } else {
      console.error("❌ Case 1 Failed:", res1.status, data1);
      process.exit(1);
    }

    // 6. Test Case 2: New Password too short (fails Joi validation)
    console.log("Running Case 2: New password too short...");
    const res2 = await fetch("http://localhost:5003/api/users/me/password", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `jwt=${token}`,
      },
      body: JSON.stringify({
        currentPassword: "oldpassword123",
        newPassword: "12345", // too short (min 6)
      }),
    });

    const data2 = await res2.json();
    if (res2.status === 400 && data2.message.includes("New password must be at least 6 characters")) {
      console.log("✅ Case 2 Passed: Short password Joi validation rejected correctly.");
    } else {
      console.error("❌ Case 2 Failed:", res2.status, data2);
      process.exit(1);
    }

    // 7. Test Case 3: Valid Password Change
    console.log("Running Case 3: Valid password change...");
    const res3 = await fetch("http://localhost:5003/api/users/me/password", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `jwt=${token}`,
      },
      body: JSON.stringify({
        currentPassword: "oldpassword123",
        newPassword: "newpassword123",
      }),
    });

    const data3 = await res3.json();
    if (res3.status === 200 && data3.message.includes("Password updated successfully")) {
      console.log("✅ Case 3 Passed: Password updated successfully.");
    } else {
      console.error("❌ Case 3 Failed:", res3.status, data3);
      process.exit(1);
    }

    // 8. Verify password in DB has indeed changed
    const dbUser = await User.findById(user._id).select("+password");
    const isNewMatch = await bcrypt.compare("newpassword123", dbUser.password);
    if (isNewMatch) {
      console.log("✅ Hashed password verified in database matches new password!");
    } else {
      console.error("❌ Database verification failed: Hashed password does not match new password.");
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
