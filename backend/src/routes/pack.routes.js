import express from "express";
import {
  createPack,
  deletePack,
  getPackById,
  getPacks,
  updatePack
} from "../controllers/pack.controller.js";
import {
  requireAuth,
  requireCreatorOrAdmin,
  requireVerifiedAccount
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", requireAuth, requireVerifiedAccount, requireCreatorOrAdmin, createPack);
router.get("/", getPacks);
router.get("/:id", getPackById);
router.patch("/:id", requireAuth, requireVerifiedAccount, requireCreatorOrAdmin, updatePack);
router.delete("/:id", requireAuth, requireVerifiedAccount, requireCreatorOrAdmin, deletePack);

export default router;
