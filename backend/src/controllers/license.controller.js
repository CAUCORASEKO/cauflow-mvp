import { pool } from "../config/db.js";
import { normalizeResponseData } from "../utils/normalize-response.js";
import {
  getDefaultLicensePolicy,
  validateAndBuildPolicy
} from "../utils/license-policy.js";
import { buildLicenseDeleteBlockMessage } from "../utils/delete-constraints.js";

const LICENSE_STATUSES = new Set(["draft", "published", "archived"]);

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
    SELECT * FROM licenses
    WHERE id = $1
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
    const { assetId, type, price, usage, policy, status } = req.body;

    if (!assetId || !type || price === undefined || !usage) {
      return res.status(400).json({
        message: "assetId, type, price and usage are required"
      });
    }

    const numericAssetId = Number(assetId);

    const assetResult = await client.query(
      `
      SELECT * FROM assets
      WHERE id = $1
        AND ($2 = 'admin' OR owner_user_id = $3)
      `,
      [numericAssetId, req.user.role, req.user.id]
    );

    if (assetResult.rows.length === 0) {
      return res.status(404).json({
        message: "Asset not found. Cannot create license."
      });
    }

    const normalizedStatus = normalizeLicenseStatus(status);

    await client.query("BEGIN");

    const result = await client.query(
      `
      INSERT INTO licenses (asset_id, type, price, usage, status, owner_user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [numericAssetId, type, price, usage, normalizedStatus, req.user.id]
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
      error.message.includes("status must be one of")
        ? 400
        : 500;

    res.status(statusCode).json({
      message: statusCode === 400 ? "Invalid license policy" : "Error creating license",
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
            SELECT * FROM licenses
            WHERE owner_user_id = $1
            ORDER BY id ASC
            `,
            [req.user.id]
          )
        : await pool.query(`
            SELECT * FROM licenses
            WHERE status = 'published'
            ORDER BY id ASC
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

    await client.query("BEGIN");

    const result = await client.query(
      `
      UPDATE licenses
      SET type = $1, price = $2, usage = $3, status = $4
      WHERE id = $5
        AND ($6 = 'admin' OR owner_user_id = $7)
      RETURNING *
      `,
      [type, price, usage, normalizedStatus, licenseId, req.user.role, req.user.id]
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
  try {
    const licenseId = Number(req.params.id);

    const licenseResult = await pool.query(
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

    const [packResult, purchaseResult, grantResult] = await Promise.all([
      pool.query(
        `
        SELECT COUNT(*)::int AS value
        FROM packs
        WHERE license_id = $1
        `,
        [licenseId]
      ),
      pool.query(
        `
        SELECT COUNT(*)::int AS value
        FROM purchases
        WHERE license_id = $1
        `,
        [licenseId]
      ),
      pool.query(
        `
        SELECT COUNT(*)::int AS value
        FROM license_grants
        WHERE license_id = $1
        `,
        [licenseId]
      )
    ]);

    const dependencyCounts = {
      packCount: packResult.rows[0]?.value || 0,
      purchaseCount: purchaseResult.rows[0]?.value || 0,
      grantCount: grantResult.rows[0]?.value || 0
    };

    if (
      dependencyCounts.packCount > 0 ||
      dependencyCounts.purchaseCount > 0 ||
      dependencyCounts.grantCount > 0
    ) {
      return res.status(409).json({
        message: buildLicenseDeleteBlockMessage(dependencyCounts),
        code: "LICENSE_DELETE_BLOCKED"
      });
    }

    const result = await pool.query(
      `
      DELETE FROM licenses
      WHERE id = $1
        AND ($2 = 'admin' OR owner_user_id = $3)
      RETURNING *
      `,
      [licenseId, req.user.role, req.user.id]
    );

    res.status(200).json({
      message: "License deleted successfully",
      data: normalizeResponseData(result.rows[0] || licenseResult.rows[0])
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting license",
      error: error.message
    });
  }
};
