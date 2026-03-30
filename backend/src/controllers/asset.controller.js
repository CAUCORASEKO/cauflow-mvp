import { pool } from "../config/db.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeResponseData } from "../utils/normalize-response.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const removeUploadedFile = async (filePath) => {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`Failed to remove uploaded file: ${filePath}`, error.message);
    }
  }
};

export const uploadAsset = async (req, res) => {
  const uploadedFilePath = req.file?.path;

  try {
    const { title, description } = req.body;
    const normalizedTitle = title?.trim();

    if (!normalizedTitle) {
      await removeUploadedFile(uploadedFilePath);

      return res.status(400).json({
        message: "title is required"
      });
    }

    const imageUrl = req.file ? `/uploads/assets/${req.file.filename}` : null;

    const result = await pool.query(
      `
      INSERT INTO assets (title, description, image_url)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [normalizedTitle, description || null, imageUrl]
    );

    res.status(201).json({
      message: "Asset uploaded successfully",
      data: normalizeResponseData(result.rows[0])
    });
  } catch (error) {
    await removeUploadedFile(uploadedFilePath);

    res.status(500).json({
      message: "Error creating asset",
      error: error.message
    });
  }
};

export const getAssets = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM assets
      ORDER BY id ASC
    `);

    res.status(200).json({
      message: "Assets fetched successfully",
      data: normalizeResponseData(result.rows)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching assets",
      error: error.message
    });
  }
};

export const getAssetById = async (req, res) => {
  try {
    const assetId = Number(req.params.id);

    const result = await pool.query(
      `
      SELECT * FROM assets
      WHERE id = $1
      `,
      [assetId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Asset not found"
      });
    }

    res.status(200).json({
      message: "Asset fetched successfully",
      data: normalizeResponseData(result.rows[0])
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching asset",
      error: error.message
    });
  }
};

export const updateAsset = async (req, res) => {
  const uploadedFilePath = req.file?.path;

  try {
    const assetId = Number(req.params.id);
    const { title, description } = req.body;
    const normalizedTitle = title?.trim();

    if (!normalizedTitle) {
      await removeUploadedFile(uploadedFilePath);

      return res.status(400).json({
        message: "title is required"
      });
    }

    const existingAssetResult = await pool.query(
      `
      SELECT * FROM assets
      WHERE id = $1
      `,
      [assetId]
    );

    if (existingAssetResult.rows.length === 0) {
      await removeUploadedFile(uploadedFilePath);

      return res.status(404).json({
        message: "Asset not found"
      });
    }

    const existingAsset = existingAssetResult.rows[0];
    const nextImageUrl = req.file
      ? `/uploads/assets/${req.file.filename}`
      : existingAsset.image_url;

    const updatedAssetResult = await pool.query(
      `
      UPDATE assets
      SET title = $1, description = $2, image_url = $3
      WHERE id = $4
      RETURNING *
      `,
      [normalizedTitle, description || null, nextImageUrl, assetId]
    );

    if (req.file && existingAsset.image_url?.startsWith("/uploads/")) {
      const relativeUploadPath = existingAsset.image_url.replace(/^\//, "");
      const absoluteUploadPath = path.join(__dirname, "..", "..", relativeUploadPath);
      await removeUploadedFile(absoluteUploadPath);
    }

    res.status(200).json({
      message: "Asset updated successfully",
      data: normalizeResponseData(updatedAssetResult.rows[0])
    });
  } catch (error) {
    await removeUploadedFile(uploadedFilePath);

    res.status(500).json({
      message: "Error updating asset",
      error: error.message
    });
  }
};

export const deleteAsset = async (req, res) => {
  try {
    const assetId = Number(req.params.id);

    const result = await pool.query(
      `
      DELETE FROM assets
      WHERE id = $1
      RETURNING *
      `,
      [assetId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Asset not found"
      });
    }

    const deletedAsset = result.rows[0];

    if (deletedAsset.image_url?.startsWith("/uploads/")) {
      const relativeUploadPath = deletedAsset.image_url.replace(/^\//, "");
      const absoluteUploadPath = path.join(__dirname, "..", "..", relativeUploadPath);
      await removeUploadedFile(absoluteUploadPath);
    }

    res.status(200).json({
      message: "Asset deleted successfully",
      data: normalizeResponseData(deletedAsset)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting asset",
      error: error.message
    });
  }
};
