import { pool } from "../config/db.js";
import { normalizeResponseData } from "../utils/normalize-response.js";
import {
  getDefaultLicensePolicy,
  validateAndBuildPolicy
} from "../utils/license-policy.js";
import {
  buildLicenseDeleteBlockMessage,
  getLicenseDeleteDependencyState
} from "../utils/delete-constraints.js";
import { normalizeAssetOfferClass } from "../utils/asset-delivery.js";

const LICENSE_STATUSES = new Set(["draft", "published", "archived"]);
const LICENSE_SOURCE_TYPES = new Set(["asset", "pack"]);

const normalizeLicenseStatus = (value, fallback = "published") => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (!LICENSE_STATUSES.has(normalizedValue)) {
    throw new Error("status must be one of: draft, published, archived");
  }

  return normalizedValue;
};

const fetchPolicyByLicenseId = async (db, licenseId) => {
  const result = await db.query(
    `
    SELECT * FROM license_policies
    WHERE license_id = $1
    `,
    [licenseId]
  );

  return result.rows[0] || null;
};

const fetchLicenseWithPolicyById = async (db, licenseId) => {
  const licenseResult = await db.query(
    `
    SELECT
      l.*,
      row_to_json(source_asset_summary) AS source_asset,
      row_to_json(source_pack_summary) AS source_pack,
      COALESCE(source_asset_summary.title, source_pack_summary.title) AS source_title
    FROM licenses l
    LEFT JOIN LATERAL (
      SELECT
        a.id,
        a.title,
        a.description,
        a.image_url,
        a.preview_image_url,
        a.visual_type,
        a.offer_class,
        a.status,
        a.created_at,
        a.owner_user_id
      FROM assets a
      WHERE a.id = COALESCE(l.source_asset_id, l.asset_id)
    ) AS source_asset_summary ON true
    LEFT JOIN LATERAL (
      SELECT
        p.id,
        p.title,
        p.description,
        p.cover_asset_id,
        p.price,
        p.status,
        p.category,
        p.license_id,
        p.created_at,
        p.updated_at,
        p.owner_user_id
      FROM packs p
      WHERE p.id = l.source_pack_id
    ) AS source_pack_summary ON true
    WHERE l.id = $1
    `,
    [licenseId]
  );

  if (licenseResult.rows.length === 0) {
    return null;
  }

  const license = licenseResult.rows[0];
  const policy = await fetchPolicyByLicenseId(db, licenseId);

  return {
    ...license,
    policy
  };
};

const attachPoliciesToLicenses = async (db, licenses) => {
  if (licenses.length === 0) {
    return [];
  }

  const licenseIds = licenses.map((license) => license.id);
  const policyResult = await db.query(
    `
    SELECT * FROM license_policies
    WHERE license_id = ANY($1::int[])
    `,
    [licenseIds]
  );

  const policyByLicenseId = new Map(
    policyResult.rows.map((policy) => [policy.license_id, policy])
  );

  return licenses.map((license) => ({
    ...license,
    policy: policyByLicenseId.get(license.id) || null
  }));
};

const normalizeLicenseSourceType = (value, fallback = "asset") => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (!LICENSE_SOURCE_TYPES.has(normalizedValue)) {
    throw new Error("sourceType must be one of: asset, pack");
  }

  return normalizedValue;
};

const resolveLicenseSource = async (db, input, user) => {
  const sourceType = normalizeLicenseSourceType(input.sourceType ?? (input.packId ? "pack" : "asset"));
  const assetIdCandidate = input.sourceAssetId ?? input.assetId;
  const packIdCandidate = input.sourcePackId ?? input.packId;

  if (sourceType === "asset") {
    const numericAssetId = Number(assetIdCandidate);

    if (!Number.isInteger(numericAssetId) || numericAssetId <= 0) {
      throw new Error("sourceAssetId is required");
    }

    const assetResult = await db.query(
      `
      SELECT *
      FROM assets
      WHERE id = $1
        AND ($2 = 'admin' OR owner_user_id = $3)
      `,
      [numericAssetId, user.role, user.id]
    );

    if (assetResult.rows.length === 0) {
      throw new Error("Asset not found. Cannot create license.");
    }

    return {
      sourceType: "asset",
      sourceAssetId: numericAssetId,
      sourcePackId: null,
      compatibilityAssetId: numericAssetId,
      offerClass: normalizeAssetOfferClass(assetResult.rows[0].offer_class, "premium")
    };
  }

  const numericPackId = Number(packIdCandidate);

  if (!Number.isInteger(numericPackId) || numericPackId <= 0) {
    throw new Error("sourcePackId is required");
  }

  const packResult = await db.query(
    `
    SELECT *
    FROM packs
    WHERE id = $1
      AND ($2 = 'admin' OR owner_user_id = $3)
    `,
    [numericPackId, user.role, user.id]
  );

  if (packResult.rows.length === 0) {
    throw new Error("Pack not found. Cannot create license.");
  }

  return {
    sourceType: "pack",
    sourceAssetId: null,
    sourcePackId: numericPackId,
    compatibilityAssetId: null,
    offerClass: "premium"
  };
};

const upsertLicensePolicy = async (db, licenseId, policyInput) => {
  const existingPolicy = await fetchPolicyByLicenseId(db, licenseId);
  const policy = validateAndBuildPolicy(
    policyInput,
    existingPolicy
      ? normalizeResponseData(existingPolicy)
      : getDefaultLicensePolicy()
  );

  if (existingPolicy) {
    await db.query(
      `
      UPDATE license_policies
      SET commercial_use = $1,
          ai_training = $2,
          derivative_works = $3,
          attribution = $4,
          license_scope = $5,
          redistribution = $6,
          usage_type = $7,
          policy_version = $8,
          summary = $9,
          updated_at = CURRENT_TIMESTAMP
      WHERE license_id = $10
      `,
      [
        policy.commercialUse,
        policy.aiTraining,
        policy.derivativeWorks,
        policy.attribution,
        policy.licenseScope,
        policy.redistribution,
        policy.usageType,
        policy.policyVersion,
        policy.summary,
        licenseId
      ]
    );
  } else {
    await db.query(
      `
      INSERT INTO license_policies (
        license_id,
        commercial_use,
        ai_training,
        derivative_works,
        attribution,
        license_scope,
        redistribution,
        usage_type,
        policy_version,
        summary
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        licenseId,
        policy.commercialUse,
        policy.aiTraining,
        policy.derivativeWorks,
        policy.attribution,
        policy.licenseScope,
        policy.redistribution,
        policy.usageType,
        policy.policyVersion,
        policy.summary
      ]
    );
  }
};

const deleteLicensePolicy = async (db, licenseId) => {
  await db.query(
    `
    DELETE FROM license_policies
    WHERE license_id = $1
    `,
    [licenseId]
  );
};

export const createLicense = async (req, res) => {
  const client = await pool.connect();

  try {
    const { type, price, usage, policy, status } = req.body;

    if (!type || price === undefined || !usage) {
      return res.status(400).json({
        message: "sourceType, sourceAssetId or sourcePackId, type, price and usage are required"
      });
    }

    const normalizedStatus = normalizeLicenseStatus(status);
    const source = await resolveLicenseSource(client, req.body, req.user);
    const normalizedOfferClass = source.offerClass || "premium";
    const normalizedPrice =
      normalizedOfferClass === "free_use" ? 0 : Number(price);

    if (Number.isNaN(normalizedPrice)) {
      return res.status(400).json({
        message: "price must be a valid number"
      });
    }

    await client.query("BEGIN");

    const result = await client.query(
      `
      INSERT INTO licenses (
        asset_id,
        source_type,
        source_asset_id,
        source_pack_id,
        type,
        price,
        usage,
        offer_class,
        status,
        owner_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
      `,
      [
        source.compatibilityAssetId,
        source.sourceType,
        source.sourceAssetId,
        source.sourcePackId,
        type,
        normalizedPrice,
        usage,
        normalizedOfferClass,
        normalizedStatus,
        req.user.id
      ]
    );

    const createdLicense = result.rows[0];

    if (policy && typeof policy === "object") {
      await upsertLicensePolicy(client, createdLicense.id, policy);
    }

    await client.query("COMMIT");

    const licenseWithPolicy = await fetchLicenseWithPolicyById(client, createdLicense.id);

    res.status(201).json({
      message: "License created successfully",
      data: normalizeResponseData(licenseWithPolicy)
    });
  } catch (error) {
    await client.query("ROLLBACK");

    const statusCode =
      error.message === "policy must be a valid object" ||
      error.message.startsWith("policy.") ||
      error.message.includes("status must be one of") ||
      error.message.includes("sourceType must be one of") ||
      error.message.includes("sourceAssetId is required") ||
      error.message.includes("sourcePackId is required")
        ? 400
        : error.message.includes("not found. Cannot create license.")
          ? 404
          : 500;

    res.status(statusCode).json({
      message:
        statusCode === 400
          ? "Invalid license input"
          : statusCode === 404
            ? error.message
            : "Error creating license",
      error: error.message
    });
  } finally {
    client.release();
  }
};

export const getLicenses = async (req, res) => {
  try {
    const result =
      req.user?.role === "creator"
        ? await pool.query(
            `
            SELECT
              l.*,
              row_to_json(source_asset_summary) AS source_asset,
              row_to_json(source_pack_summary) AS source_pack,
              COALESCE(source_asset_summary.title, source_pack_summary.title) AS source_title
            FROM licenses l
            LEFT JOIN LATERAL (
              SELECT
                a.id,
                a.title,
                a.description,
                a.image_url,
                a.preview_image_url,
                a.visual_type,
                a.offer_class,
                a.status,
                a.created_at,
                a.owner_user_id
              FROM assets a
              WHERE a.id = COALESCE(l.source_asset_id, l.asset_id)
            ) AS source_asset_summary ON true
            LEFT JOIN LATERAL (
              SELECT
                p.id,
                p.title,
                p.description,
                p.cover_asset_id,
                p.price,
                p.status,
                p.category,
                p.license_id,
                p.created_at,
                p.updated_at,
                p.owner_user_id
              FROM packs p
              WHERE p.id = l.source_pack_id
            ) AS source_pack_summary ON true
            WHERE l.owner_user_id = $1
            ORDER BY l.id ASC
            `,
            [req.user.id]
          )
        : await pool.query(`
            SELECT
              l.*,
              row_to_json(source_asset_summary) AS source_asset,
              row_to_json(source_pack_summary) AS source_pack,
              COALESCE(source_asset_summary.title, source_pack_summary.title) AS source_title
            FROM licenses l
            LEFT JOIN LATERAL (
              SELECT
                a.id,
                a.title,
                a.description,
                a.image_url,
                a.preview_image_url,
                a.visual_type,
                a.offer_class,
                a.status,
                a.created_at,
                a.owner_user_id
              FROM assets a
              WHERE a.id = COALESCE(l.source_asset_id, l.asset_id)
            ) AS source_asset_summary ON true
            LEFT JOIN LATERAL (
              SELECT
                p.id,
                p.title,
                p.description,
                p.cover_asset_id,
                p.price,
                p.status,
                p.category,
                p.license_id,
                p.created_at,
                p.updated_at,
                p.owner_user_id
              FROM packs p
              WHERE p.id = l.source_pack_id
            ) AS source_pack_summary ON true
            WHERE l.status = 'published'
            ORDER BY l.id ASC
          `);

    const licensesWithPolicies = await attachPoliciesToLicenses(pool, result.rows);

    res.status(200).json({
      message: "Licenses fetched successfully",
      data: normalizeResponseData(licensesWithPolicies)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching licenses",
      error: error.message
    });
  }
};

export const getLicenseById = async (req, res) => {
  try {
    const licenseId = Number(req.params.id);
    const licenseWithPolicy = await fetchLicenseWithPolicyById(pool, licenseId);

    if (!licenseWithPolicy) {
      return res.status(404).json({
        message: "License not found"
      });
    }

    if (req.user?.role === "creator" && licenseWithPolicy.owner_user_id !== req.user.id) {
      return res.status(404).json({
        message: "License not found"
      });
    }

    if (req.user?.role !== "creator" && licenseWithPolicy.status !== "published") {
      return res.status(404).json({
        message: "License not found"
      });
    }

    res.status(200).json({
      message: "License fetched successfully",
      data: normalizeResponseData(licenseWithPolicy)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching license",
      error: error.message
    });
  }
};

export const updateLicense = async (req, res) => {
  const client = await pool.connect();

  try {
    const licenseId = Number(req.params.id);
    const { type, price, usage, policy, status } = req.body;

    if (!type || price === undefined || !usage) {
      return res.status(400).json({
        message: "type, price and usage are required"
      });
    }

    const existingLicenseResult = await client.query(
      `
      SELECT *
      FROM licenses
      WHERE id = $1
        AND ($2 = 'admin' OR owner_user_id = $3)
      LIMIT 1
      `,
      [licenseId, req.user.role, req.user.id]
    );

    if (existingLicenseResult.rows.length === 0) {
      return res.status(404).json({
        message: "License not found"
      });
    }

    const normalizedStatus = normalizeLicenseStatus(
      status,
      existingLicenseResult.rows[0].status || "published"
    );
    const normalizedOfferClass = normalizeAssetOfferClass(
      existingLicenseResult.rows[0].offer_class,
      "premium"
    );
    const normalizedPrice =
      normalizedOfferClass === "free_use" ? 0 : Number(price);

    if (Number.isNaN(normalizedPrice)) {
      return res.status(400).json({
        message: "price must be a valid number"
      });
    }

    await client.query("BEGIN");

    const result = await client.query(
      `
      UPDATE licenses
      SET asset_id = CASE
            WHEN source_type = 'asset' THEN COALESCE(source_asset_id, asset_id)
            ELSE NULL
          END,
          type = $1,
          price = $2,
          usage = $3,
          offer_class = $4,
          status = $5
      WHERE id = $6
        AND ($7 = 'admin' OR owner_user_id = $8)
      RETURNING *
      `,
      [
        type,
        normalizedPrice,
        usage,
        normalizedOfferClass,
        normalizedStatus,
        licenseId,
        req.user.role,
        req.user.id
      ]
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "License not found"
      });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "policy")) {
      if (policy === null) {
        await deleteLicensePolicy(client, licenseId);
      } else {
        await upsertLicensePolicy(client, licenseId, policy);
      }
    }

    await client.query("COMMIT");

    const updatedLicense = await fetchLicenseWithPolicyById(client, licenseId);

    res.status(200).json({
      message: "License updated successfully",
      data: normalizeResponseData(updatedLicense)
    });
  } catch (error) {
    await client.query("ROLLBACK");

    const statusCode =
      error.message === "policy must be a valid object" ||
      error.message.startsWith("policy.") ||
      error.message.includes("status must be one of")
        ? 400
        : 500;

    res.status(statusCode).json({
      message: statusCode === 400 ? "Invalid license policy" : "Error updating license",
      error: error.message
    });
  } finally {
    client.release();
  }
};

export const deleteLicense = async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const licenseId = Number(req.params.id);

    const licenseResult = await client.query(
      `
      SELECT *
      FROM licenses
      WHERE id = $1
        AND ($2 = 'admin' OR owner_user_id = $3)
      LIMIT 1
      `,
      [licenseId, req.user.role, req.user.id]
    );

    if (licenseResult.rows.length === 0) {
      return res.status(404).json({
        message: "License not found"
      });
    }

    const dependencyState = await getLicenseDeleteDependencyState(client, licenseId);

    if (!dependencyState.canDelete) {
      return res.status(409).json({
        message: buildLicenseDeleteBlockMessage(dependencyState),
        code: "LICENSE_DELETE_BLOCKED"
      });
    }

    await client.query("BEGIN");
    transactionStarted = true;

    const result = await client.query(
      `
      DELETE FROM licenses
      WHERE id = $1
        AND ($2 = 'admin' OR owner_user_id = $3)
      RETURNING *
      `,
      [licenseId, req.user.role, req.user.id]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    res.status(200).json({
      message: "License deleted successfully",
      data: normalizeResponseData(result.rows[0] || licenseResult.rows[0])
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    res.status(500).json({
      message: "Error deleting license",
      error: error.message
    });
  } finally {
    client.release();
  }
};
