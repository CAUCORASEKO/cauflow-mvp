import { pool } from "../config/db.js";
import { normalizeResponseData } from "../utils/normalize-response.js";

const PAYMENT_STATUSES = new Set(["pending", "paid", "failed", "refunded", "canceled"]);

const fetchPaymentRecordById = async (db, paymentRecordId) => {
  const result = await db.query(
    `
    SELECT *
    FROM payment_records
    WHERE id = $1
    LIMIT 1
    `,
    [paymentRecordId]
  );

  return result.rows[0] || null;
};

const fetchCreatorPayoutStatus = async (db, creatorUserId) => {
  const result = await db.query(
    `
    SELECT payout_onboarding_status
    FROM creator_settings
    WHERE user_id = $1
    LIMIT 1
    `,
    [creatorUserId]
  );

  return result.rows[0]?.payout_onboarding_status || "not_started";
};

export const createCheckoutSession = async (req, res) => {
  const client = await pool.connect();

  try {
    const { assetId, packId, licenseId } = req.body;

    if (!licenseId || (!assetId && !packId)) {
      return res.status(400).json({
        message: "licenseId and either assetId or packId are required"
      });
    }

    const licenseResult = await client.query(
      `
      SELECT l.*, a.owner_user_id AS asset_owner_user_id
      FROM licenses l
      JOIN assets a
        ON a.id = l.asset_id
      WHERE l.id = $1
      LIMIT 1
      `,
      [Number(licenseId)]
    );

    if (licenseResult.rows.length === 0) {
      return res.status(404).json({
        message: "License template not found"
      });
    }

    const license = licenseResult.rows[0];
    const creatorUserId = license.owner_user_id || license.asset_owner_user_id;

    if (!creatorUserId) {
      return res.status(409).json({
        message: "The selected license is not linked to a payable creator account"
      });
    }

    const payoutStatus = await fetchCreatorPayoutStatus(client, creatorUserId);
    if (payoutStatus !== "active") {
      return res.status(409).json({
        message: "This creator has not completed payout onboarding yet"
      });
    }

    const providerSessionId = `stripe_connect_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const paymentResult = await client.query(
      `
      INSERT INTO payment_records (
        buyer_user_id,
        creator_user_id,
        asset_id,
        pack_id,
        license_id,
        provider_session_id,
        amount,
        currency,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING *
      `,
      [
        req.user.id,
        creatorUserId,
        assetId ? Number(assetId) : null,
        packId ? Number(packId) : null,
        Number(licenseId),
        providerSessionId,
        Number(license.price),
        req.user.preferredCurrency || "USD"
      ]
    );

    res.status(201).json({
      message: "Checkout session created successfully",
      data: normalizeResponseData({
        ...paymentResult.rows[0],
        checkoutUrl: `/app/checkout/${paymentResult.rows[0].id}`
      })
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating checkout session",
      error: error.message
    });
  } finally {
    client.release();
  }
};

export const completeCheckoutSession = async (req, res) => {
  const client = await pool.connect();

  try {
    const paymentRecordId = Number(req.params.id);
    const { status = "paid" } = req.body;

    if (!PAYMENT_STATUSES.has(status)) {
      return res.status(400).json({
        message: "Invalid payment status"
      });
    }

    const paymentRecord = await fetchPaymentRecordById(client, paymentRecordId);

    if (!paymentRecord) {
      return res.status(404).json({
        message: "Checkout session not found"
      });
    }

    if (paymentRecord.buyer_user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        message: "You do not have permission to complete this checkout session"
      });
    }

    await client.query("BEGIN");

    await client.query(
      `
      UPDATE payment_records
      SET status = $1,
          updated_at = CURRENT_TIMESTAMP,
          receipt_url = CASE
            WHEN $1 = 'paid' THEN CONCAT('/receipts/', provider_session_id)
            ELSE receipt_url
          END
      WHERE id = $2
      `,
      [status, paymentRecordId]
    );

    let purchase = null;
    let grantedLicense = null;

    if (status === "paid") {
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
          payment_status
        )
        VALUES ($1, $2, 'completed', $3, $4, $5, $6, 'paid')
        RETURNING *
        `,
        [
          paymentRecord.license_id,
          req.user.email,
          req.user.id,
          paymentRecord.creator_user_id,
          paymentRecord.asset_id,
          paymentRecord.pack_id
        ]
      );

      purchase = purchaseResult.rows[0];

      const grantResult = await client.query(
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
        VALUES ($1, $2, $3, $4, $5, $6, 'active', true)
        RETURNING *
        `,
        [
          purchase.id,
          req.user.id,
          paymentRecord.creator_user_id,
          paymentRecord.license_id,
          paymentRecord.asset_id,
          paymentRecord.pack_id
        ]
      );

      grantedLicense = grantResult.rows[0];

      await client.query(
        `
        UPDATE payment_records
        SET purchase_id = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        `,
        [purchase.id, paymentRecordId]
      );
    }

    await client.query("COMMIT");

    const updatedPaymentRecord = await fetchPaymentRecordById(client, paymentRecordId);

    res.status(200).json({
      message: "Checkout session updated successfully",
      data: normalizeResponseData({
        payment: updatedPaymentRecord,
        purchase,
        grantedLicense
      })
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({
      message: "Error completing checkout session",
      error: error.message
    });
  } finally {
    client.release();
  }
};
