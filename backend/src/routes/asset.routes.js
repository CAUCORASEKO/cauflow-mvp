import express from "express";
import {
  uploadAsset,
  getAssets,
  getAssetById,
  updateAsset,
  deleteAsset
} from "../controllers/asset.controller.js";
import { uploadAssetImage } from "../middleware/asset-upload.middleware.js";

const router = express.Router();

router.post("/", uploadAssetImage, uploadAsset);
router.get("/", getAssets);
router.get("/:id", getAssetById);
router.patch("/:id", uploadAssetImage, updateAsset);
router.delete("/:id", deleteAsset);

export default router;
