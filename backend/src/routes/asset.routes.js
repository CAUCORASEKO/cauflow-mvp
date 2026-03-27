import express from "express";
import {
  uploadAsset,
  getAssets,
  getAssetById
} from "../controllers/asset.controller.js";

const router = express.Router();

router.post("/", uploadAsset);
router.get("/", getAssets);
router.get("/:id", getAssetById);

export default router;