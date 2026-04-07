import express from "express";
import {
  completeCheckoutSession,
  createCheckoutSession,
  getCheckoutSession
} from "../controllers/payment.controller.js";
import { requireAuth, requireRole, requireVerifiedAccount } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/checkout-sessions",
  requireAuth,
  requireVerifiedAccount,
  requireRole("buyer", "admin"),
  createCheckoutSession
);
router.get(
  "/checkout-sessions/:id",
  requireAuth,
  requireVerifiedAccount,
  requireRole("buyer", "admin"),
  getCheckoutSession
);
router.post(
  "/checkout-sessions/:id/complete",
  requireAuth,
  requireVerifiedAccount,
  requireRole("buyer", "admin"),
  completeCheckoutSession
);

export default router;
