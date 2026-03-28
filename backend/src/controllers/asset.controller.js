import { pool } from "../config/db.js";

export const uploadAsset = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({
        message: "title is required"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO assets (title, description)
      VALUES ($1, $2)
      RETURNING *
      `,
      [title, description || null]
    );

    res.status(201).json({
      message: "Asset uploaded successfully",
      data: result.rows[0]
    });
  } catch (error) {
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
      data: result.rows
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
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching asset",
      error: error.message
    });
  }
};