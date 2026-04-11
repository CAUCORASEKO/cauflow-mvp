import { pool } from "../config/db.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeResponseData } from "../utils/normalize-response.js";
import { buildAssetDeleteBlockMessage } from "../utils/delete-constraints.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_VISUAL_TYPE = "photography";
const VISUAL_TYPES = new Set([
  "photography",
  "illustration",
  "concept_art",
  "character_design",
  "environment",
  "brand_visual"
]);
const ASSET_STATUSES = new Set(["draft", "published", "archived"]);

const normalizeVisualType = (value, fallback = DEFAULT_VISUAL_TYPE) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  const normalizedValue = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (!VISUAL_TYPES.has(normalizedValue)) {
    throw new Error(
      "visualType must be one of: photography, illustration, concept_art, character_design, environment, brand_visual"
    );
  }

  return normalizedValue;
};

const normalizeAssetStatus = (value, fallback = "published") => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (!ASSET_STATUSES.has(normalizedValue)) {
    throw new Error("status must be one of: draft, published, archived");
  }

  return normalizedValue;
};

const removeUploadedFile = async (filePath) => {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`Failed to remove uploaded file: ${filePath}`, error.message);
    }
  }
};

export const uploadAsset = async (req, res) => {
  const uploadedFilePath = req.file?.path;

  try {
    const { title, description, visualType, status } = req.body;
    const normalizedTitle = title?.trim();

    if (!normalizedTitle) {
      await removeUploadedFile(uploadedFilePath);

      return res.status(400).json({
        message: "title is required"
      });
    }

    const normalizedVisualType = normalizeVisualType(visualType);
    const normalizedStatus = normalizeAssetStatus(status);
    const imageUrl = req.file ? `/uploads/assets/${req.file.filename}` : null;

    const result = await pool.query(
      `
      INSERT INTO assets (title, description, image_url, visual_type, status, owner_user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        normalizedTitle,
        description || null,
        imageUrl,
        normalizedVisualType,
        normalizedStatus,
        req.user.id
      ]
    );

    res.status(201).json({
      message: "Asset uploaded successfully",
      data: normalizeResponseData(result.rows[0])
    });
  } catch (error) {
    await removeUploadedFile(uploadedFilePath);

    const statusCode =
      error.message.includes("required") || error.message.includes("must be one of")
        ? 400
        : 500;

    res.status(statusCode).json({
      message: statusCode === 400 ? "Invalid asset input" : "Error creating asset",
      error: error.message
    });
  }
};

export const getAssets = async (req, res) => {
  try {
    const result =
      req.user?.role === "creator"
        ? await pool.query(
            `
            SELECT * FROM assets
            WHERE owner_user_id = $1
            ORDER BY id ASC
            `,
            [req.user.id]
          )
        : await pool.query(`
            SELECT * FROM assets
            WHERE status = 'published'
            ORDER BY id ASC
          `);

    res.status(200).json({
      message: "Assets fetched successfully",
      data: normalizeResponseData(result.rows)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching assets",
      error: error.message
    });
  }
};

export const getAssetById = async (req, res) => {
  try {
    const assetId = Number(req.params.id);

    const result = await pool.query(
      `
      SELECT * FROM assets
      WHERE id = $1
        AND ($2::text IS DISTINCT FROM 'creator' OR owner_user_id = $3)
        AND ($2::text = 'creator' OR status = 'published')
      `,
      [assetId, req.user?.role || null, req.user?.id || null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Asset not found"
      });
    }

    res.status(200).json({
      message: "Asset fetched successfully",
      data: normalizeResponseData(result.rows[0])
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching asset",
      error: error.message
    });
  }
};

export const updateAsset = async (req, res) => {
  const uploadedFilePath = req.file?.path;

  try {
    const assetId = Number(req.params.id);
    const { title, description, visualType, status } = req.body;
    const normalizedTitle = title?.trim();

    if (!normalizedTitle) {
      await removeUploadedFile(uploadedFilePath);

      return res.status(400).json({
        message: "title is required"
      });
    }

    const existingAssetResult = await pool.query(
      `
      SELECT * FROM assets
      WHERE id = $1
        AND ($2 = 'admin' OR owner_user_id = $3)
      `,
      [assetId, req.user.role, req.user.id]
    );

    if (existingAssetResult.rows.length === 0) {
      await removeUploadedFile(uploadedFilePath);

      return res.status(404).json({
        message: "Asset not found"
      });
    }

    const existingAsset = existingAssetResult.rows[0];
    const normalizedVisualType = normalizeVisualType(
      visualType,
      existingAsset.visual_type || DEFAULT_VISUAL_TYPE
    );
    const normalizedStatus = normalizeAssetStatus(status, existingAsset.status || "published");
    const nextImageUrl = req.file
      ? `/uploads/assets/${req.file.filename}`
      : existingAsset.image_url;

    const updatedAssetResult = await pool.query(
      `
      UPDATE assets
      SET title = $1, description = $2, image_url = $3, visual_type = $4, status = $5
      WHERE id = $6
      RETURNING *
      `,
      [
        normalizedTitle,
        description || null,
        nextImageUrl,
        normalizedVisualType,
        normalizedStatus,
        assetId
      ]
    );

    if (req.file && existingAsset.image_url?.startsWith("/uploads/")) {
      const relativeUploadPath = existingAsset.image_url.replace(/^\//, "");
      const absoluteUploadPath = path.join(__dirname, "..", "..", relativeUploadPath);
      await removeUploadedFile(absoluteUploadPath);
    }

    res.status(200).json({
      message: "Asset updated successfully",
      data: normalizeResponseData(updatedAssetResult.rows[0])
    });
  } catch (error) {
    await removeUploadedFile(uploadedFilePath);

    const statusCode =
      error.message.includes("required") || error.message.includes("must be one of")
        ? 400
        : 500;

    res.status(statusCode).json({
      message: statusCode === 400 ? "Invalid asset input" : "Error updating asset",
      error: error.message
    });
  }
};

export const deleteAsset = async (req, res) => {
  try {
    const assetId = Number(req.params.id);

    const assetResult = await pool.query(
      `
      SELECT *
      FROM assets
      WHERE id = $1
        AND ($2 = 'admin' OR owner_user_id = $3)
      LIMIT 1
      `,
      [assetId, req.user.role, req.user.id]
    );

    if (assetResult.rows.length === 0) {
      return res.status(404).json({
        message: "Asset not found"
      });
    }

    const [packCoverResult, packInclusionResult, licenseResult, purchaseResult, grantResult] =
      await Promise.all([
        pool.query(
          `
          SELECT COUNT(*)::int AS value
          FROM packs
          WHERE cover_asset_id = $1
          `,
          [assetId]
        ),
        pool.query(
          `
          SELECT COUNT(*)::int AS value
          FROM pack_assets
          WHERE asset_id = $1
          `,
          [assetId]
        ),
        pool.query(
          `
          SELECT COUNT(*)::int AS value
          FROM licenses
          WHERE asset_id = $1
          `,
          [assetId]
        ),
        pool.query(
          `
          SELECT COUNT(*)::int AS value
          FROM purchases
          WHERE asset_id = $1
          `,
          [assetId]
        ),
        pool.query(
          `
          SELECT COUNT(*)::int AS value
          FROM license_grants
          WHERE asset_id = $1
          `,
          [assetId]
        )
      ]);

    const dependencyCounts = {
      packCoverCount: packCoverResult.rows[0]?.value || 0,
      packInclusionCount: packInclusionResult.rows[0]?.value || 0,
      licenseCount: licenseResult.rows[0]?.value || 0,
      purchaseCount: purchaseResult.rows[0]?.value || 0,
      grantCount: grantResult.rows[0]?.value || 0
    };

    if (Object.values(dependencyCounts).some((count) => count > 0)) {
      return res.status(409).json({
        message: buildAssetDeleteBlockMessage(dependencyCounts),
        code: "ASSET_DELETE_BLOCKED"
      });
    }

    const result = await pool.query(
      `
      DELETE FROM assets
      WHERE id = $1
        AND ($2 = 'admin' OR owner_user_id = $3)
      RETURNING *
      `,
      [assetId, req.user.role, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Asset not found"
      });
    }

    const deletedAsset = result.rows[0] || assetResult.rows[0];

    if (deletedAsset.image_url?.startsWith("/uploads/")) {
      const relativeUploadPath = deletedAsset.image_url.replace(/^\//, "");
      const absoluteUploadPath = path.join(__dirname, "..", "..", relativeUploadPath);
      await removeUploadedFile(absoluteUploadPath);
    }

    res.status(200).json({
      message: "Asset deleted successfully",
      data: normalizeResponseData(deletedAsset)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting asset",
      error: error.message
    });
  }
};
