import { pool } from "../config/db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeResponseData } from "../utils/normalize-response.js";
import { fetchAccountByUserId } from "../utils/account.js";
import { buildGrantSelect, buildPurchaseSelect } from "../utils/commerce.js";
import { serializeAssetRecord } from "../utils/asset-delivery.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getScalar = async (db, query, params = []) => {
  const result = await db.query(query, params);
  return result.rows[0]?.value ?? 0;
};

const getPremiumDeliveryState = (grant) => {
  const isAssetGrant = Boolean(grant.asset_id || grant.asset?.id);
  const masterFileName = grant.asset?.master_file_name || null;
  const masterMimeType = grant.asset?.master_mime_type || null;
  const masterFileSize =
    grant.asset?.master_file_size === null || grant.asset?.master_file_size === undefined
      ? null
      : Number(grant.asset.master_file_size);
  const resolutionSummary = grant.asset?.master_resolution_summary || null;
  const aspectRatio = grant.asset?.master_aspect_ratio || null;

  if (!isAssetGrant) {
    return {
      eligible: false,
      available: false,
      reason: "Premium master-file delivery is currently available for direct asset licenses only.",
      downloadUrl: null,
      fileName: null,
      mimeType: null,
      fileSize: null,
      resolutionSummary: null,
      aspectRatio: null
    };
  }

  if (grant.status !== "active") {
    return {
      eligible: false,
      available: false,
      reason: "No active entitlement is available for this asset.",
      downloadUrl: null,
      fileName: masterFileName,
      mimeType: masterMimeType,
      fileSize: masterFileSize,
      resolutionSummary,
      aspectRatio
    };
  }

  if (!grant.download_access) {
    return {
      eligible: false,
      available: false,
      reason: "This entitlement does not currently unlock premium delivery.",
      downloadUrl: null,
      fileName: masterFileName,
      mimeType: masterMimeType,
      fileSize: masterFileSize,
      resolutionSummary,
      aspectRatio
    };
  }

  if (grant.purchase?.payment_status !== "paid" && grant.payment?.status !== "paid") {
    return {
      eligible: false,
      available: false,
      reason: "Payment must complete before premium download is unlocked.",
      downloadUrl: null,
      fileName: masterFileName,
      mimeType: masterMimeType,
      fileSize: masterFileSize,
      resolutionSummary,
      aspectRatio
    };
  }

  if (!masterFileName) {
    return {
      eligible: true,
      available: false,
      reason: "Master delivery file is not available yet.",
      downloadUrl: null,
      fileName: null,
      mimeType: masterMimeType,
      fileSize: masterFileSize,
      resolutionSummary,
      aspectRatio
    };
  }

  return {
    eligible: true,
    available: true,
    reason: null,
    downloadUrl: `/api/platform/entitlements/${grant.id}/download`,
    fileName: masterFileName,
    mimeType: masterMimeType,
    fileSize: masterFileSize,
    resolutionSummary,
    aspectRatio
  };
};

const serializeEntitlementRecord = (grant) => ({
  ...grant,
  premium_delivery: getPremiumDeliveryState(grant)
});

const fetchEntitlementForBuyer = async (buyerUserId, grantId) => {
  const result = await pool.query(
    `
    ${buildGrantSelect("lg.id = $1 AND lg.buyer_user_id = $2")}
    LIMIT 1
    `,
    [grantId, buyerUserId]
  );

  return result.rows[0] || null;
};

const resolveStoredUploadPath = (url) => {
  if (!url?.startsWith("/uploads/")) {
    return null;
  }

  return path.join(__dirname, "..", "..", url.replace(/^\//, ""));
};

export const getExploreFeed = async (req, res) => {
  try {
    const [assetsResult, packsResult, licensesResult] = await Promise.all([
      pool.query(
        `
        SELECT
          a.id,
          a.title,
          a.description,
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
          a.visual_type,
          a.status,
          a.review_status,
          a.review_note,
          a.created_at,
          a.owner_user_id,
          row_to_json(creator_summary) AS creator,
          COALESCE(creator_settings.payout_onboarding_status, 'not_started') AS monetization_status,
          COALESCE(creator_settings.payout_onboarding_status, 'not_started') = 'active' AS monetization_ready,
          CASE
            WHEN license_options.items IS NULL THEN 'No license options available yet'
            WHEN COALESCE(creator_settings.payout_onboarding_status, 'not_started') <> 'active'
              THEN 'Creator payout onboarding is not active yet'
            ELSE NULL
          END AS purchase_blocked_reason,
          COALESCE(license_options.items, '[]'::json) AS license_options
        FROM assets a
        LEFT JOIN creator_settings
          ON creator_settings.user_id = a.owner_user_id
        LEFT JOIN LATERAL (
          SELECT
            u.id,
            u.email,
            p.public_display_name,
            p.organization_name,
            p.studio_name
          FROM users u
          LEFT JOIN profiles p
            ON p.user_id = u.id
          WHERE u.id = a.owner_user_id
        ) AS creator_summary ON true
        LEFT JOIN LATERAL (
          SELECT json_agg(
            json_build_object(
              'id', l.id,
              'asset_id', l.asset_id,
              'type', l.type,
              'price', l.price,
              'usage', l.usage,
              'status', l.status,
              'created_at', l.created_at,
              'policy', (
                SELECT row_to_json(lp)
                FROM (
                  SELECT *
                  FROM license_policies
                  WHERE license_id = l.id
                ) AS lp
              )
            )
            ORDER BY l.price ASC, l.id ASC
          ) AS items
          FROM licenses l
          WHERE l.asset_id = a.id
            AND l.status = 'published'
        ) AS license_options ON true
        WHERE a.status = 'published'
          AND license_options.items IS NOT NULL
        ORDER BY a.created_at DESC
        `
      ),
      pool.query(
        `
        SELECT
          p.id,
          p.title,
          p.description,
          p.price,
          p.status,
          p.category,
          p.cover_asset_id,
          p.created_at,
          p.updated_at,
          p.owner_user_id,
          (
            SELECT COUNT(*)::int
            FROM pack_assets pa
            WHERE pa.pack_id = p.id
          ) AS asset_count,
          row_to_json(cover_asset) AS cover_asset,
          row_to_json(base_license) AS license,
          row_to_json(creator_summary) AS creator,
          COALESCE(cs.payout_onboarding_status, 'not_started') AS monetization_status,
          COALESCE(cs.payout_onboarding_status, 'not_started') = 'active' AS monetization_ready,
          CASE
            WHEN p.license_id IS NULL THEN 'No pack license is attached yet'
            WHEN COALESCE(cs.payout_onboarding_status, 'not_started') <> 'active'
              THEN 'Creator payout onboarding is not active yet'
            ELSE NULL
          END AS purchase_blocked_reason
        FROM packs p
        LEFT JOIN creator_settings cs
          ON cs.user_id = p.owner_user_id
        LEFT JOIN LATERAL (
          SELECT
            a.id,
            a.title,
            a.description,
            a.image_url,
            a.visual_type,
            a.status,
            a.created_at,
            a.owner_user_id
          FROM assets a
          WHERE a.id = p.cover_asset_id
            AND a.status = 'published'
        ) AS cover_asset ON true
        LEFT JOIN LATERAL (
          SELECT
            l.id,
            l.asset_id,
            l.type,
            l.price,
            l.usage,
            l.status,
            l.created_at,
            (
              SELECT row_to_json(lp)
              FROM (
                SELECT *
                FROM license_policies
                WHERE license_id = l.id
              ) AS lp
            ) AS policy
          FROM licenses l
          WHERE l.id = p.license_id
            AND l.status = 'published'
        ) AS base_license ON true
        LEFT JOIN LATERAL (
          SELECT
            u.id,
            u.email,
            pr.public_display_name,
            pr.organization_name,
            pr.studio_name
          FROM users u
          LEFT JOIN profiles pr
            ON pr.user_id = u.id
          WHERE u.id = p.owner_user_id
        ) AS creator_summary ON true
        WHERE p.status = 'published'
          AND cover_asset.id IS NOT NULL
          AND base_license.id IS NOT NULL
        ORDER BY p.updated_at DESC
        LIMIT 12
        `
      ),
      pool.query(
        `
        SELECT id, asset_id, type, price, usage, status, created_at
        FROM licenses
        WHERE status = 'published'
        ORDER BY created_at DESC
        LIMIT 12
        `
      )
    ]);

    const visibleAssets = assetsResult.rows
      .map(serializeAssetRecord)
      .filter((asset) => asset.buyer_visible)
      .slice(0, 12);

    res.status(200).json({
      message: "Explore feed fetched successfully",
      data: normalizeResponseData({
        assets: visibleAssets,
        packs: packsResult.rows,
        licenses: licensesResult.rows
      })
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching explore feed",
      error: error.message
    });
  }
};

export const getRoleDashboard = async (req, res) => {
  try {
    const account = await fetchAccountByUserId(pool, req.user.id);

    if (req.user.role === "creator") {
      const [assetsCount, packsCount, activeLicenses, totalSales] = await Promise.all([
        getScalar(pool, "SELECT COUNT(*)::int AS value FROM assets WHERE owner_user_id = $1", [
          req.user.id
        ]),
        getScalar(pool, "SELECT COUNT(*)::int AS value FROM packs WHERE owner_user_id = $1", [
          req.user.id
        ]),
        getScalar(
          pool,
          "SELECT COUNT(*)::int AS value FROM licenses WHERE owner_user_id = $1",
          [req.user.id]
        ),
        getScalar(
          pool,
          "SELECT COUNT(*)::int AS value FROM purchases WHERE creator_user_id = $1 AND payment_status = 'paid'",
          [req.user.id]
        )
      ]);

      const recentPurchases = await pool.query(
        `
        ${buildPurchaseSelect("p.creator_user_id = $1")}
        ORDER BY p.created_at DESC
        LIMIT 6
        `,
        [req.user.id]
      );

      return res.status(200).json({
        message: "Creator dashboard fetched successfully",
        data: normalizeResponseData({
          role: "creator",
          account,
          metrics: {
            assetsCount,
            packsCount,
            activeLicenses,
            totalSales
          },
          payoutStatus: account?.payoutOnboardingStatus || "not_started",
          recentPurchases: recentPurchases.rows,
          quickActions: [
            "Upload asset",
            "Create pack",
            "Define license",
            "Review sales"
          ]
        })
      });
    }

    if (req.user.role === "buyer") {
      const [purchasedLicenses, activeLicenses, expiredLicenses, downloads] = await Promise.all([
        getScalar(
          pool,
          "SELECT COUNT(*)::int AS value FROM purchases WHERE buyer_user_id = $1 AND payment_status = 'paid'",
          [req.user.id]
        ),
        getScalar(
          pool,
          "SELECT COUNT(*)::int AS value FROM license_grants WHERE buyer_user_id = $1 AND status = 'active'",
          [req.user.id]
        ),
        getScalar(
          pool,
          "SELECT COUNT(*)::int AS value FROM license_grants WHERE buyer_user_id = $1 AND status = 'expired'",
          [req.user.id]
        ),
        getScalar(
          pool,
          "SELECT COUNT(*)::int AS value FROM license_grants WHERE buyer_user_id = $1 AND download_access = true",
          [req.user.id]
        )
      ]);

      const recentPurchases = await pool.query(
        `
        ${buildPurchaseSelect("p.buyer_user_id = $1")}
        ORDER BY p.created_at DESC
        LIMIT 6
        `,
        [req.user.id]
      );

      return res.status(200).json({
        message: "Buyer dashboard fetched successfully",
        data: normalizeResponseData({
          role: "buyer",
          account,
          metrics: {
            purchasedLicenses,
            activeLicenses,
            expiredLicenses,
            downloads
          },
          recentPurchases: recentPurchases.rows,
          quickActions: [
            "Browse assets",
            "Browse packs",
            "View purchases",
            "View active rights"
          ]
        })
      });
    }

    const [totalUsers, creators, buyers, assets, packs, purchases, payments] =
      await Promise.all([
        getScalar(pool, "SELECT COUNT(*)::int AS value FROM users"),
        getScalar(pool, "SELECT COUNT(*)::int AS value FROM users WHERE role = 'creator'"),
        getScalar(pool, "SELECT COUNT(*)::int AS value FROM users WHERE role = 'buyer'"),
        getScalar(pool, "SELECT COUNT(*)::int AS value FROM assets"),
        getScalar(pool, "SELECT COUNT(*)::int AS value FROM packs"),
        getScalar(pool, "SELECT COUNT(*)::int AS value FROM purchases"),
        getScalar(pool, "SELECT COUNT(*)::int AS value FROM payment_records")
      ]);

    const recentPayments = await pool.query(
      `
      SELECT *
      FROM payment_records
      ORDER BY created_at DESC
      LIMIT 6
      `
    );

    return res.status(200).json({
      message: "Admin dashboard fetched successfully",
      data: normalizeResponseData({
        role: "admin",
        account,
        metrics: {
          totalUsers,
          creators,
          buyers,
          assets,
          packs,
          purchases,
          payments
        },
        recentPayments: recentPayments.rows,
        quickActions: [
          "Review users",
          "Review assets",
          "Review payouts",
          "Review payments"
        ]
      })
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching role dashboard",
      error: error.message
    });
  }
};

export const getEntitlements = async (req, res) => {
  try {
    const result = await pool.query(
      `
      ${buildGrantSelect("lg.buyer_user_id = $1")}
      ORDER BY lg.created_at DESC
      `,
      [req.user.id]
    );

    res.status(200).json({
      message: "Entitlements fetched successfully",
      data: normalizeResponseData(result.rows.map(serializeEntitlementRecord))
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching entitlements",
      error: error.message
    });
  }
};

export const downloadEntitlementMasterFile = async (req, res) => {
  try {
    const grantId = Number(req.params.id);
    const entitlement = await fetchEntitlementForBuyer(req.user.id, grantId);

    if (!entitlement) {
      return res.status(404).json({
        message: "Entitlement not found"
      });
    }

    const premiumDelivery = getPremiumDeliveryState(entitlement);

    if (!premiumDelivery.available) {
      return res.status(409).json({
        message: premiumDelivery.reason || "Premium delivery is not available for this entitlement."
      });
    }

    const filePath = resolveStoredUploadPath(entitlement.asset?.master_file_url);

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(409).json({
        message: "Master delivery file is not available yet."
      });
    }

    if (premiumDelivery.mimeType) {
      res.type(premiumDelivery.mimeType);
    }

    return res.download(
      filePath,
      premiumDelivery.fileName || `cauflow-asset-${entitlement.asset_id}`
    );
  } catch (error) {
    res.status(500).json({
      message: "Error downloading premium delivery file",
      error: error.message
    });
  }
};
