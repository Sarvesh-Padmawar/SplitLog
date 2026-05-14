import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 6,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      // Not required because Google users do not have a password
      minlength: 6,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // allows multiple nulls
    },
    isProfileComplete: {
      type: Boolean,
      default: true, // true for normal users, false for new Google users
    },
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    // ── Email Verification ──────────────────────────────────────────────────
    // Flag set to true only after the user clicks the verification link.
    isVerified: {
      type: Boolean,
      default: false,
    },
    // SHA-256 hash of the raw token sent in the email.
    // We never store the raw token — only its hash (same principle as passwords).
    // select: false ensures it is never returned in regular queries.
    verificationToken: {
      type: String,
      select: false,
    },
    // Verification links expire after 15 minutes.
    verificationTokenExpiry: {
      type: Date,
      select: false,
    },

    // ── Password Reset ──────────────────────────────────────────────────────
    // SHA-256 hash of the raw token sent in the password reset email.
    resetPasswordToken: {
      type: String,
      select: false,
    },
    // Reset links expire after 15 minutes.
    resetPasswordExpiry: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;