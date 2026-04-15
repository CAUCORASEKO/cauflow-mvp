import express from "express";
import {
  claimFreePurchase,
  createPurchase,
  getPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase
} from "../controllers/purchase.controller.js";
import { requireAuth, requireRole, requireVerifiedAccount } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", requireAuth, requireVerifiedAccount, requireRole("buyer", "admin"), createPurchase);
router.post(
  "/free-claims",
  requireAuth,
  requireVerifiedAccount,
  requireRole("buyer", "admin"),
  claimFreePurchase
);
router.get("/", requireAuth, requireVerifiedAccount, getPurchases);
router.get("/:id", requireAuth, requireVerifiedAccount, getPurchaseById);
router.patch("/:id", requireAuth, requireVerifiedAccount, updatePurchase);
router.delete("/:id", requireAuth, requireVerifiedAccount, deletePurchase);

export default router;
