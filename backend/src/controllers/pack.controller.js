import { pool } from "../config/db.js";
import { normalizeResponseData } from "../utils/normalize-response.js";

const PACK_STATUSES = new Set(["draft", "published"]);
const PACK_CATEGORIES = new Set([
  "visual",
  "brand",
  "character",
  "concept",
  "dataset",
  "prompt",
  "mixed"
]);

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const parseAssetIds = (assetIds) => {
  if (!Array.isArray(assetIds) || assetIds.length === 0) {
    throw new Error("assetIds must contain at least one asset");
  }

  const normalizedAssetIds = assetIds.map((assetId) => Number(assetId));

  if (normalizedAssetIds.some((assetId) => !Number.isInteger(assetId) || assetId <= 0)) {
    throw new Error("assetIds must contain valid asset ids");
  }

  return [...new Set(normalizedAssetIds)];
};

const validatePackInput = async (db, input, user) => {
  const {
    title,
    description,
    coverAssetId,
    price,
    status,
    category,
    licenseId,
    assetIds
  } = input;

  if (!isNonEmptyString(title)) {
    throw new Error("title is required");
  }

  if (!isNonEmptyString(description)) {
    throw new Error("description is required");
  }

  const numericCoverAssetId = Number(coverAssetId);
  if (!Number.isInteger(numericCoverAssetId) || numericCoverAssetId <= 0) {
    throw new Error("coverAssetId is required");
  }

  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice)) {
    throw new Error("price is required");
  }

  if (!PACK_STATUSES.has(status)) {
    throw new Error("status must be one of: draft, published");
  }

  if (!PACK_CATEGORIES.has(category)) {
    throw new Error(
      "category must be one of: visual, brand, character, concept, dataset, prompt, mixed"
    );
  }

  const normalizedAssetIds = parseAssetIds(assetIds);

  if (!normalizedAssetIds.includes(numericCoverAssetId)) {
    throw new Error("coverAssetId must be included in assetIds");
  }

  const assetResult = await db.query(
    `
    SELECT id
    FROM assets
    WHERE id = ANY($1::int[])
      AND ($2 = 'admin' OR owner_user_id = $3)
    `,
    [normalizedAssetIds, user.role, user.id]
  );

  if (assetResult.rows.length !== normalizedAssetIds.length) {
    throw new Error("One or more assetIds do not exist");
  }

  const coverAssetResult = await db.query(
    `
    SELECT id
    FROM assets
    WHERE id = $1
      AND ($2 = 'admin' OR owner_user_id = $3)
    `,
    [numericCoverAssetId, user.role, user.id]
  );

  if (coverAssetResult.rows.length === 0) {
    throw new Error("coverAssetId must exist");
  }

  let numericLicenseId = null;

  if (licenseId !== undefined && licenseId !== null && licenseId !== "") {
    numericLicenseId = Number(licenseId);

    if (!Number.isInteger(numericLicenseId) || numericLicenseId <= 0) {
      throw new Error("licenseId must be a valid license id");
    }

    const licenseResult = await db.query(
      `
      SELECT id
      FROM licenses
      WHERE id = $1
        AND ($2 = 'admin' OR owner_user_id = $3)
      `,
      [numericLicenseId, user.role, user.id]
    );

    if (licenseResult.rows.length === 0) {
      throw new Error("licenseId must exist");
    }
  }

  return {
    title: title.trim(),
    description: description.trim(),
    coverAssetId: numericCoverAssetId,
    price: numericPrice,
    status,
    category,
    licenseId: numericLicenseId,
    assetIds: normalizedAssetIds
  };
};

const replacePackAssets = async (db, packId, assetIds) => {
  await db.query(
    `
    DELETE FROM pack_assets
    WHERE pack_id = $1
    `,
    [packId]
  );

  for (const [position, assetId] of assetIds.entries()) {
    await db.query(
      `
      INSERT INTO pack_assets (pack_id, asset_id, position)
      VALUES ($1, $2, $3)
      `,
      [packId, assetId, position]
    );
  }
};

const fetchPackById = async (db, packId) => {
  const packResult = await db.query(
    `
    SELECT
      p.*,
      (
        SELECT COUNT(*)::int
        FROM pack_assets pa
        WHERE pa.pack_id = p.id
      ) AS asset_count,
      (
        SELECT row_to_json(cover_asset)
        FROM (
          SELECT
            a.id,
            a.title,
            a.description,
            a.image_url,
            a.created_at
          FROM assets a
          WHERE a.id = p.cover_asset_id
        ) AS cover_asset
      ) AS cover_asset,
      (
        SELECT row_to_json(base_license)
        FROM (
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
        ) AS base_license
      ) AS license
    FROM packs p
    WHERE p.id = $1
    `,
    [packId]
  );

  if (packResult.rows.length === 0) {
    return null;
  }

  const assetResult = await db.query(
    `
    SELECT
      pa.id,
      pa.pack_id,
      pa.asset_id,
      pa.position,
      pa.created_at,
      row_to_json(asset_summary) AS asset
    FROM pack_assets pa
    JOIN LATERAL (
      SELECT
        a.id,
        a.title,
        a.description,
        a.image_url,
        a.created_at
      FROM assets a
      WHERE a.id = pa.asset_id
    ) AS asset_summary ON true
    WHERE pa.pack_id = $1
    ORDER BY pa.position ASC, pa.id ASC
    `,
    [packId]
  );

  return {
    ...packResult.rows[0],
    assets: assetResult.rows.map((row) => ({
      id: row.id,
      pack_id: row.pack_id,
      asset_id: row.asset_id,
      position: row.position,
      created_at: row.created_at,
      asset: row.asset
    }))
  };
};

export const createPack = async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const validatedPack = await validatePackInput(client, req.body, req.user);

    await client.query("BEGIN");
    transactionStarted = true;

    const packResult = await client.query(
      `
      INSERT INTO packs (
        title,
        description,
        cover_asset_id,
        price,
        status,
        category,
        license_id,
        owner_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
      `,
      [
        validatedPack.title,
        validatedPack.description,
        validatedPack.coverAssetId,
        validatedPack.price,
        validatedPack.status,
        validatedPack.category,
        validatedPack.licenseId,
        req.user.id
      ]
    );

    const packId = packResult.rows[0].id;
    await replacePackAssets(client, packId, validatedPack.assetIds);

    await client.query("COMMIT");

    const createdPack = await fetchPackById(client, packId);

    res.status(201).json({
      message: "Pack created successfully",
      data: normalizeResponseData(createdPack)
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    const statusCode =
      error.message.includes("required") ||
      error.message.includes("must") ||
      error.message.includes("assetIds")
        ? 400
        : 500;

    res.status(statusCode).json({
      message: statusCode === 400 ? "Invalid pack input" : "Error creating pack",
      error: error.message
    });
  } finally {
    client.release();
  }
};

export const getPacks = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        p.*,
        (
          SELECT COUNT(*)::int
          FROM pack_assets pa
          WHERE pa.pack_id = p.id
        ) AS asset_count,
        (
          SELECT row_to_json(cover_asset)
          FROM (
            SELECT
              a.id,
              a.title,
              a.description,
              a.image_url,
              a.created_at
            FROM assets a
            WHERE a.id = p.cover_asset_id
          ) AS cover_asset
        ) AS cover_asset,
        (
          SELECT row_to_json(base_license)
          FROM (
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
          ) AS base_license
        ) AS license
      FROM packs p
      ${req.user?.role === "creator" ? "WHERE p.owner_user_id = $1" : ""}
      ORDER BY p.created_at DESC, p.id DESC
      `,
      req.user?.role === "creator" ? [req.user.id] : []
    );

    res.status(200).json({
      message: "Packs fetched successfully",
      data: normalizeResponseData(result.rows)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching packs",
      error: error.message
    });
  }
};

export const getPackById = async (req, res) => {
  try {
    const packId = Number(req.params.id);
    const pack = await fetchPackById(pool, packId);

    if (!pack || (req.user?.role === "creator" && pack.owner_user_id !== req.user.id)) {
      return res.status(404).json({
        message: "Pack not found"
      });
    }

    res.status(200).json({
      message: "Pack fetched successfully",
      data: normalizeResponseData(pack)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching pack",
      error: error.message
    });
  }
};

export const updatePack = async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const packId = Number(req.params.id);
    const validatedPack = await validatePackInput(client, req.body, req.user);

    await client.query("BEGIN");
    transactionStarted = true;

    const updateResult = await client.query(
      `
      UPDATE packs
      SET title = $1,
          description = $2,
          cover_asset_id = $3,
          price = $4,
          status = $5,
          category = $6,
          license_id = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
        AND ($9 = 'admin' OR owner_user_id = $10)
      RETURNING id
      `,
      [
        validatedPack.title,
        validatedPack.description,
        validatedPack.coverAssetId,
        validatedPack.price,
        validatedPack.status,
        validatedPack.category,
        validatedPack.licenseId,
        packId,
        req.user.role,
        req.user.id
      ]
    );

    if (updateResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Pack not found"
      });
    }

    await replacePackAssets(client, packId, validatedPack.assetIds);
    await client.query("COMMIT");

    const updatedPack = await fetchPackById(client, packId);

    res.status(200).json({
      message: "Pack updated successfully",
      data: normalizeResponseData(updatedPack)
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    const statusCode =
      error.message.includes("required") ||
      error.message.includes("must") ||
      error.message.includes("assetIds")
        ? 400
        : 500;

    res.status(statusCode).json({
      message: statusCode === 400 ? "Invalid pack input" : "Error updating pack",
      error: error.message
    });
  } finally {
    client.release();
  }
};

export const deletePack = async (req, res) => {
  try {
    const packId = Number(req.params.id);

    const result = await pool.query(
      `
      DELETE FROM packs
      WHERE id = $1
        AND ($2 = 'admin' OR owner_user_id = $3)
      RETURNING *
      `,
      [packId, req.user.role, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Pack not found"
      });
    }

    res.status(200).json({
      message: "Pack deleted successfully",
      data: normalizeResponseData(result.rows[0])
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting pack",
      error: error.message
    });
  }
};
