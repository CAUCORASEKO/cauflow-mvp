import express from "express";
import {
  downloadEntitlementMasterFile,
  downloadPackEntitlementAssetMasterFile,
  getEntitlements,
  getExploreFeed,
  getRoleDashboard
} from "../controllers/platform.controller.js";
import { requireAuth, requireVerifiedAccount } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/explore", getExploreFeed);
router.get("/dashboard", requireAuth, requireVerifiedAccount, getRoleDashboard);
router.get("/entitlements", requireAuth, requireVerifiedAccount, getEntitlements);
router.get(
  "/entitlements/:id/assets/:assetId/download",
  requireAuth,
  requireVerifiedAccount,
  downloadPackEntitlementAssetMasterFile
);
router.get(
  "/entitlements/:id/download",
  requireAuth,
  requireVerifiedAccount,
  downloadEntitlementMasterFile
);

export default router;
