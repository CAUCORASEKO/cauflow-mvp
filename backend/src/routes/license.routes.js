import express from "express";
import {
  createLicense,
  getLicenses,
  getLicenseById,
  updateLicense,
  deleteLicense
} from "../controllers/license.controller.js";

const router = express.Router();

router.post("/", createLicense);
router.get("/", getLicenses);
router.get("/:id", getLicenseById);
router.patch("/:id", updateLicense);
router.delete("/:id", deleteLicense);

export default router;
