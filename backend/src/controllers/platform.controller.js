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

const hasPaidActiveDownloadAccess = (grant) =>
  grant.status === "active" &&
  grant.download_access &&
  (grant.purchase?.payment_status === "paid" || grant.payment?.status === "paid");

const buildPackItemDeliveryState = (grantId, item) => {
  const masterFileName = item.master_file_name || null;
  const masterMimeType = item.master_mime_type || null;
  const masterFileSize =
    item.master_file_size === null || item.master_file_size === undefined
      ? null
      : Number(item.master_file_size);
  const resolutionSummary = item.master_resolution_summary || null;
  const aspectRatio = item.master_aspect_ratio || null;

  if (!hasPaidActiveDownloadAccess(item.grant)) {
    return {
      available: false,
      reason:
        item.grant.status !== "active"
          ? "Entitlement inactive"
          : !item.grant.download_access
            ? "Entitlement inactive"
            : "Waiting for successful payment",
      downloadUrl: null,
      fileName: masterFileName,
      mimeType: masterMimeType,
      fileSize: masterFileSize,
      resolutionSummary,
      aspectRatio
    };
  }

  if (!item.master_file_url || !masterFileName) {
    return {
      available: false,
      reason: "Included pack asset unavailable",
      downloadUrl: null,
      fileName: null,
      mimeType: masterMimeType,
      fileSize: masterFileSize,
      resolutionSummary,
      aspectRatio
    };
  }

  return {
    available: true,
    reason: "Download available",
    downloadUrl: `/api/platform/entitlements/${grantId}/assets/${item.asset_id}/download`,
    fileName: masterFileName,
    mimeType: masterMimeType,
    fileSize: masterFileSize,
    resolutionSummary,
    aspectRatio
  };
};

const buildPackPremiumDeliveryState = (grant, includedAssets = []) => {
  if (!grant.pack_id && !grant.pack?.id) {
    return null;
  }

  if (grant.status !== "active") {
    return {
      mode: "pack",
      eligible: false,
      available: false,
      reason: "Entitlement inactive",
      downloadUrl: null,
      fileName: null,
      mimeType: null,
      fileSize: null,
      resolutionSummary: null,
      aspectRatio: null,
      includedAssets
    };
  }

  if (!grant.download_access) {
    return {
      mode: "pack",
      eligible: false,
      available: false,
      reason: "Entitlement inactive",
      downloadUrl: null,
      fileName: null,
      mimeType: null,
      fileSize: null,
      resolutionSummary: null,
      aspectRatio: null,
      includedAssets
    };
  }

  if (grant.purchase?.payment_status !== "paid" && grant.payment?.status !== "paid") {
    return {
      mode: "pack",
      eligible: false,
      available: false,
      reason: "Waiting for successful payment",
      downloadUrl: null,
      fileName: null,
      mimeType: null,
      fileSize: null,
      resolutionSummary: null,
      aspectRatio: null,
      includedAssets
    };
  }

  const readyCount = includedAssets.filter((item) => item.premium_delivery?.available).length;
  const totalCount = includedAssets.length;

  return {
    mode: "pack",
    eligible: true,
    available: readyCount > 0,
    reason:
      totalCount === 0
        ? "No premium files available yet"
        : readyCount === totalCount
          ? "Premium files ready across the full purchased pack."
          : readyCount > 0
            ? `${readyCount} of ${totalCount} included assets are ready for download.`
            : "Included pack assets are unavailable right now.",
    downloadUrl: null,
    fileName: null,
    mimeType: null,
    fileSize: null,
    resolutionSummary: null,
    aspectRatio: null,
    includedAssets
  };
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

  if (grant.pack_id || grant.pack?.id) {
    return buildPackPremiumDeliveryState(grant, grant.pack_delivery_assets || []);
  }

  if (!isAssetGrant) {
    return {
      mode: "asset",
      eligible: false,
      available: false,
      reason: "No premium file available yet",
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
      mode: "asset",
      eligible: false,
      available: false,
      reason: "Entitlement inactive",
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
      mode: "asset",
      eligible: false,
      available: false,
      reason: "Entitlement inactive",
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
      mode: "asset",
      eligible: false,
      available: false,
      reason: "Waiting for successful payment",
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
      mode: "asset",
      eligible: true,
      available: false,
      reason: "No premium file available yet",
      downloadUrl: null,
      fileName: null,
      mimeType: masterMimeType,
      fileSize: masterFileSize,
      resolutionSummary,
      aspectRatio
    };
  }

  return {
    mode: "asset",
    eligible: true,
    available: true,
    reason: "Download available",
    downloadUrl: `/api/platform/entitlements/${grant.id}/download`,
    fileName: masterFileName,
    mimeType: masterMimeType,
    fileSize: masterFileSize,
    resolutionSummary,
    aspectRatio
  };
};

const serializeEntitlementRecord = (grant) => {
  const { pack_delivery_assets, ...rest } = grant;

  return {
    ...rest,
    premium_delivery: getPremiumDeliveryState(grant)
  };
};

const fetchPackDeliveryAssetsByGrantIds = async (grantIds) => {
  if (!grantIds.length) {
    return new Map();
  }

  const result = await pool.query(
    `
    SELECT
      lg.id AS grant_id,
      lg.status,
      lg.download_access,
      p.payment_status AS purchase_payment_status,
      pr.status AS payment_status,
      a.id AS asset_id,
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
      a.status AS asset_status,
      a.review_status,
      a.review_note,
      a.created_at,
      a.owner_user_id,
      pa.position
    FROM license_grants lg
    JOIN purchases p
      ON p.id = lg.purchase_id
    LEFT JOIN LATERAL (
      SELECT status
      FROM payment_records
      WHERE purchase_id = lg.purchase_id
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    ) pr ON true
    JOIN pack_assets pa
      ON pa.pack_id = lg.pack_id
    JOIN assets a
      ON a.id = pa.asset_id
    WHERE lg.id = ANY($1::int[])
    ORDER BY lg.id ASC, pa.position ASC, pa.id ASC
    `,
    [grantIds]
  );

  const assetsByGrantId = new Map();

  for (const row of result.rows) {
    const itemGrant = {
      status: row.status,
      download_access: row.download_access,
      purchase: { payment_status: row.purchase_payment_status },
      payment: { status: row.payment_status }
    };

    const deliveryState = buildPackItemDeliveryState(row.grant_id, {
      ...row,
      grant: itemGrant
    });

    const serializedAsset = serializeAssetRecord(row);
    const item = {
      id: row.asset_id,
      position: row.position,
      title: serializedAsset.title,
      visual_type: serializedAsset.visual_type,
      preview_image_url: serializedAsset.preview_image_url,
      preview_file: serializedAsset.preview_file,
      master_file: serializedAsset.master_file,
      premium_delivery: deliveryState
    };

    if (!assetsByGrantId.has(row.grant_id)) {
      assetsByGrantId.set(row.grant_id, []);
    }

    assetsByGrantId.get(row.grant_id).push(item);
  }

  return assetsByGrantId;
};

const enrichEntitlementRecords = async (grants) => {
  const packGrantIds = grants
    .filter((grant) => grant.pack_id || grant.pack?.id)
    .map((grant) => grant.id);
  const packAssetsByGrantId = await fetchPackDeliveryAssetsByGrantIds(packGrantIds);

  return grants.map((grant) =>
    serializeEntitlementRecord({
      ...grant,
      pack_delivery_assets: packAssetsByGrantId.get(grant.id) || []
    })
  );
};

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

const fetchPackEntitlementAssetForBuyer = async (buyerUserId, grantId, assetId) => {
  const result = await pool.query(
    `
    SELECT
      lg.id AS grant_id,
      lg.buyer_user_id,
      lg.pack_id,
      lg.status,
      lg.download_access,
      p.payment_status AS purchase_payment_status,
      pr.status AS payment_status,
      a.id AS asset_id,
      a.master_file_url,
      a.master_file_name,
      a.master_mime_type,
      a.master_file_size,
      a.master_resolution_summary,
      a.master_aspect_ratio
    FROM license_grants lg
    JOIN purchases p
      ON p.id = lg.purchase_id
    LEFT JOIN LATERAL (
      SELECT status
      FROM payment_records
      WHERE purchase_id = lg.purchase_id
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    ) pr ON true
    JOIN pack_assets pa
      ON pa.pack_id = lg.pack_id
    JOIN assets a
      ON a.id = pa.asset_id
    WHERE lg.id = $1
      AND lg.buyer_user_id = $2
      AND a.id = $3
    LIMIT 1
    `,
    [grantId, buyerUserId, assetId]
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
              'source_type', COALESCE(l.source_type, 'asset'),
              'source_asset_id', COALESCE(l.source_asset_id, l.asset_id),
              'source_pack_id', l.source_pack_id,
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
          WHERE COALESCE(l.source_type, 'asset') = 'asset'
            AND COALESCE(l.source_asset_id, l.asset_id) = a.id
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
            WHEN COALESCE(base_license.source_type, 'asset') = 'pack'
              AND base_license.source_pack_id IS DISTINCT FROM p.id
              THEN 'The attached pack license no longer matches this pack'
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
            l.source_type,
            l.source_asset_id,
            l.source_pack_id,
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
          AND (
            COALESCE(base_license.source_type, 'asset') = 'pack'
            AND base_license.source_pack_id = p.id
            OR COALESCE(base_license.source_type, 'asset') = 'asset'
          )
        ORDER BY p.updated_at DESC
        LIMIT 12
        `
      ),
      pool.query(
        `
        SELECT
          id,
          asset_id,
          COALESCE(source_type, 'asset') AS source_type,
          COALESCE(source_asset_id, asset_id) AS source_asset_id,
          source_pack_id,
          type,
          price,
          usage,
          status,
          created_at
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
      data: normalizeResponseData(await enrichEntitlementRecords(result.rows))
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

export const downloadPackEntitlementAssetMasterFile = async (req, res) => {
  try {
    const grantId = Number(req.params.id);
    const assetId = Number(req.params.assetId);
    const entitlementAsset = await fetchPackEntitlementAssetForBuyer(req.user.id, grantId, assetId);

    if (!entitlementAsset) {
      return res.status(404).json({
        message: "Pack delivery asset not found for this entitlement."
      });
    }

    const deliveryState = buildPackItemDeliveryState(grantId, {
      ...entitlementAsset,
      grant: {
        status: entitlementAsset.status,
        download_access: entitlementAsset.download_access,
        purchase: { payment_status: entitlementAsset.purchase_payment_status },
        payment: { status: entitlementAsset.payment_status }
      }
    });

    if (!deliveryState.available) {
      return res.status(409).json({
        message:
          deliveryState.reason || "Premium delivery is not available for this included asset."
      });
    }

    const filePath = resolveStoredUploadPath(entitlementAsset.master_file_url);

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(409).json({
        message: "Master delivery file unavailable"
      });
    }

    if (deliveryState.mimeType) {
      res.type(deliveryState.mimeType);
    }

    return res.download(
      filePath,
      deliveryState.fileName || `cauflow-pack-asset-${assetId}`
    );
  } catch (error) {
    res.status(500).json({
      message: "Error downloading pack delivery asset",
      error: error.message
    });
  }
};
