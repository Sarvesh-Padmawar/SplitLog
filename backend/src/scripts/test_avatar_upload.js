import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.model.js";
import * as userService from "../modules/users/user.service.js";
import cloudinary from "../config/cloudinary.js";

dotenv.config();

const run = async () => {
  let user;

  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    // 2. Verify User model schema contains avatar
    user = await User.create({
      name: "Avatar Tester",
      username: `avatar_tester_${Date.now()}`,
      email: `avatar_tester_${Date.now()}@test.com`,
      isVerified: true,
    });

    console.log("✅ User schema validated. Default avatar details:", JSON.stringify(user.avatar));

    if (!user.avatar || user.avatar.url !== "" || user.avatar.publicId !== "") {
      console.error("❌ Schema assertion failed: default values are incorrect.");
      process.exit(1);
    }

    // 3. Mock Cloudinary uploads to test the service logic deterministically
    const originalDestroy = cloudinary.uploader.destroy;
    const originalUploadStream = cloudinary.uploader.upload_stream;

    let destroyCalledWith = null;
    let uploadStreamCalled = false;

    // Spy/Mock destroy
    cloudinary.uploader.destroy = async (publicId) => {
      destroyCalledWith = publicId;
      return { result: "ok" };
    };

    // Spy/Mock upload_stream
    cloudinary.uploader.upload_stream = (options, callback) => {
      uploadStreamCalled = true;
      // We simulate a successful Cloudinary response
      const mockResult = {
        secure_url: "https://res.cloudinary.com/demo/image/upload/v123/splitlog/avatars/new_pic.png",
        public_id: "splitlog/avatars/new_pic_id",
      };
      
      // Delay callback slightly to mock network async stream
      setTimeout(() => callback(null, mockResult), 50);

      // Return a mock write stream
      return {
        end: (buffer) => {
          console.log("[Mock Cloudinary] upload_stream buffer ended. Length:", buffer.length);
        }
      };
    };

    // 4. Test Case 1: Upload avatar
    console.log("Running Case 1: Uploading new avatar...");
    const mockBuffer = Buffer.from("fake-image-bytes-jpeg-data");
    const result1 = await userService.updateAvatar(user._id, mockBuffer);

    console.log("Mock upload result:", JSON.stringify(result1.avatar));

    if (
      uploadStreamCalled &&
      result1.avatar.url === "https://res.cloudinary.com/demo/image/upload/v123/splitlog/avatars/new_pic.png" &&
      result1.avatar.publicId === "splitlog/avatars/new_pic_id"
    ) {
      console.log("✅ Case 1 Passed: Avatar uploaded and saved to DB correctly.");
    } else {
      console.error("❌ Case 1 Failed: Upload result mismatched.");
      process.exit(1);
    }

    // 5. Test Case 2: Upload another avatar (replacing existing)
    console.log("Running Case 2: Replacing existing avatar...");
    uploadStreamCalled = false;
    
    // Setup a new mock result for second upload
    cloudinary.uploader.upload_stream = (options, callback) => {
      uploadStreamCalled = true;
      const mockResult = {
        secure_url: "https://res.cloudinary.com/demo/image/upload/v123/splitlog/avatars/new_pic_2.png",
        public_id: "splitlog/avatars/new_pic_id_2",
      };
      setTimeout(() => callback(null, mockResult), 50);
      return { end: (buf) => {} };
    };

    const result2 = await userService.updateAvatar(user._id, mockBuffer);

    console.log("Mock replace result:", JSON.stringify(result2.avatar));
    console.log("Destroy called with old publicId:", destroyCalledWith);

    if (
      destroyCalledWith === "splitlog/avatars/new_pic_id" &&
      uploadStreamCalled &&
      result2.avatar.url === "https://res.cloudinary.com/demo/image/upload/v123/splitlog/avatars/new_pic_2.png" &&
      result2.avatar.publicId === "splitlog/avatars/new_pic_id_2"
    ) {
      console.log("✅ Case 2 Passed: Old avatar deleted from Cloudinary and new metadata updated.");
    } else {
      console.error("❌ Case 2 Failed: Replace logic validation failed.");
      process.exit(1);
    }

    // Restore original functions
    cloudinary.uploader.destroy = originalDestroy;
    cloudinary.uploader.upload_stream = originalUploadStream;

    // Cleanup
    await User.deleteOne({ _id: user._id });
    console.log("Database cleaned. All mock integration tests passed successfully!");
    process.exit(0);

  } catch (err) {
    console.error("❌ Test crashed with error:", err);
    if (user) await User.deleteOne({ _id: user._id });
    process.exit(1);
  }
};

run();
