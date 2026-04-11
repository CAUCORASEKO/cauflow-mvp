import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import {
  ALLOWED_ASSET_EXTENSIONS_LABEL,
  ALLOWED_ASSET_MIME_TYPES
} from "../utils/asset-delivery.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDirectory = path.join(__dirname, "..", "..", "uploads", "assets");
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
  if (!ALLOWED_ASSET_MIME_TYPES.has(file.mimetype)) {
    const error = new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname);
    error.message = `Only ${ALLOWED_ASSET_EXTENSIONS_LABEL} uploads are allowed`;
    return cb(error);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

export const uploadAssetImage = (req, res, next) => {
  upload.fields([
    { name: "previewImage", maxCount: 1 },
    { name: "masterFile", maxCount: 1 },
    { name: "image", maxCount: 1 }
  ])(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          message: "Asset upload failed",
          error: "Asset files must be 25MB or less"
        });
      }

      return res.status(400).json({
        message: "Asset upload failed",
        error: error.message || "Invalid asset upload"
      });
    }

    return res.status(400).json({
      message: "Asset upload failed",
      error: error.message || "Invalid asset upload"
    });
  });
};
