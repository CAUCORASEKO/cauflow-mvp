import express from "express";
import {
  getAdminCatalog,
  getAdminCommerce,
  getAdminOverview,
  getAdminReviewQueue,
  getAdminUsers
} from "../controllers/admin.controller.js";
import { requireAuth, requireRole, requireVerifiedAccount } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(requireAuth, requireVerifiedAccount, requireRole("admin"));

router.get("/overview", getAdminOverview);
router.get("/review-queue", getAdminReviewQueue);
router.get("/catalog", getAdminCatalog);
router.get("/users", getAdminUsers);
router.get("/commerce", getAdminCommerce);

export default router;
