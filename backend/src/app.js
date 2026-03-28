import express from "express";
import cors from "cors";
import assetRoutes from "./routes/asset.routes.js";
import licenseRoutes from "./routes/license.routes.js";
import purchaseRoutes from "./routes/purchase.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("CauFlow API running 🚀");
});

app.use("/api/assets", assetRoutes);
app.use("/api/licenses", licenseRoutes);
app.use("/api/purchases", purchaseRoutes);

export default app;