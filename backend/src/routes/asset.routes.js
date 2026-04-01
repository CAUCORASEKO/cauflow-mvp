import express from "express";
import {
  uploadAsset,
  getAssets,
  getAssetById,
  updateAsset,
  deleteAsset
} from "../controllers/asset.controller.js";
import { uploadAssetImage } from "../middleware/asset-upload.middleware.js";
import {
  requireAuth,
  requireCreatorOrAdmin,
  requireVerifiedAccount
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", requireAuth, requireVerifiedAccount, requireCreatorOrAdmin, uploadAssetImage, uploadAsset);
router.get("/", getAssets);
router.get("/:id", getAssetById);
router.patch("/:id", requireAuth, requireVerifiedAccount, requireCreatorOrAdmin, uploadAssetImage, updateAsset);
router.delete("/:id", requireAuth, requireVerifiedAccount, requireCreatorOrAdmin, deleteAsset);

export default router;
