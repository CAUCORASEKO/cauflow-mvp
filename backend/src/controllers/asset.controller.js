import { pool } from "../config/db.js";
import fs from "fs/promises";
import { normalizeResponseData } from "../utils/normalize-response.js";

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
