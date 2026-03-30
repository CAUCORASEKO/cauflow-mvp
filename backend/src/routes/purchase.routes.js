import express from "express";
import {
  createPurchase,
  getPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase
} from "../controllers/purchase.controller.js";

const router = express.Router();

router.post("/", createPurchase);
router.get("/", getPurchases);
router.get("/:id", getPurchaseById);
router.patch("/:id", updatePurchase);
router.delete("/:id", deletePurchase);

export default router;
