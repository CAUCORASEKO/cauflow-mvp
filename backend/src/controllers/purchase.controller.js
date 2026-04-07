import { pool } from "../config/db.js";
import { normalizeResponseData } from "../utils/normalize-response.js";
import { buildPurchaseSelect, fetchPurchaseById } from "../utils/commerce.js";

export const createPurchase = async (req, res) => {
  try {
    const { licenseId, buyerEmail } = req.body;

    if (!licenseId) {
      return res.status(400).json({
        message: "licenseId is required"
      });
    }

    const numericLicenseId = Number(licenseId);

    const licenseResult = await pool.query(
      `
      SELECT l.*, a.owner_user_id AS asset_owner_user_id
      FROM licenses l
      JOIN assets a
        ON a.id = l.asset_id
      WHERE l.id = $1
      `,
      [numericLicenseId]
    );

    if (licenseResult.rows.length === 0) {
      return res.status(404).json({
        message: "License not found. Cannot create purchase."
      });
    }

    const license = licenseResult.rows[0];

    const result = await pool.query(
      `
      INSERT INTO purchases (
        license_id,
        buyer_email,
        status,
        buyer_user_id,
        creator_user_id,
        asset_id,
        payment_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
      `,
      [
        numericLicenseId,
        buyerEmail || req.user.email,
        "completed",
        req.user.id,
        license.owner_user_id || license.asset_owner_user_id || null,
        license.asset_id,
        "paid"
      ]
    );

    const purchase = await fetchPurchaseById(pool, result.rows[0].id);

    res.status(201).json({
      message: "Purchase created successfully",
      data: normalizeResponseData(purchase)
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
    const result =
      req.user.role === "admin"
        ? await pool.query(`
            ${buildPurchaseSelect()}
            ORDER BY p.id ASC
          `)
        : req.user.role === "creator"
          ? await pool.query(
              `
              ${buildPurchaseSelect("p.creator_user_id = $1")}
              ORDER BY p.id ASC
              `,
              [req.user.id]
            )
          : await pool.query(
              `
              ${buildPurchaseSelect("p.buyer_user_id = $1")}
              ORDER BY p.id ASC
              `,
              [req.user.id]
            );

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
    const purchase = await fetchPurchaseById(pool, purchaseId);

    if (
      !purchase ||
      (req.user.role !== "admin" &&
        purchase.buyer_user_id !== req.user.id &&
        purchase.creator_user_id !== req.user.id)
    ) {
      return res.status(404).json({
        message: "Purchase not found"
      });
    }

    res.status(200).json({
      message: "Purchase fetched successfully",
      data: normalizeResponseData(purchase)
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
        AND ($4 = 'admin' OR buyer_user_id = $5)
      RETURNING id
      `,
      [buyerEmail, status || null, purchaseId, req.user.role, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Purchase not found"
      });
    }

    res.status(200).json({
      message: "Purchase updated successfully",
      data: normalizeResponseData(await fetchPurchaseById(pool, result.rows[0].id))
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
        AND ($2 = 'admin' OR buyer_user_id = $3)
      RETURNING *
      `,
      [purchaseId, req.user.role, req.user.id]
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
