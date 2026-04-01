import express from "express";
import {
  completeCheckoutSession,
  createCheckoutSession
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
router.post(
  "/checkout-sessions/:id/complete",
  requireAuth,
  requireVerifiedAccount,
  requireRole("buyer", "admin"),
  completeCheckoutSession
);

export default router;
