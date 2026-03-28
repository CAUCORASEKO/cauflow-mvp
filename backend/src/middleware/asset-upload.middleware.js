import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDirectory = path.join(__dirname, "..", "..", "uploads", "assets");
const allowedMimeTypePrefix = "image/";

fs.mkdirSync(uploadsDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDirectory);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname) || "";
    const sanitizedBaseName = path
      .basename(file.originalname, extension)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${sanitizedBaseName || "asset"}-${uniqueSuffix}${extension}`;

    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith(allowedMimeTypePrefix)) {
    const error = new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname);
    error.message = "Only image uploads are allowed";
    return cb(error);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

export const uploadAssetImage = (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          message: "Image upload failed",
          error: "Image size must be 5MB or less"
        });
      }

      return res.status(400).json({
        message: "Image upload failed",
        error: error.message || "Invalid image upload"
      });
    }

    return res.status(400).json({
      message: "Image upload failed",
      error: error.message || "Invalid image upload"
    });
  });
};
