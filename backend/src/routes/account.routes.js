import express from "express";
import {
  getAccount,
  updateBusinessSettings,
  updateLicensingDefaults,
  updateProfile,
  updateWalletSettings
} from "../controllers/account.controller.js";
import { uploadAvatarImage } from "../middleware/account-upload.middleware.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", requireAuth, getAccount);
router.patch("/profile", requireAuth, uploadAvatarImage, updateProfile);
router.patch("/business", requireAuth, updateBusinessSettings);
router.patch("/licensing-defaults", requireAuth, updateLicensingDefaults);
router.patch("/wallet", requireAuth, updateWalletSettings);

export default router;
