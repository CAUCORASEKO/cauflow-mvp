import express from "express";
import {
  createLicense,
  getLicenses,
  getLicenseById,
  updateLicense,
  deleteLicense
} from "../controllers/license.controller.js";
import {
  requireAuth,
  requireCreatorOrAdmin,
  requireVerifiedAccount
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", requireAuth, requireVerifiedAccount, requireCreatorOrAdmin, createLicense);
router.get("/", getLicenses);
router.get("/:id", getLicenseById);
router.patch("/:id", requireAuth, requireVerifiedAccount, requireCreatorOrAdmin, updateLicense);
router.delete("/:id", requireAuth, requireVerifiedAccount, requireCreatorOrAdmin, deleteLicense);

export default router;
