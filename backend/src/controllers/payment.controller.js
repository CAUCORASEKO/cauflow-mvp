import { pool } from "../config/db.js";
import { normalizeResponseData } from "../utils/normalize-response.js";
import {
  PAYMENT_STATUSES,
  fetchCheckoutSessionById,
  fetchCreatorPayoutStatus,
  fetchPurchaseById
} from "../utils/commerce.js";
import { getAssetPublicationState } from "../utils/asset-delivery.js";

const VALID_PAYMENT_STATUSES = new Set(PAYMENT_STATUSES);

const getCheckoutOffering = async (db, { assetId, packId, licenseId }) => {
  if (packId) {
    const result = await db.query(
      `
      SELECT
        p.id AS pack_id,
        p.title AS pack_title,
        p.description AS pack_description,
        p.price AS pack_price,
        p.status AS pack_status,
        p.license_id AS pack_license_id,
        p.owner_user_id AS pack_owner_user_id,
        l.id AS license_id,
        l.asset_id AS license_asset_id,
        l.source_type AS license_source_type,
        l.source_asset_id AS license_source_asset_id,
        l.source_pack_id AS license_source_pack_id,
        l.type AS license_type,
        l.price AS license_price,
        l.usage AS license_usage,
        l.offer_class AS license_offer_class,
        l.status AS license_status,
        l.owner_user_id AS license_owner_user_id
      FROM packs p
      LEFT JOIN licenses l
        ON l.id = $2
      WHERE p.id = $1
      LIMIT 1
      `,
      [Number(packId), Number(licenseId)]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const pack = result.rows[0];

    if (pack.pack_status !== "published") {
      throw new Error("This pack is no longer available in the marketplace");
    }

    if (!pack.license_id) {
      throw new Error("This pack does not have an attached license offer yet");
    }

    if (pack.pack_license_id !== Number(licenseId)) {
      throw new Error("The selected pack license is no longer available");
    }

    if (pack.license_status !== "published") {
      throw new Error("The selected pack license is no longer available");
    }

    if (
      pack.license_source_type === "pack" &&
      pack.license_source_pack_id !== Number(packId)
    ) {
      throw new Error("The selected pack license is no longer available");
    }

    return {
      type: "pack",
      assetId:
        pack.license_source_type === "asset"
          ? pack.license_source_asset_id || pack.license_asset_id || null
          : null,
      packId: pack.pack_id,
      title: pack.pack_title,
      description: pack.pack_description,
      creatorUserId: pack.pack_owner_user_id || pack.license_owner_user_id || null,
      license: {
        id: pack.license_id,
        assetId: pack.license_source_asset_id || pack.license_asset_id,
        sourceType: pack.license_source_type || "asset",
        sourcePackId: pack.license_source_pack_id,
        type: pack.license_type,
        price: Number(pack.pack_price),
        usage: pack.license_usage,
        offerClass: pack.license_offer_class || "premium"
      }
    };
  }

  const result = await db.query(
    `
    SELECT
      a.id AS asset_id,
      a.title AS asset_title,
      a.description AS asset_description,
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
      a.owner_user_id AS asset_owner_user_id,
      l.id AS license_id,
      l.asset_id AS license_asset_id,
      l.source_type AS license_source_type,
      l.source_asset_id AS license_source_asset_id,
      l.source_pack_id AS license_source_pack_id,
      l.type AS license_type,
      l.price AS license_price,
      l.usage AS license_usage,
      l.offer_class AS license_offer_class,
      l.status AS license_status,
      l.owner_user_id AS license_owner_user_id
    FROM licenses l
    JOIN assets a
      ON a.id = l.asset_id
    WHERE l.id = $1
    LIMIT 1
    `,
    [Number(licenseId)]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const assetLicense = result.rows[0];

  if (
    assetId &&
    Number(assetLicense.license_source_asset_id || assetLicense.license_asset_id || assetLicense.asset_id) !==
      Number(assetId)
  ) {
    throw new Error("The selected license does not belong to this asset");
  }

  const publicationState = getAssetPublicationState(assetLicense);

  if (!publicationState.buyerVisible || assetLicense.license_status !== "published") {
    throw new Error("This visual asset is no longer available for licensing");
  }

  return {
    type: "asset",
    assetId: assetLicense.asset_id,
    packId: null,
    title: assetLicense.asset_title,
    description: assetLicense.asset_description,
    creatorUserId: assetLicense.license_owner_user_id || assetLicense.asset_owner_user_id || null,
    license: {
      id: assetLicense.license_id,
      assetId: assetLicense.license_source_asset_id || assetLicense.license_asset_id,
      sourceType: assetLicense.license_source_type || "asset",
      sourcePackId: assetLicense.license_source_pack_id,
      type: assetLicense.license_type,
      price: Number(assetLicense.license_price),
      usage: assetLicense.license_usage,
      offerClass: assetLicense.license_offer_class || "premium"
    }
  };
};

export const getCheckoutSession = async (req, res) => {
  try {
    const checkoutSession = await fetchCheckoutSessionById(pool, Number(req.params.id));

    if (!checkoutSession) {
      return res.status(404).json({
        message: "Checkout session not found"
      });
    }

    if (checkoutSession.buyer_user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        message: "You do not have permission to view this checkout session"
      });
    }

    res.status(200).json({
      message: "Checkout session fetched successfully",
      data: normalizeResponseData(checkoutSession)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching checkout session",
      error: error.message
    });
  }
};

export const createCheckoutSession = async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const { assetId, packId, licenseId } = req.body;

    if (!licenseId || (!assetId && !packId)) {
      return res.status(400).json({
        message: "licenseId and either assetId or packId are required"
      });
    }

    const offering = await getCheckoutOffering(client, {
      assetId,
      packId,
      licenseId
    });

    if (!offering) {
      return res.status(404).json({
        message: "Selected offer could not be found"
      });
    }

    if (offering.license.offerClass === "free_use") {
      return res.status(409).json({
        message: "Use the free-use claim flow for zero-cost offers."
      });
    }

    const creatorUserId = offering.creatorUserId;

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
        payment_status
      )
      VALUES ($1, $2, 'pending', $3, $4, $5, $6, 'pending')
      RETURNING id
      `,
      [
        offering.license.id,
        req.user.email,
        req.user.id,
        creatorUserId,
        offering.assetId,
        offering.packId
      ]
    );

    const providerSessionId = `stripe_connect_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const paymentResult = await client.query(
      `
      INSERT INTO payment_records (
        buyer_user_id,
        creator_user_id,
        asset_id,
        pack_id,
        license_id,
        purchase_id,
        provider_session_id,
        amount,
        currency,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
      RETURNING *
      `,
      [
        req.user.id,
        creatorUserId,
        offering.assetId,
        offering.packId,
        offering.license.id,
        purchaseResult.rows[0].id,
        providerSessionId,
        Number(offering.license.price),
        req.user.preferredCurrency || "USD"
      ]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    const checkoutSession = await fetchCheckoutSessionById(client, paymentResult.rows[0].id);

    res.status(201).json({
      message: "Checkout session created successfully",
      data: normalizeResponseData({
        ...checkoutSession,
        checkoutUrl: `/app/checkout/${paymentResult.rows[0].id}`
      })
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    const statusCode =
      error.message.includes("not currently available") ||
      error.message.includes("does not have an attached license") ||
      error.message.includes("selected pack license") ||
      error.message.includes("does not belong to this asset")
        ? 400
        : error.message.includes("payout onboarding") ||
            error.message.includes("payable creator account")
          ? 409
          : 500;

    res.status(statusCode).json({
      message: statusCode === 500 ? "Error creating checkout session" : error.message,
      error: error.message
    });
  } finally {
    client.release();
  }
};

export const completeCheckoutSession = async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const paymentRecordId = Number(req.params.id);
    const { status = "paid" } = req.body;

    if (!VALID_PAYMENT_STATUSES.has(status)) {
      return res.status(400).json({
        message: "Invalid payment status"
      });
    }

    const paymentRecord = await fetchCheckoutSessionById(client, paymentRecordId);

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
    transactionStarted = true;

    if (paymentRecord.status === "paid" && !["paid", "refunded"].includes(status)) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(409).json({
        message: "A completed payment can only remain paid or move to refunded"
      });
    }

    if (paymentRecord.status === "paid" && status === "paid" && paymentRecord.purchase_id) {
      const purchase = await fetchPurchaseById(client, paymentRecord.purchase_id);
      const grantResult = await client.query(
        `
        SELECT *
        FROM license_grants
        WHERE purchase_id = $1
        LIMIT 1
        `,
        [paymentRecord.purchase_id]
      );

      await client.query("COMMIT");
      transactionStarted = false;

      return res.status(200).json({
        message: "Checkout session already completed",
        data: normalizeResponseData({
          payment: paymentRecord,
          purchase,
          grantedLicense: grantResult.rows[0] || null
        })
      });
    }

    await client.query(
      `
      UPDATE payment_records
      SET status = $1::varchar,
          updated_at = CURRENT_TIMESTAMP,
          receipt_url = CASE
            WHEN $3::boolean THEN CONCAT('/receipts/', provider_session_id)
            ELSE receipt_url
          END
      WHERE id = $2::integer
      RETURNING *
      `,
      [status, paymentRecordId, status === "paid"]
    );

    let purchase = paymentRecord.purchase_id
      ? await fetchPurchaseById(client, paymentRecord.purchase_id)
      : null;
    let grantedLicense = null;

    if (status === "paid") {
      if (purchase) {
        const purchaseResult = await client.query(
          `
          UPDATE purchases
          SET status = 'completed',
              payment_status = 'paid',
              buyer_email = $1::varchar
          WHERE id = $2::integer
          RETURNING *
          `,
          [req.user.email, purchase.id]
        );

        purchase = purchaseResult.rows[0];
      } else {
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

        await client.query(
          `
          UPDATE payment_records
          SET purchase_id = $1::integer,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2::integer
          `,
          [purchase.id, paymentRecordId]
        );
      }

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
        VALUES ($1::integer, $2::integer, $3::integer, $4::integer, $5::integer, $6::integer, 'active', true)
        ON CONFLICT (purchase_id)
        DO UPDATE
        SET buyer_user_id = EXCLUDED.buyer_user_id,
            creator_user_id = EXCLUDED.creator_user_id,
            license_id = EXCLUDED.license_id,
            asset_id = EXCLUDED.asset_id,
            pack_id = EXCLUDED.pack_id,
            status = 'active',
            download_access = true,
            updated_at = CURRENT_TIMESTAMP
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

      grantedLicense = grantResult.rows[0] || null;
    } else {
      const purchaseStatus =
        status === "canceled"
          ? "canceled"
          : status === "failed"
            ? "failed"
            : status === "refunded"
              ? "refunded"
              : "pending";

      if (paymentRecord.purchase_id) {
        const purchaseResult = await client.query(
          `
          UPDATE purchases
          SET status = $1::varchar,
              payment_status = $2::varchar
          WHERE id = $3::integer
          RETURNING *
          `,
          [purchaseStatus, status, paymentRecord.purchase_id]
        );

        purchase = purchaseResult.rows[0];
      }

      if (paymentRecord.purchase_id && status === "refunded") {
        const grantResult = await client.query(
          `
          UPDATE license_grants
          SET status = 'revoked',
              download_access = false,
              updated_at = CURRENT_TIMESTAMP
          WHERE purchase_id = $1::integer
          RETURNING *
          `,
          [paymentRecord.purchase_id]
        );

        grantedLicense = grantResult.rows[0] || null;
      }
    }

    await client.query("COMMIT");
    transactionStarted = false;

    const updatedPaymentRecord = await fetchCheckoutSessionById(client, paymentRecordId);
    const normalizedPurchase =
      updatedPaymentRecord?.purchase_id ? await fetchPurchaseById(client, updatedPaymentRecord.purchase_id) : null;

    res.status(200).json({
      message: "Checkout session updated successfully",
      data: normalizeResponseData({
        payment: updatedPaymentRecord,
        purchase: normalizedPurchase || purchase,
        grantedLicense
      })
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    res.status(500).json({
      message: "Error completing checkout session",
      error: error.message
    });
  } finally {
    client.release();
  }
};
