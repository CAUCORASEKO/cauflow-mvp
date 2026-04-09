export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded", "canceled"];

export const PURCHASE_STATUSES = ["pending", "completed", "failed", "canceled", "refunded"];

export const fetchCreatorPayoutStatus = async (db, creatorUserId) => {
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

export const buildPurchaseSelect = (whereClause = "TRUE") => `
  SELECT
    p.*,
    row_to_json(payment_summary) AS payment,
    row_to_json(license_summary) AS license,
    row_to_json(asset_summary) AS asset,
    row_to_json(pack_summary) AS pack,
    row_to_json(creator_summary) AS creator,
    row_to_json(buyer_summary) AS buyer
  FROM purchases p
  LEFT JOIN LATERAL (
    SELECT
      pr.id,
      pr.provider,
      pr.provider_session_id,
      pr.amount,
      pr.currency,
      pr.status,
      pr.receipt_url,
      pr.created_at,
      pr.updated_at
    FROM payment_records pr
    WHERE pr.purchase_id = p.id
    ORDER BY pr.created_at DESC, pr.id DESC
    LIMIT 1
  ) AS payment_summary ON true
  LEFT JOIN LATERAL (
    SELECT
      l.id,
      l.asset_id,
      l.type,
      l.price,
      l.usage,
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
  ) AS license_summary ON true
  LEFT JOIN LATERAL (
    SELECT
      a.id,
      a.title,
      a.description,
      a.image_url,
      a.created_at,
      a.owner_user_id
    FROM assets a
    WHERE a.id = p.asset_id
  ) AS asset_summary ON true
  LEFT JOIN LATERAL (
    SELECT
      pk.id,
      pk.title,
      pk.description,
      pk.cover_asset_id,
      pk.price,
      pk.status,
      pk.category,
      pk.license_id,
      pk.created_at,
      pk.updated_at,
      pk.owner_user_id
    FROM packs pk
    WHERE pk.id = p.pack_id
  ) AS pack_summary ON true
  LEFT JOIN LATERAL (
    SELECT
      u.id,
      u.email,
      p2.public_display_name,
      p2.organization_name,
      p2.studio_name
    FROM users u
    LEFT JOIN profiles p2
      ON p2.user_id = u.id
    WHERE u.id = p.creator_user_id
  ) AS creator_summary ON true
  LEFT JOIN LATERAL (
    SELECT
      u.id,
      u.email,
      p2.public_display_name,
      p2.organization_name,
      p2.studio_name
    FROM users u
    LEFT JOIN profiles p2
      ON p2.user_id = u.id
    WHERE u.id = p.buyer_user_id
  ) AS buyer_summary ON true
  WHERE ${whereClause}
`;

export const fetchPurchaseById = async (db, purchaseId) => {
  const result = await db.query(`${buildPurchaseSelect("p.id = $1::integer")} LIMIT 1`, [
    purchaseId
  ]);
  return result.rows[0] || null;
};

export const buildGrantSelect = (whereClause = "TRUE") => `
  SELECT
    lg.*,
    row_to_json(purchase_summary) AS purchase,
    row_to_json(payment_summary) AS payment,
    row_to_json(license_summary) AS license,
    row_to_json(asset_summary) AS asset,
    row_to_json(pack_summary) AS pack,
    row_to_json(creator_summary) AS creator
  FROM license_grants lg
  LEFT JOIN LATERAL (
    ${buildPurchaseSelect("p.id = lg.purchase_id")}
    LIMIT 1
  ) AS purchase_summary ON true
  LEFT JOIN LATERAL (
    SELECT
      pr.id,
      pr.provider,
      pr.provider_session_id,
      pr.amount,
      pr.currency,
      pr.status,
      pr.receipt_url,
      pr.created_at,
      pr.updated_at
    FROM payment_records pr
    WHERE pr.purchase_id = lg.purchase_id
    ORDER BY pr.created_at DESC, pr.id DESC
    LIMIT 1
  ) AS payment_summary ON true
  LEFT JOIN LATERAL (
    SELECT
      l.id,
      l.asset_id,
      l.type,
      l.price,
      l.usage,
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
    WHERE l.id = lg.license_id
  ) AS license_summary ON true
  LEFT JOIN LATERAL (
    SELECT
      a.id,
      a.title,
      a.description,
      a.image_url,
      a.created_at,
      a.owner_user_id
    FROM assets a
    WHERE a.id = lg.asset_id
  ) AS asset_summary ON true
  LEFT JOIN LATERAL (
    SELECT
      pk.id,
      pk.title,
      pk.description,
      pk.cover_asset_id,
      pk.price,
      pk.status,
      pk.category,
      pk.license_id,
      pk.created_at,
      pk.updated_at,
      pk.owner_user_id
    FROM packs pk
    WHERE pk.id = lg.pack_id
  ) AS pack_summary ON true
  LEFT JOIN LATERAL (
    SELECT
      u.id,
      u.email,
      p2.public_display_name,
      p2.organization_name,
      p2.studio_name
    FROM users u
    LEFT JOIN profiles p2
      ON p2.user_id = u.id
    WHERE u.id = lg.creator_user_id
  ) AS creator_summary ON true
  WHERE ${whereClause}
`;

export const buildCheckoutSessionSelect = (whereClause = "pr.id = $1") => `
  SELECT
    pr.*,
    row_to_json(purchase_summary) AS purchase,
    row_to_json(license_summary) AS license,
    row_to_json(asset_summary) AS asset,
    row_to_json(pack_summary) AS pack,
    row_to_json(creator_summary) AS creator
  FROM payment_records pr
  LEFT JOIN LATERAL (
    ${buildPurchaseSelect("p.id = pr.purchase_id")}
    LIMIT 1
  ) AS purchase_summary ON true
  LEFT JOIN LATERAL (
    SELECT
      l.id,
      l.asset_id,
      l.type,
      l.price,
      l.usage,
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
    WHERE l.id = pr.license_id
  ) AS license_summary ON true
  LEFT JOIN LATERAL (
    SELECT
      a.id,
      a.title,
      a.description,
      a.image_url,
      a.created_at,
      a.owner_user_id
    FROM assets a
    WHERE a.id = pr.asset_id
  ) AS asset_summary ON true
  LEFT JOIN LATERAL (
    SELECT
      pk.id,
      pk.title,
      pk.description,
      pk.cover_asset_id,
      pk.price,
      pk.status,
      pk.category,
      pk.license_id,
      pk.created_at,
      pk.updated_at,
      pk.owner_user_id
    FROM packs pk
    WHERE pk.id = pr.pack_id
  ) AS pack_summary ON true
  LEFT JOIN LATERAL (
    SELECT
      u.id,
      u.email,
      p2.public_display_name,
      p2.organization_name,
      p2.studio_name,
      cs.payout_onboarding_status
    FROM users u
    LEFT JOIN profiles p2
      ON p2.user_id = u.id
    LEFT JOIN creator_settings cs
      ON cs.user_id = u.id
    WHERE u.id = pr.creator_user_id
  ) AS creator_summary ON true
  WHERE ${whereClause}
`;

export const fetchCheckoutSessionById = async (db, paymentRecordId) => {
  const result = await db.query(
    `${buildCheckoutSessionSelect("pr.id = $1::integer")} LIMIT 1`,
    [paymentRecordId]
  );

  return result.rows[0] || null;
};
