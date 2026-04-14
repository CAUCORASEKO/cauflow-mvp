import { pool } from "../config/db.js";
import { normalizeResponseData } from "../utils/normalize-response.js";
import { serializeAssetRecord } from "../utils/asset-delivery.js";
import { buildPurchaseSelect } from "../utils/commerce.js";

const normalizeTextColumn = (column, fallback) =>
  `COALESCE(NULLIF(LOWER(BTRIM(${column})), ''), '${fallback}')`;

const ASSET_STATUS_SQL = (alias = "a") => normalizeTextColumn(`${alias}.status`, "draft");
const ASSET_REVIEW_STATUS_SQL = (alias = "a") => `
  CASE
    WHEN NULLIF(BTRIM(${alias}.review_status), '') IS NOT NULL THEN LOWER(BTRIM(${alias}.review_status))
    WHEN ${ASSET_STATUS_SQL(alias)} = 'published' THEN 'approved'
    ELSE 'draft'
  END
`;
const USER_ROLE_SQL = (alias = "u") => normalizeTextColumn(`${alias}.role`, "buyer");
const ACCOUNT_STATUS_SQL = (alias = "u") => normalizeTextColumn(`${alias}.account_status`, "active");
const PAYOUT_STATUS_SQL = (alias = "cs") =>
  normalizeTextColumn(`${alias}.payout_onboarding_status`, "not_started");
const PURCHASE_STATUS_SQL = (alias = "p") => normalizeTextColumn(`${alias}.status`, "pending");
const PAYMENT_STATUS_SQL = (alias = "p") => `
  COALESCE(
    NULLIF(LOWER(BTRIM(${alias}.payment_status)), ''),
    CASE ${PURCHASE_STATUS_SQL(alias)}
      WHEN 'completed' THEN 'paid'
      WHEN 'pending' THEN 'pending'
      WHEN 'refunded' THEN 'refunded'
      WHEN 'canceled' THEN 'canceled'
      WHEN 'failed' THEN 'failed'
      ELSE 'pending'
    END
  )
`;
const GRANT_STATUS_SQL = (alias = "lg") => normalizeTextColumn(`${alias}.status`, "active");

const getCountMap = async (query) => {
  const result = await pool.query(query);

  return Object.fromEntries(result.rows.map((row) => [row.key, Number(row.value || 0)]));
};

const getAssetBaseSelect = (whereClause = "TRUE", limitClause = "") => `
  SELECT
    a.*,
    ${ASSET_STATUS_SQL("a")} AS normalized_status,
    ${ASSET_REVIEW_STATUS_SQL("a")} AS normalized_review_status,
    row_to_json(creator_summary) AS creator
  FROM assets a
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
  WHERE ${whereClause}
  ORDER BY a.updated_at DESC, a.id DESC
  ${limitClause}
`;

const fetchAdminAssets = async ({ whereClause = "TRUE", params = [], limit } = {}) => {
  const result = await pool.query(
    getAssetBaseSelect(whereClause, limit ? `LIMIT ${Number(limit)}` : ""),
    params
  );

  return result.rows.map((row) => {
    const normalizedRow = {
      ...row,
      status: row.normalized_status || row.status || "draft",
      review_status: row.normalized_review_status || row.review_status || "draft"
    };

    return {
      ...serializeAssetRecord(normalizedRow),
      creator: row.creator || null
    };
  });
};

const fetchAdminPacks = async () => {
  const result = await pool.query(`
    SELECT
      p.*,
      ${normalizeTextColumn("p.status", "draft")} AS normalized_status,
      (
        SELECT COUNT(*)::int
        FROM pack_assets pa
        WHERE pa.pack_id = p.id
      ) AS asset_count,
      row_to_json(creator_summary) AS creator,
      row_to_json(cover_asset) AS cover_asset,
      row_to_json(base_license) AS license
    FROM packs p
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
    LEFT JOIN LATERAL (
      SELECT
        a.id,
        a.title,
        a.description,
        a.image_url,
        a.preview_image_url,
        a.visual_type,
        a.status,
        a.created_at,
        a.owner_user_id
      FROM assets a
      WHERE a.id = p.cover_asset_id
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
    ) AS base_license ON true
    ORDER BY p.updated_at DESC, p.id DESC
  `);

  return normalizeResponseData(
    result.rows.map((row) => ({
      ...row,
      status: row.normalized_status || row.status || "draft"
    }))
  );
};

const fetchAdminLicenses = async () => {
  const result = await pool.query(`
    SELECT
      l.*,
      ${normalizeTextColumn("l.status", "published")} AS normalized_status,
      row_to_json(asset_summary) AS asset,
      row_to_json(creator_summary) AS creator,
      (
        SELECT COUNT(*)::int
        FROM purchases p
        WHERE p.license_id = l.id
      ) AS purchase_count,
      (
        SELECT COUNT(*)::int
        FROM license_grants lg
        WHERE lg.license_id = l.id
          AND ${GRANT_STATUS_SQL("lg")} = 'active'
      ) AS active_grant_count,
      (
        SELECT row_to_json(lp)
        FROM (
          SELECT *
          FROM license_policies
          WHERE license_id = l.id
        ) AS lp
      ) AS policy
    FROM licenses l
    LEFT JOIN LATERAL (
      SELECT
        a.id,
        a.title,
        a.description,
        a.image_url,
        a.preview_image_url,
        a.visual_type,
        a.status,
        a.review_status,
        a.created_at,
        a.owner_user_id
      FROM assets a
      WHERE a.id = l.asset_id
    ) AS asset_summary ON true
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
      WHERE u.id = l.owner_user_id
    ) AS creator_summary ON true
    ORDER BY l.created_at DESC, l.id DESC
  `);

  return normalizeResponseData(
    result.rows.map((row) => ({
      ...row,
      status: row.normalized_status || row.status || "published"
    }))
  );
};

const fetchAdminUsers = async () => {
  const result = await pool.query(`
    SELECT
      u.id,
      u.email,
      ${USER_ROLE_SQL("u")} AS role,
      ${ACCOUNT_STATUS_SQL("u")} AS account_status,
      u.email_verified,
      u.created_at,
      u.updated_at,
      p.public_display_name,
      p.avatar_url,
      p.organization_name,
      p.studio_name,
      p.country,
      p.preferred_currency,
      p.wallet_connection_status,
      p.onboarding_completed,
      ${PAYOUT_STATUS_SQL("cs")} AS payout_onboarding_status,
      (
        SELECT COUNT(*)::int
        FROM assets a
        WHERE a.owner_user_id = u.id
      ) AS asset_count,
      (
        SELECT COUNT(*)::int
        FROM packs pk
        WHERE pk.owner_user_id = u.id
      ) AS pack_count,
      (
        SELECT COUNT(*)::int
        FROM purchases buyer_purchases
        WHERE buyer_purchases.buyer_user_id = u.id
      ) AS buyer_purchase_count,
      (
        SELECT COUNT(*)::int
        FROM purchases creator_purchases
        WHERE creator_purchases.creator_user_id = u.id
      ) AS creator_sale_count,
      (
        SELECT COUNT(*)::int
        FROM license_grants lg
        WHERE lg.buyer_user_id = u.id
      ) AS entitlement_count
    FROM users u
    LEFT JOIN profiles p
      ON p.user_id = u.id
    LEFT JOIN creator_settings cs
      ON cs.user_id = u.id
    ORDER BY u.created_at DESC, u.id DESC
  `);

  return normalizeResponseData(result.rows);
};

const fetchAdminCommerce = async () => {
  const result = await pool.query(`
    SELECT
      purchase_snapshot.*,
      COALESCE(purchase_snapshot.payment->>'status', purchase_snapshot.payment_status) AS resolved_payment_status,
      ${GRANT_STATUS_SQL("license_grant")} AS grant_status,
      license_grant.download_access
    FROM (
      ${buildPurchaseSelect()}
    ) AS purchase_snapshot
    LEFT JOIN license_grants license_grant
      ON license_grant.purchase_id = purchase_snapshot.id
    ORDER BY purchase_snapshot.created_at DESC, purchase_snapshot.id DESC
  `);

  return normalizeResponseData(
    result.rows.map((row) => ({
      ...row,
      payment_status: row.resolved_payment_status || row.payment_status || "pending"
    }))
  );
};

export const getAdminOverview = async (_req, res) => {
  try {
    const [
      assetCountResult,
      assetCounts,
      reviewCounts,
      packCount,
      licenseCount,
      totalUsersCount,
      creatorPopulationCount,
      buyerPopulationCount,
      purchaseCounts,
      activeGrantCount,
      reviewQueue,
      recentCommerce
    ] =
      await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS value FROM assets`),
        getCountMap(`
          SELECT ${ASSET_STATUS_SQL("assets")} AS key, COUNT(*)::int AS value
          FROM assets
          GROUP BY 1
        `),
        getCountMap(`
          SELECT ${ASSET_REVIEW_STATUS_SQL("assets")} AS key, COUNT(*)::int AS value
          FROM assets
          GROUP BY 1
        `),
        pool.query(`SELECT COUNT(*)::int AS value FROM packs`),
        pool.query(`SELECT COUNT(*)::int AS value FROM licenses`),
        pool.query(`
          SELECT COUNT(*)::int AS value
          FROM users
        `),
        pool.query(`
          SELECT COUNT(*)::int AS value
          FROM (
            SELECT u.id
            FROM users u
            WHERE ${USER_ROLE_SQL("u")} = 'creator'
            UNION
            SELECT a.owner_user_id
            FROM assets a
            WHERE a.owner_user_id IS NOT NULL
            UNION
            SELECT pk.owner_user_id
            FROM packs pk
            WHERE pk.owner_user_id IS NOT NULL
            UNION
            SELECT l.owner_user_id
            FROM licenses l
            WHERE l.owner_user_id IS NOT NULL
            UNION
            SELECT p.creator_user_id
            FROM purchases p
            WHERE p.creator_user_id IS NOT NULL
          ) AS creators
        `),
        pool.query(`
          SELECT COUNT(*)::int AS value
          FROM (
            SELECT u.id
            FROM users u
            WHERE ${USER_ROLE_SQL("u")} = 'buyer'
            UNION
            SELECT p.buyer_user_id
            FROM purchases p
            WHERE p.buyer_user_id IS NOT NULL
            UNION
            SELECT lg.buyer_user_id
            FROM license_grants lg
            WHERE lg.buyer_user_id IS NOT NULL
          ) AS buyers
        `),
        getCountMap(`
          SELECT ${PAYMENT_STATUS_SQL("purchases")} AS key, COUNT(*)::int AS value
          FROM purchases
          GROUP BY ${PAYMENT_STATUS_SQL("purchases")}
        `),
        pool.query(`
          SELECT COUNT(*)::int AS value
          FROM license_grants
          WHERE ${GRANT_STATUS_SQL("license_grants")} = 'active'
        `),
        fetchAdminAssets({ whereClause: `${ASSET_REVIEW_STATUS_SQL("a")} = 'in_review'`, limit: 4 }),
        pool.query(`
          SELECT *
          FROM (
            ${buildPurchaseSelect()}
          ) AS purchase_snapshot
          ORDER BY created_at DESC, id DESC
          LIMIT 4
        `)
      ]);

    res.status(200).json({
      message: "Admin overview fetched successfully",
      data: normalizeResponseData({
        metrics: {
          totalUsersCount: Number(totalUsersCount.rows[0]?.value || 0),
          creatorsCount: Number(creatorPopulationCount.rows[0]?.value || 0),
          buyersCount: Number(buyerPopulationCount.rows[0]?.value || 0),
          assetsCount: Number(assetCountResult.rows[0]?.value || 0),
          assetsPendingReview: reviewCounts.in_review || 0,
          draftAssets: assetCounts.draft || 0,
          publishedAssets: assetCounts.published || 0,
          archivedAssets: assetCounts.archived || 0,
          packsCount: Number(packCount.rows[0]?.value || 0),
          licensesCount: Number(licenseCount.rows[0]?.value || 0),
          rejectedAssetsCount: reviewCounts.rejected || 0,
          purchasesCount:
            (purchaseCounts.paid || 0) +
            (purchaseCounts.pending || 0) +
            (purchaseCounts.failed || 0) +
            (purchaseCounts.refunded || 0) +
            (purchaseCounts.canceled || 0),
          paidPurchasesCount: purchaseCounts.paid || 0,
          pendingPurchasesCount: purchaseCounts.pending || 0,
          activeLicenseGrantsCount: Number(activeGrantCount.rows[0]?.value || 0)
        },
        reviewQueue,
        recentPurchases: recentCommerce.rows
      })
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching admin overview",
      error: error.message
    });
  }
};

export const getAdminReviewQueue = async (_req, res) => {
  try {
    const assets = await fetchAdminAssets({
      whereClause: `${ASSET_REVIEW_STATUS_SQL("a")} = 'in_review'`
    });

    res.status(200).json({
      message: "Admin review queue fetched successfully",
      data: normalizeResponseData({
        summary: {
          inReviewCount: assets.length,
          deliveryReadyCount: assets.filter((asset) => asset.deliveryReadiness?.isReady).length,
          blockedCount: assets.filter((asset) => !asset.deliveryReadiness?.isReady).length
        },
        assets
      })
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching admin review queue",
      error: error.message
    });
  }
};

export const getAdminCatalog = async (_req, res) => {
  try {
    const [assets, packs, licenses] = await Promise.all([
      fetchAdminAssets(),
      fetchAdminPacks(),
      fetchAdminLicenses()
    ]);

    res.status(200).json({
      message: "Admin catalog fetched successfully",
      data: normalizeResponseData({
        summary: {
          assetsCount: assets.length,
          assetDraftCount: assets.filter((asset) => asset.status === "draft").length,
          assetPublishedCount: assets.filter((asset) => asset.status === "published").length,
          assetArchivedCount: assets.filter((asset) => asset.status === "archived").length,
          inReviewCount: assets.filter((asset) => asset.reviewStatus === "in_review").length,
          rejectedCount: assets.filter((asset) => asset.reviewStatus === "rejected").length,
          packsCount: packs.length,
          licensesCount: licenses.length
        },
        assets,
        packs,
        licenses
      })
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching admin catalog",
      error: error.message
    });
  }
};

export const getAdminUsers = async (_req, res) => {
  try {
    const users = await fetchAdminUsers();

    res.status(200).json({
      message: "Admin users fetched successfully",
      data: normalizeResponseData({
        summary: {
          totalUsers: users.length,
          creatorsCount: users.filter(
            (user) =>
              user.role === "creator" ||
              user.assetCount > 0 ||
              user.packCount > 0 ||
              user.creatorSaleCount > 0
          ).length,
          buyersCount: users.filter(
            (user) =>
              user.role === "buyer" || user.buyerPurchaseCount > 0 || user.entitlementCount > 0
          ).length,
          adminsCount: users.filter((user) => user.role === "admin").length,
          verifiedCount: users.filter((user) => user.emailVerified).length,
          closedCount: users.filter((user) => user.accountStatus === "closed").length,
          restrictedCount: users.filter((user) => user.accountStatus === "restricted").length
        },
        users
      })
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching admin users",
      error: error.message
    });
  }
};

export const getAdminCommerce = async (_req, res) => {
  try {
    const purchases = await fetchAdminCommerce();

    res.status(200).json({
      message: "Admin commerce fetched successfully",
      data: normalizeResponseData({
        summary: {
          purchasesCount: purchases.length,
          paidPurchasesCount: purchases.filter((purchase) => purchase.paymentStatus === "paid").length,
          pendingPurchasesCount: purchases.filter((purchase) => purchase.paymentStatus === "pending").length,
          refundedPurchasesCount: purchases.filter((purchase) => purchase.paymentStatus === "refunded").length,
          activeGrantsCount: purchases.filter((purchase) => purchase.grantStatus === "active").length
        },
        purchases
      })
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching admin commerce",
      error: error.message
    });
  }
};
