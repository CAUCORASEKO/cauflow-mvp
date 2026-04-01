import express from "express";
import {
  getCurrentSession,
  logIn,
  logOut,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  signUp,
  verifyEmail
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signUp);
router.post("/login", logIn);
router.post("/logout", logOut);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);
router.get("/me", requireAuth, getCurrentSession);

export default router;
