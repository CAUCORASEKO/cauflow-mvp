import fs from "fs/promises";

export const ALLOWED_ASSET_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

export const ALLOWED_ASSET_EXTENSIONS_LABEL = "JPG, PNG, or WebP";
export const MIN_PREMIUM_LONG_EDGE = 2000;
export const MIN_PREMIUM_SHORT_EDGE = 1400;
export const ASSET_REVIEW_STATUSES = new Set([
  "draft",
  "in_review",
  "approved",
  "rejected"
]);
export const ASSET_OFFER_CLASSES = new Set(["premium", "free_use"]);

export const normalizeAssetOfferClass = (value, fallback = "premium") => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (!ASSET_OFFER_CLASSES.has(normalizedValue)) {
    throw new Error("offerClass must be one of: premium, free_use");
  }

  return normalizedValue;
};

const gcd = (left, right) => {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }

  return a || 1;
};

const buildAspectRatio = (width, height) => {
  if (!width || !height) {
    return null;
  }

  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
};

const buildResolutionSummary = (width, height) =>
  width && height ? `${width} × ${height}px` : null;

const readPngDimensions = (buffer) => {
  const pngSignature = "89504e470d0a1a0a";

  if (buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    throw new Error("Invalid PNG file");
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
};

const readJpegDimensions = (buffer) => {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error("Invalid JPEG file");
  }

  let offset = 2;
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
  ]);

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];

    if (marker === 0xd8 || marker === 0x01) {
      offset += 2;
      continue;
    }

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);

    if (segmentLength < 2) {
      break;
    }

    if (startOfFrameMarkers.has(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      };
    }

    offset += 2 + segmentLength;
  }

  throw new Error("Unable to read JPEG dimensions");
};

const readWebpDimensions = (buffer) => {
  if (
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error("Invalid WebP file");
  }

  const chunkType = buffer.toString("ascii", 12, 16);

  if (chunkType === "VP8X") {
    return {
      width: buffer.readUIntLE(24, 3) + 1,
      height: buffer.readUIntLE(27, 3) + 1
    };
  }

  if (chunkType === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1
    };
  }

  const signatureOffset = buffer.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20);

  if (chunkType === "VP8 " && signatureOffset !== -1) {
    return {
      width: buffer.readUInt16LE(signatureOffset + 3) & 0x3fff,
      height: buffer.readUInt16LE(signatureOffset + 5) & 0x3fff
    };
  }

  throw new Error("Unable to read WebP dimensions");
};

export const getImageMetadata = async (filePath, mimeType) => {
  const buffer = await fs.readFile(filePath);

  if (mimeType === "image/png") {
    return readPngDimensions(buffer);
  }

  if (mimeType === "image/jpeg") {
    return readJpegDimensions(buffer);
  }

  if (mimeType === "image/webp") {
    return readWebpDimensions(buffer);
  }

  throw new Error(`Unsupported file format: ${mimeType}`);
};

export const buildStoredAssetFilePayload = async (file) => {
  if (!file) {
    return null;
  }

  if (!ALLOWED_ASSET_MIME_TYPES.has(file.mimetype)) {
    throw new Error(`Unsupported file format. Use ${ALLOWED_ASSET_EXTENSIONS_LABEL}.`);
  }

  const { width, height } = await getImageMetadata(file.path, file.mimetype);

  return {
    url: `/uploads/assets/${file.filename}`,
    fileName: file.originalname,
    mimeType: file.mimetype,
    fileSize: file.size,
    width,
    height,
    aspectRatio: buildAspectRatio(width, height),
    resolutionSummary: buildResolutionSummary(width, height)
  };
};

export const normalizeAssetReviewStatus = (value, fallback = "draft") => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (!ASSET_REVIEW_STATUSES.has(normalizedValue)) {
    throw new Error("reviewStatus must be one of: draft, in_review, approved, rejected");
  }

  return normalizedValue;
};

const buildAssetFileSummary = (raw) => {
  const url = raw.url || null;
  const fileName = raw.fileName || null;
  const mimeType = raw.mimeType || null;
  const fileSize =
    raw.fileSize === null || raw.fileSize === undefined ? null : Number(raw.fileSize);
  const width = raw.width === null || raw.width === undefined ? null : Number(raw.width);
  const height = raw.height === null || raw.height === undefined ? null : Number(raw.height);
  const aspectRatio = raw.aspectRatio || buildAspectRatio(width, height);
  const resolutionSummary =
    raw.resolutionSummary || buildResolutionSummary(width, height);

  if (
    !url &&
    !fileName &&
    !mimeType &&
    fileSize === null &&
    width === null &&
    height === null
  ) {
    return null;
  }

  return {
    url,
    fileName,
    mimeType,
    fileSize,
    width,
    height,
    aspectRatio,
    resolutionSummary
  };
};

export const getDeliveryReadiness = ({ previewUrl, masterFile }) => {
  const notes = [];

  if (!previewUrl) {
    notes.push("Missing preview image");
  }

  if (!masterFile?.url) {
    notes.push("Missing master delivery file");
  }

  if (masterFile?.url && masterFile.mimeType && !ALLOWED_ASSET_MIME_TYPES.has(masterFile.mimeType)) {
    notes.push("Unsupported format");
  }

  if (masterFile?.url && (!masterFile.width || !masterFile.height)) {
    notes.push("Master file metadata is incomplete");
  }

  if (masterFile?.url && masterFile.width && masterFile.height) {
    const longEdge = Math.max(masterFile.width, masterFile.height);
    const shortEdge = Math.min(masterFile.width, masterFile.height);

    if (longEdge < MIN_PREMIUM_LONG_EDGE || shortEdge < MIN_PREMIUM_SHORT_EDGE) {
      notes.push("Resolution too low for premium delivery");
    }
  }

  return {
    isReady: notes.length === 0,
    status: notes.length === 0 ? "delivery_ready" : "needs_fixes",
    notes: notes.length === 0 ? ["Ready for premium licensing"] : notes,
    helperText:
      notes.length === 0
        ? "Ready for premium licensing"
        : "Assets need a valid premium file before they are ready for high-value licensing."
  };
};

const getDeliveryBlockerCopy = (note, context = "publish") => {
  const normalizedContext =
    context === "submit"
      ? "submitted for review"
      : context === "approve"
        ? "approved"
        : "published";

  if (note === "Missing preview image") {
    return `This asset still needs a preview image before it can be ${normalizedContext}.`;
  }

  if (note === "Missing master delivery file") {
    return context === "submit"
      ? "This asset must be delivery ready before it can be submitted for review."
      : "Master delivery file is required for premium licensing.";
  }

  if (note === "Unsupported format") {
    return `Unsupported file format. Use ${ALLOWED_ASSET_EXTENSIONS_LABEL}.`;
  }

  if (note === "Master file metadata is incomplete") {
    return "Master file metadata is incomplete.";
  }

  if (note === "Resolution too low for premium delivery") {
    return "Master file resolution is too low for premium delivery.";
  }

  return context === "submit"
    ? "This asset still needs delivery fixes before it can be submitted for review."
    : "This asset still needs delivery fixes before it can go live.";
};

export const getAssetReviewSubmissionBlockedReasons = (deliveryReadiness) => {
  if (deliveryReadiness?.isReady) {
    return [];
  }

  return (deliveryReadiness?.notes || []).map((note) => getDeliveryBlockerCopy(note, "submit"));
};

export const getAssetPublishBlockedReasons = ({
  offerClass,
  reviewStatus,
  deliveryReadiness,
  previewUrl
}) => {
  const blockedReasons = [];

  if (!previewUrl) {
    blockedReasons.push("This asset still needs a preview image before it can be published.");
  }

  if (offerClass === "free_use") {
    return blockedReasons;
  }

  if (!deliveryReadiness?.isReady) {
    blockedReasons.push(
      ...(deliveryReadiness?.notes || []).map((note) => getDeliveryBlockerCopy(note, "publish"))
    );
  }

  if (reviewStatus !== "approved") {
    blockedReasons.push("This asset must be approved before it can be published.");
  }

  return blockedReasons;
};

const resolveAssetCatalogStatus = (row) => row.asset_status || row.status || "draft";

const resolveAssetOfferClass = (row) => row.asset_offer_class || row.offer_class || "premium";

export const getAssetPublicationState = (row) => {
  const previewUrl = row.preview_image_url || row.image_url || null;
  const catalogStatus = resolveAssetCatalogStatus(row);
  const reviewStatus = normalizeAssetReviewStatus(row.review_status, "draft");
  const offerClass = normalizeAssetOfferClass(resolveAssetOfferClass(row), "premium");
  const masterFile = buildAssetFileSummary({
    url: row.master_file_url,
    fileName: row.master_file_name,
    mimeType: row.master_mime_type,
    fileSize: row.master_file_size,
    width: row.master_width,
    height: row.master_height,
    aspectRatio: row.master_aspect_ratio,
    resolutionSummary: row.master_resolution_summary
  });
  const deliveryReadiness = getDeliveryReadiness({
    previewUrl,
    masterFile
  });
  const publishBlockedReasons = getAssetPublishBlockedReasons({
    offerClass,
    reviewStatus,
    deliveryReadiness,
    previewUrl
  });
  const buyerVisible = catalogStatus === "published" && publishBlockedReasons.length === 0;
  const commercialPathLabel = offerClass === "free_use" ? "free_use" : "premium";

  return {
    offerClass,
    reviewStatus,
    deliveryReadiness,
    canPublish: publishBlockedReasons.length === 0,
    publishBlockedReasons,
    buyerVisible,
    commercialPathLabel
  };
};

export const serializeAssetRecord = (row) => {
  const previewUrl = row.preview_image_url || row.image_url || null;
  const previewFile = buildAssetFileSummary({
    url: previewUrl,
    fileName: row.preview_file_name,
    mimeType: row.preview_mime_type,
    fileSize: row.preview_file_size,
    width: row.preview_width,
    height: row.preview_height,
    aspectRatio: row.preview_aspect_ratio,
    resolutionSummary: row.preview_resolution_summary
  });
  const masterFile = buildAssetFileSummary({
    url: row.master_file_url,
    fileName: row.master_file_name,
    mimeType: row.master_mime_type,
    fileSize: row.master_file_size,
    width: row.master_width,
    height: row.master_height,
    aspectRatio: row.master_aspect_ratio,
    resolutionSummary: row.master_resolution_summary
  });
  const publicationState = getAssetPublicationState(row);

  return {
    ...row,
    image_url: previewUrl,
    preview_image_url: previewUrl,
    offer_class: publicationState.offerClass,
    preview_file: previewFile,
    master_file: masterFile,
    review_status: publicationState.reviewStatus,
    delivery_readiness: publicationState.deliveryReadiness,
    can_publish: publicationState.canPublish,
    publish_blocked_reasons: publicationState.publishBlockedReasons,
    buyer_visible: publicationState.buyerVisible
  };
};
