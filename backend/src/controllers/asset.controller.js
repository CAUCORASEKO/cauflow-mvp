import { pool } from "../config/db.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeResponseData } from "../utils/normalize-response.js";
import { buildAssetDeleteBlockMessage } from "../utils/delete-constraints.js";
import {
  buildStoredAssetFilePayload,
  getAssetPublicationState,
  getAssetReviewSubmissionBlockedReasons,
  normalizeAssetReviewStatus,
  serializeAssetRecord
} from "../utils/asset-delivery.js";

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

const normalizeAssetStatus = (value, fallback = "draft") => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (!ASSET_STATUSES.has(normalizedValue)) {
    throw new Error("status must be one of: draft, published, archived");
  }

  return normalizedValue;
};

const fetchOwnedAsset = async (assetId, user) =>
  pool.query(
    `
    SELECT * FROM assets
    WHERE id = $1
      AND ($2 = 'admin' OR owner_user_id = $3)
    `,
    [assetId, user.role, user.id]
  );

const ensureAssetCanPublish = (row) => {
  const publicationState = getAssetPublicationState(row);

  if (!publicationState.canPublish) {
    throw new Error(publicationState.publishBlockedReasons[0]);
  }

  return publicationState;
};

const getUploadedFiles = (req) => {
  const previewImage =
    req.files?.previewImage?.[0] || req.files?.image?.[0] || req.file || null;
  const masterFile = req.files?.masterFile?.[0] || null;

  return {
    previewImage,
    masterFile
  };
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

const cleanupUploadedRequestFiles = async (req) => {
  const { previewImage, masterFile } = getUploadedFiles(req);
  const uploadedPaths = [...new Set([previewImage?.path, masterFile?.path].filter(Boolean))];

  await Promise.all(uploadedPaths.map(removeUploadedFile));
};

const removeStoredUploadByUrl = async (url) => {
  if (!url?.startsWith("/uploads/")) {
    return;
  }

  const relativeUploadPath = url.replace(/^\//, "");
  const absoluteUploadPath = path.join(__dirname, "..", "..", relativeUploadPath);
  await removeUploadedFile(absoluteUploadPath);
};

const buildPreviewValues = (previewPayload) => ({
  imageUrl: previewPayload?.url || null,
  previewImageUrl: previewPayload?.url || null,
  previewFileName: previewPayload?.fileName || null,
  previewMimeType: previewPayload?.mimeType || null,
  previewFileSize: previewPayload?.fileSize || null,
  previewWidth: previewPayload?.width || null,
  previewHeight: previewPayload?.height || null,
  previewAspectRatio: previewPayload?.aspectRatio || null,
  previewResolutionSummary: previewPayload?.resolutionSummary || null
});

const buildMasterValues = (masterPayload) => ({
  masterFileUrl: masterPayload?.url || null,
  masterFileName: masterPayload?.fileName || null,
  masterMimeType: masterPayload?.mimeType || null,
  masterFileSize: masterPayload?.fileSize || null,
  masterWidth: masterPayload?.width || null,
  masterHeight: masterPayload?.height || null,
  masterAspectRatio: masterPayload?.aspectRatio || null,
  masterResolutionSummary: masterPayload?.resolutionSummary || null
});

const buildExistingPreviewValues = (assetRow) => ({
  imageUrl: assetRow.preview_image_url || assetRow.image_url || null,
  previewImageUrl: assetRow.preview_image_url || assetRow.image_url || null,
  previewFileName: assetRow.preview_file_name || null,
  previewMimeType: assetRow.preview_mime_type || null,
  previewFileSize: assetRow.preview_file_size ?? null,
  previewWidth: assetRow.preview_width ?? null,
  previewHeight: assetRow.preview_height ?? null,
  previewAspectRatio: assetRow.preview_aspect_ratio || null,
  previewResolutionSummary: assetRow.preview_resolution_summary || null
});

const buildExistingMasterValues = (assetRow) => ({
  masterFileUrl: assetRow.master_file_url || null,
  masterFileName: assetRow.master_file_name || null,
  masterMimeType: assetRow.master_mime_type || null,
  masterFileSize: assetRow.master_file_size ?? null,
  masterWidth: assetRow.master_width ?? null,
  masterHeight: assetRow.master_height ?? null,
  masterAspectRatio: assetRow.master_aspect_ratio || null,
  masterResolutionSummary: assetRow.master_resolution_summary || null
});

const isClientInputError = (message = "") =>
  [
    "required",
    "must be one of",
    "Unsupported file format",
    "Invalid PNG",
    "Invalid JPEG",
    "Invalid WebP",
    "Unable to read",
    "before it can be published"
  ].some((segment) => message.includes(segment));

export const uploadAsset = async (req, res) => {
  try {
    const { title, description, visualType, status } = req.body;
    const { previewImage, masterFile } = getUploadedFiles(req);
    const normalizedTitle = title?.trim();

    if (!normalizedTitle) {
      await cleanupUploadedRequestFiles(req);

      return res.status(400).json({
        message: "title is required"
      });
    }

    if (!previewImage) {
      await cleanupUploadedRequestFiles(req);

      return res.status(400).json({
        message: "preview image is required"
      });
    }

    const normalizedVisualType = normalizeVisualType(visualType);
    const normalizedStatus = normalizeAssetStatus(status);
    const previewPayload = await buildStoredAssetFilePayload(previewImage);
    const masterPayload = masterFile ? await buildStoredAssetFilePayload(masterFile) : null;
    const previewValues = buildPreviewValues(previewPayload);
    const masterValues = buildMasterValues(masterPayload);

    const candidateAsset = {
      image_url: previewValues.imageUrl,
      preview_image_url: previewValues.previewImageUrl,
      master_file_url: masterValues.masterFileUrl,
      master_file_name: masterValues.masterFileName,
      master_mime_type: masterValues.masterMimeType,
      master_file_size: masterValues.masterFileSize,
      master_width: masterValues.masterWidth,
      master_height: masterValues.masterHeight,
      master_aspect_ratio: masterValues.masterAspectRatio,
      master_resolution_summary: masterValues.masterResolutionSummary,
      review_status: "draft",
      status: normalizedStatus
    };

    if (normalizedStatus === "published") {
      ensureAssetCanPublish(candidateAsset);
    }

    const result = await pool.query(
      `
      INSERT INTO assets (
        title,
        description,
        image_url,
        preview_image_url,
        preview_file_name,
        preview_mime_type,
        preview_file_size,
        preview_width,
        preview_height,
        preview_aspect_ratio,
        preview_resolution_summary,
        master_file_url,
        master_file_name,
        master_mime_type,
        master_file_size,
        master_width,
        master_height,
        master_aspect_ratio,
        master_resolution_summary,
        visual_type,
        status,
        owner_user_id
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      )
      RETURNING *
      `,
      [
        normalizedTitle,
        description || null,
        previewValues.imageUrl,
        previewValues.previewImageUrl,
        previewValues.previewFileName,
        previewValues.previewMimeType,
        previewValues.previewFileSize,
        previewValues.previewWidth,
        previewValues.previewHeight,
        previewValues.previewAspectRatio,
        previewValues.previewResolutionSummary,
        masterValues.masterFileUrl,
        masterValues.masterFileName,
        masterValues.masterMimeType,
        masterValues.masterFileSize,
        masterValues.masterWidth,
        masterValues.masterHeight,
        masterValues.masterAspectRatio,
        masterValues.masterResolutionSummary,
        normalizedVisualType,
        normalizedStatus,
        req.user.id
      ]
    );

    res.status(201).json({
      message: "Asset uploaded successfully",
      data: normalizeResponseData(serializeAssetRecord(result.rows[0]))
    });
  } catch (error) {
    await cleanupUploadedRequestFiles(req);

    const statusCode = isClientInputError(error.message) ? 400 : 500;

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
        : req.user?.role === "admin"
          ? await pool.query(`
              SELECT * FROM assets
              ORDER BY id ASC
            `)
        : await pool.query(`
            SELECT * FROM assets
            WHERE status = 'published'
            ORDER BY id ASC
          `);

    const serializedAssets = result.rows.map(serializeAssetRecord);
    const visibleAssets =
      req.user?.role === "creator" || req.user?.role === "admin"
        ? serializedAssets
        : serializedAssets.filter((asset) => asset.buyer_visible);

    res.status(200).json({
      message: "Assets fetched successfully",
      data: normalizeResponseData(visibleAssets)
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
        AND (
          $2::text IN ('creator', 'admin')
          OR status = 'published'
        )
      `,
      [assetId, req.user?.role || null]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Asset not found"
      });
    }

    if (
      (req.user?.role === "creator" || req.user?.role === "admin") &&
      req.user?.role !== "admin" &&
      result.rows[0].owner_user_id !== req.user?.id
    ) {
      return res.status(404).json({
        message: "Asset not found"
      });
    }

    const serializedAsset = serializeAssetRecord(result.rows[0]);

    if (
      req.user?.role !== "creator" &&
      req.user?.role !== "admin" &&
      !serializedAsset.buyer_visible
    ) {
      return res.status(404).json({
        message: "Asset not found"
      });
    }

    res.status(200).json({
      message: "Asset fetched successfully",
      data: normalizeResponseData(serializedAsset)
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching asset",
      error: error.message
    });
  }
};

export const updateAsset = async (req, res) => {
  try {
    const assetId = Number(req.params.id);
    const { title, description, visualType, status } = req.body;
    const { previewImage, masterFile } = getUploadedFiles(req);
    const normalizedTitle = title?.trim();

    if (!normalizedTitle) {
      await cleanupUploadedRequestFiles(req);

      return res.status(400).json({
        message: "title is required"
      });
    }

    const existingAssetResult = await fetchOwnedAsset(assetId, req.user);

    if (existingAssetResult.rows.length === 0) {
      await cleanupUploadedRequestFiles(req);

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

    const previewPayload = previewImage ? await buildStoredAssetFilePayload(previewImage) : null;
    const masterPayload = masterFile ? await buildStoredAssetFilePayload(masterFile) : null;
    const nextPreviewValues = previewPayload
      ? buildPreviewValues(previewPayload)
      : buildExistingPreviewValues(existingAsset);
    const nextMasterValues = masterPayload
      ? buildMasterValues(masterPayload)
      : buildExistingMasterValues(existingAsset);
    const candidateAsset = {
      ...existingAsset,
      image_url: nextPreviewValues.imageUrl,
      preview_image_url: nextPreviewValues.previewImageUrl,
      master_file_url: nextMasterValues.masterFileUrl,
      master_file_name: nextMasterValues.masterFileName,
      master_mime_type: nextMasterValues.masterMimeType,
      master_file_size: nextMasterValues.masterFileSize,
      master_width: nextMasterValues.masterWidth,
      master_height: nextMasterValues.masterHeight,
      master_aspect_ratio: nextMasterValues.masterAspectRatio,
      master_resolution_summary: nextMasterValues.masterResolutionSummary,
      review_status: existingAsset.review_status,
      status: normalizedStatus
    };

    if (normalizedStatus === "published") {
      ensureAssetCanPublish(candidateAsset);
    }

    const updatedAssetResult = await pool.query(
      `
      UPDATE assets
      SET
        title = $1,
        description = $2,
        image_url = $3,
        preview_image_url = $4,
        preview_file_name = $5,
        preview_mime_type = $6,
        preview_file_size = $7,
        preview_width = $8,
        preview_height = $9,
        preview_aspect_ratio = $10,
        preview_resolution_summary = $11,
        master_file_url = $12,
        master_file_name = $13,
        master_mime_type = $14,
        master_file_size = $15,
        master_width = $16,
        master_height = $17,
        master_aspect_ratio = $18,
        master_resolution_summary = $19,
        visual_type = $20,
        status = $21
      WHERE id = $22
      RETURNING *
      `,
      [
        normalizedTitle,
        description || null,
        nextPreviewValues.imageUrl,
        nextPreviewValues.previewImageUrl,
        nextPreviewValues.previewFileName,
        nextPreviewValues.previewMimeType,
        nextPreviewValues.previewFileSize,
        nextPreviewValues.previewWidth,
        nextPreviewValues.previewHeight,
        nextPreviewValues.previewAspectRatio,
        nextPreviewValues.previewResolutionSummary,
        nextMasterValues.masterFileUrl,
        nextMasterValues.masterFileName,
        nextMasterValues.masterMimeType,
        nextMasterValues.masterFileSize,
        nextMasterValues.masterWidth,
        nextMasterValues.masterHeight,
        nextMasterValues.masterAspectRatio,
        nextMasterValues.masterResolutionSummary,
        normalizedVisualType,
        normalizedStatus,
        assetId
      ]
    );

    if (previewPayload) {
      await removeStoredUploadByUrl(existingAsset.preview_image_url || existingAsset.image_url);
    }

    if (masterPayload) {
      await removeStoredUploadByUrl(existingAsset.master_file_url);
    }

    res.status(200).json({
      message: "Asset updated successfully",
      data: normalizeResponseData(serializeAssetRecord(updatedAssetResult.rows[0]))
    });
  } catch (error) {
    await cleanupUploadedRequestFiles(req);

    const statusCode = isClientInputError(error.message) ? 400 : 500;

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

    await Promise.all(
      [
        deletedAsset.preview_image_url || deletedAsset.image_url,
        deletedAsset.master_file_url
      ]
        .filter((value, index, items) => value && items.indexOf(value) === index)
        .map(removeStoredUploadByUrl)
    );

    res.status(200).json({
      message: "Asset deleted successfully",
      data: normalizeResponseData(serializeAssetRecord(deletedAsset))
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting asset",
      error: error.message
    });
  }
};

export const submitAssetForReview = async (req, res) => {
  try {
    const assetId = Number(req.params.id);
    const assetResult = await fetchOwnedAsset(assetId, req.user);

    if (assetResult.rows.length === 0) {
      return res.status(404).json({
        message: "Asset not found"
      });
    }

    const asset = assetResult.rows[0];
    const reviewStatus = normalizeAssetReviewStatus(asset.review_status, "draft");

    if (reviewStatus === "in_review") {
      return res.status(409).json({
        message: "This asset is already in review"
      });
    }

    if (reviewStatus === "approved") {
      return res.status(409).json({
        message: "This asset has already been approved"
      });
    }

    const publicationState = getAssetPublicationState(asset);
    const blockedReasons = getAssetReviewSubmissionBlockedReasons(
      publicationState.deliveryReadiness
    );

    if (blockedReasons.length > 0) {
      return res.status(409).json({
        message: blockedReasons[0]
      });
    }

    const result = await pool.query(
      `
      UPDATE assets
      SET review_status = 'in_review',
          review_note = NULL
      WHERE id = $1
      RETURNING *
      `,
      [assetId]
    );

    res.status(200).json({
      message: "Asset submitted for review",
      data: normalizeResponseData(serializeAssetRecord(result.rows[0]))
    });
  } catch (error) {
    res.status(500).json({
      message: "Error submitting asset for review",
      error: error.message
    });
  }
};

export const updateAssetReview = async (req, res) => {
  try {
    const assetId = Number(req.params.id);
    const assetResult = await fetchOwnedAsset(assetId, req.user);

    if (assetResult.rows.length === 0) {
      return res.status(404).json({
        message: "Asset not found"
      });
    }

    const asset = assetResult.rows[0];
    const reviewStatus = normalizeAssetReviewStatus(req.body.reviewStatus);
    const reviewNote =
      typeof req.body.reviewNote === "string" && req.body.reviewNote.trim().length > 0
        ? req.body.reviewNote.trim()
        : null;

    if (reviewStatus === "in_review") {
      return res.status(400).json({
        message: "Use submit for review to move an asset into review"
      });
    }

    if (reviewStatus === "rejected" && !reviewNote) {
      return res.status(400).json({
        message: "A review note is required when rejecting an asset"
      });
    }

    if (reviewStatus === "approved") {
      const publicationState = getAssetPublicationState(asset);
      const blockedReasons = getAssetReviewSubmissionBlockedReasons(
        publicationState.deliveryReadiness
      );

      if (blockedReasons.length > 0) {
        return res.status(409).json({
          message: blockedReasons[0].replace("submitted for review", "approved")
        });
      }
    }

    const nextCatalogStatus =
      reviewStatus === "approved" ? asset.status : asset.status === "published" ? "draft" : asset.status;

    const result = await pool.query(
      `
      UPDATE assets
      SET review_status = $1,
          review_note = $2,
          status = $3
      WHERE id = $4
      RETURNING *
      `,
      [reviewStatus, reviewNote, nextCatalogStatus, assetId]
    );

    res.status(200).json({
      message: "Asset review updated",
      data: normalizeResponseData(serializeAssetRecord(result.rows[0]))
    });
  } catch (error) {
    const statusCode =
      error.message.includes("reviewStatus must be one of") ||
      error.message.includes("required when rejecting")
        ? 400
        : error.message.includes("before it can be approved")
          ? 409
        : 500;

    res.status(statusCode).json({
      message: statusCode === 400 ? error.message : "Error updating asset review",
      error: error.message
    });
  }
};
