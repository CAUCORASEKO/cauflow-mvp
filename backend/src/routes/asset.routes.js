import express from "express";
import { uploadAsset } from "../controllers/asset.controller.js";

const router = express.Router();

router.post("/", uploadAsset);

export default router;