import { pool } from "../config/db.js";
import { normalizeResponseData } from "../utils/normalize-response.js";
import { fetchAccountByUserId } from "../utils/account.js";

const getScalar = async (db, query, params = []) => {
  const result = await db.query(query, params);
  return result.rows[0]?.value ?? 0;
};

export const getExploreFeed = async (req, res) => {
  try {
    const [assetsResult, packsResult, licensesResult] = await Promise.all([
      pool.query(
        `
        SELECT id, title, description, image_url, created_at
        FROM assets
        ORDER BY created_at DESC
        LIMIT 12
        `
      ),
      pool.query(
        `
        SELECT id, title, description, price, status, category, cover_asset_id, created_at, updated_at
        FROM packs
        WHERE status = 'published'
        ORDER BY updated_at DESC
        LIMIT 12
        `
      ),
      pool.query(
        `
        SELECT id, asset_id, type, price, usage, created_at
        FROM licenses
        ORDER BY created_at DESC
        LIMIT 12
        `
      )
    ]);

    res.status(200).json({
      message: "Explore feed fetched successfully",
      data: normalizeResponseData({
        assets: assetsResult.rows,
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
        SELECT *
        FROM purchases
        WHERE creator_user_id = $1
        ORDER BY created_at DESC
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
        SELECT *
        FROM purchases
        WHERE buyer_user_id = $1
        ORDER BY created_at DESC
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
      SELECT *
      FROM license_grants
      WHERE buyer_user_id = $1
      ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    res.status(200).json({
      message: "Entitlements fetched successfully",
      data: normalizeResponseData(result.rows)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching entitlements",
      error: error.message
    });
  }
};
