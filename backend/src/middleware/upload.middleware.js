import multer from "multer";
import { ApiError } from "../utils/ApiError.js";

// Use memory storage to process uploads in-memory
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, "Invalid file type. Only JPEG, JPG, PNG, and WEBP images are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Wrapper middleware to handle Multer specific errors (e.g. limit exceeded)
export const uploadAvatarMiddleware = (req, res, next) => {
  const singleUpload = upload.single("avatar");
  
  singleUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new ApiError(400, "File is too large. Maximum size allowed is 5MB."));
      }
      return next(new ApiError(400, `Upload error: ${err.message}`));
    } else if (err) {
      return next(err);
    }
    next();
  });
};
