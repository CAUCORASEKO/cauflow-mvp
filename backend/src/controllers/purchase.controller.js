import { pool } from "../config/db.js";
import { normalizeResponseData } from "../utils/normalize-response.js";
import { buildPurchaseSelect, fetchPurchaseById } from "../utils/commerce.js";
import { getAssetPublicationState } from "../utils/asset-delivery.js";

const resolveLicenseAvailability = (license) => {
  const sourceType = license.source_type || "asset";

  if (sourceType === "asset") {
    const publicationState = getAssetPublicationState(license);

    if (license.status !== "published" || !publicationState.buyerVisible) {
      throw new Error("This visual asset is no longer available for acquisition");
    }

    return publicationState;
  }

  if (license.status !== "published" || license.pack_status !== "published") {
    throw new Error("This pack is no longer available for acquisition");
  }

  return null;
};

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
      SELECT
        l.*,
        a.owner_user_id AS asset_owner_user_id,
        a.status AS asset_status,
        a.review_status,
        a.review_note,
        a.image_url,
        a.preview_image_url,
        a.master_file_url,
        a.master_file_name,
        a.master_mime_type,
        a.master_file_size,
        a.master_width,
        a.master_height,
        a.master_aspect_ratio,
        a.master_resolution_summary,
        p.id AS pack_id,
        p.title AS pack_title,
        p.status AS pack_status,
        p.owner_user_id AS pack_owner_user_id
      FROM licenses l
      LEFT JOIN assets a
        ON a.id = COALESCE(l.source_asset_id, l.asset_id)
      LEFT JOIN packs p
        ON p.id = l.source_pack_id
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
    const sourceType = license.source_type || "asset";

    if (license.offer_class === "free_use") {
      return res.status(409).json({
        message: "Use the free-use claim flow for this asset"
      });
    }

    try {
      resolveLicenseAvailability(license);
    } catch (availabilityError) {
      return res.status(409).json({
        message: availabilityError.message
      });
    }

    const result = await pool.query(
      `
      INSERT INTO purchases (
        license_id,
        buyer_email,
        status,
        buyer_user_id,
        creator_user_id,
        asset_id,
        pack_id,
        payment_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
      `,
      [
        numericLicenseId,
        buyerEmail || req.user.email,
        "completed",
        req.user.id,
        license.owner_user_id ||
          (sourceType === "pack" ? license.pack_owner_user_id : license.asset_owner_user_id) ||
          null,
        sourceType === "asset" ? license.source_asset_id || license.asset_id : null,
        sourceType === "pack" ? license.pack_id : null,
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

export const claimFreePurchase = async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const { licenseId } = req.body;

    if (!licenseId) {
      return res.status(400).json({
        message: "licenseId is required"
      });
    }

    const numericLicenseId = Number(licenseId);
    const licenseResult = await client.query(
      `
      SELECT
        l.*,
        a.owner_user_id AS asset_owner_user_id,
        a.status AS asset_status,
        a.review_status,
        a.review_note,
        a.image_url,
        a.preview_image_url,
        a.preview_file_name,
        a.preview_mime_type,
        a.preview_file_size,
        a.preview_width,
        a.preview_height,
        a.preview_aspect_ratio,
        a.preview_resolution_summary,
        a.master_file_url,
        a.master_file_name,
        a.master_mime_type,
        a.master_file_size,
        a.master_width,
        a.master_height,
        a.master_aspect_ratio,
        a.master_resolution_summary,
        a.offer_class AS asset_offer_class,
        p.id AS pack_id,
        p.title AS pack_title,
        p.status AS pack_status,
        p.owner_user_id AS pack_owner_user_id
      FROM licenses l
      LEFT JOIN assets a
        ON a.id = COALESCE(l.source_asset_id, l.asset_id)
      LEFT JOIN packs p
        ON p.id = l.source_pack_id
      WHERE l.id = $1
      LIMIT 1
      `,
      [numericLicenseId]
    );

    if (licenseResult.rows.length === 0) {
      return res.status(404).json({
        message: "License not found. Cannot claim free access."
      });
    }

    const license = licenseResult.rows[0];
    const sourceType = license.source_type || "asset";

    if (license.offer_class !== "free_use" || Number(license.price) !== 0) {
      return res.status(409).json({
        message: "This license is not configured as a free-use offer."
      });
    }

    if (sourceType !== "asset") {
      return res.status(409).json({
        message: "Free-use claiming is currently available only for asset offers."
      });
    }

    try {
      resolveLicenseAvailability(license);
    } catch (availabilityError) {
      return res.status(409).json({
        message: availabilityError.message
      });
    }

    const existingPurchaseResult = await client.query(
      `
      SELECT id
      FROM purchases
      WHERE buyer_user_id = $1
        AND license_id = $2
        AND acquisition_type = 'free_claim'
      ORDER BY created_at DESC, id DESC
      LIMIT 1
      `,
      [req.user.id, numericLicenseId]
    );

    if (existingPurchaseResult.rows[0]?.id) {
      const purchase = await fetchPurchaseById(client, existingPurchaseResult.rows[0].id);

      return res.status(200).json({
        message: "Free asset access already claimed",
        data: normalizeResponseData(purchase)
      });
    }

    await client.query("BEGIN");
    transactionStarted = true;

    const purchaseResult = await client.query(
      `
      INSERT INTO purchases (
        license_id,
        buyer_email,
        status,
        buyer_user_id,
        creator_user_id,
        asset_id,
        pack_id,
        payment_status,
        acquisition_type
      )
      VALUES ($1, $2, 'completed', $3, $4, $5, NULL, 'free', 'free_claim')
      RETURNING id
      `,
      [
        numericLicenseId,
        req.user.email,
        req.user.id,
        license.owner_user_id || license.asset_owner_user_id || null,
        license.source_asset_id || license.asset_id || null
      ]
    );

    await client.query(
      `
      INSERT INTO license_grants (
        purchase_id,
        buyer_user_id,
        creator_user_id,
        license_id,
        asset_id,
        pack_id,
        status,
        download_access
      )
      VALUES ($1, $2, $3, $4, $5, NULL, 'active', false)
      `,
      [
        purchaseResult.rows[0].id,
        req.user.id,
        license.owner_user_id || license.asset_owner_user_id || null,
        numericLicenseId,
        license.source_asset_id || license.asset_id || null
      ]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    const purchase = await fetchPurchaseById(client, purchaseResult.rows[0].id);

    res.status(201).json({
      message: "Free asset access claimed successfully",
      data: normalizeResponseData(purchase)
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    res.status(500).json({
      message: "Error claiming free asset access",
      error: error.message
    });
  } finally {
    client.release();
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
