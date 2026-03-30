import { pool } from "../config/db.js";
import { normalizeResponseData } from "../utils/normalize-response.js";

export const createPurchase = async (req, res) => {
  try {
    const { licenseId, buyerEmail } = req.body;

    if (!licenseId || !buyerEmail) {
      return res.status(400).json({
        message: "licenseId and buyerEmail are required"
      });
    }

    const numericLicenseId = Number(licenseId);

    const licenseResult = await pool.query(
      `
      SELECT * FROM licenses
      WHERE id = $1
      `,
      [numericLicenseId]
    );

    if (licenseResult.rows.length === 0) {
      return res.status(404).json({
        message: "License not found. Cannot create purchase."
      });
    }

    const result = await pool.query(
      `
      INSERT INTO purchases (license_id, buyer_email, status)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [numericLicenseId, buyerEmail, "completed"]
    );

    res.status(201).json({
      message: "Purchase created successfully",
      data: normalizeResponseData(result.rows[0])
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating purchase",
      error: error.message
    });
  }
};

export const getPurchases = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM purchases
      ORDER BY id ASC
    `);

    res.status(200).json({
      message: "Purchases fetched successfully",
      data: normalizeResponseData(result.rows)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching purchases",
      error: error.message
    });
  }
};

export const getPurchaseById = async (req, res) => {
  try {
    const purchaseId = Number(req.params.id);

    const result = await pool.query(
      `
      SELECT * FROM purchases
      WHERE id = $1
      `,
      [purchaseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Purchase not found"
      });
    }

    res.status(200).json({
      message: "Purchase fetched successfully",
      data: normalizeResponseData(result.rows[0])
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching purchase",
      error: error.message
    });
  }
};

export const updatePurchase = async (req, res) => {
  try {
    const purchaseId = Number(req.params.id);
    const { buyerEmail, status } = req.body;

    if (!buyerEmail) {
      return res.status(400).json({
        message: "buyerEmail is required"
      });
    }

    const result = await pool.query(
      `
      UPDATE purchases
      SET buyer_email = $1, status = COALESCE($2, status)
      WHERE id = $3
      RETURNING *
      `,
      [buyerEmail, status || null, purchaseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Purchase not found"
      });
    }

    res.status(200).json({
      message: "Purchase updated successfully",
      data: normalizeResponseData(result.rows[0])
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating purchase",
      error: error.message
    });
  }
};

export const deletePurchase = async (req, res) => {
  try {
    const purchaseId = Number(req.params.id);

    const result = await pool.query(
      `
      DELETE FROM purchases
      WHERE id = $1
      RETURNING *
      `,
      [purchaseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Purchase not found"
      });
    }

    res.status(200).json({
      message: "Purchase deleted successfully",
      data: normalizeResponseData(result.rows[0])
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting purchase",
      error: error.message
    });
  }
};
