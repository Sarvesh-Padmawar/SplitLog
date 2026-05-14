import jwt from "jsonwebtoken";
import User from "../../models/User.model.js";

/**
 * Verifies the JWT from the HTTP-only cookie and attaches the user ID to the request.
 */
export const protect = (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/**
 * Ensures that the authenticated user has completed their profile (set a username).
 * Returns 403 if incomplete.
 */
export const ensureProfileComplete = async (req, res, next) => {
  try {
    const user = await User.findById(req.user);
    if (!user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }
    
    if (user.provider === "google" && user.isProfileComplete === false) {
      return res.status(403).json({ 
        message: "Profile incomplete. Please set a username.",
        isProfileComplete: false
      });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};
