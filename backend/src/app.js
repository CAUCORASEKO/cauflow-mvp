import express from "express";
import cors from "cors";
import assetRoutes from "./routes/asset.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("CauFlow API running 🚀");
});

app.use("/api/assets", assetRoutes);

export default app;