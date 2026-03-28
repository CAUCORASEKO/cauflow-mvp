import { pool } from "../config/db.js";

export const createLicense = async (req, res) => {
  try {
    const { assetId, type, price, usage } = req.body;

    if (!assetId || !type || price === undefined || !usage) {
      return res.status(400).json({
        message: "assetId, type, price and usage are required"
      });
    }

    const numericAssetId = Number(assetId);

    const assetResult = await pool.query(
      `
      SELECT * FROM assets
      WHERE id = $1
      `,
      [numericAssetId]
    );

    if (assetResult.rows.length === 0) {
      return res.status(404).json({
        message: "Asset not found. Cannot create license."
      });
    }

    const result = await pool.query(
      `
      INSERT INTO licenses (asset_id, type, price, usage)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [numericAssetId, type, price, usage]
    );

    res.status(201).json({
      message: "License created successfully",
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating license",
      error: error.message
    });
  }
};

export const getLicenses = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM licenses
      ORDER BY id ASC
    `);

    res.status(200).json({
      message: "Licenses fetched successfully",
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching licenses",
      error: error.message
    });
  }
};

export const getLicenseById = async (req, res) => {
  try {
    const licenseId = Number(req.params.id);

    const result = await pool.query(
      `
      SELECT * FROM licenses
      WHERE id = $1
      `,
      [licenseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "License not found"
      });
    }

    res.status(200).json({
      message: "License fetched successfully",
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching license",
      error: error.message
    });
  }
};