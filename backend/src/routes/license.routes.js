import express from "express";
import {
  createLicense,
  getLicenses,
  getLicenseById
} from "../controllers/license.controller.js";

const router = express.Router();

router.post("/", createLicense);
router.get("/", getLicenses);
router.get("/:id", getLicenseById);

export default router;