import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import assetRoutes from "./routes/asset.routes.js";
import licenseRoutes from "./routes/license.routes.js";
import purchaseRoutes from "./routes/purchase.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/", (req, res) => {
  res.send("CauFlow API running 🚀");
});

app.use("/api/assets", assetRoutes);
app.use("/api/licenses", licenseRoutes);
app.use("/api/purchases", purchaseRoutes);

export default app;
