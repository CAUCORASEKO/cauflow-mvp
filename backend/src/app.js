import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import assetRoutes from "./routes/asset.routes.js";
import licenseRoutes from "./routes/license.routes.js";
import purchaseRoutes from "./routes/purchase.routes.js";
import packRoutes from "./routes/pack.routes.js";
import authRoutes from "./routes/auth.routes.js";
import accountRoutes from "./routes/account.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import platformRoutes from "./routes/platform.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { attachCurrentUser } from "./middleware/auth.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(cors());
app.use(express.json());
app.use(attachCurrentUser);
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/", (req, res) => {
  res.send("CauFlow API running 🚀");
});

app.use("/api/auth", authRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/platform", platformRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/licenses", licenseRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/packs", packRoutes);

export default app;
