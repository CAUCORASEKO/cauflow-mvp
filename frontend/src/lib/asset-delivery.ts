import type { Asset, AssetDeliveryStatus, AssetFileRecord } from "@/types/api";

export const assetDeliveryRulesCopy =
  "Technical checks confirm whether this asset is ready for premium licensing delivery.";

export const assetDeliveryStandards = [
  "Preview image uploaded",
  "Master file uploaded",
  "Supported format: JPG, PNG, or WebP",
  "Minimum high-resolution master requirement",
  "Readable technical metadata"
] as const;

export const formatAssetDeliveryStatus = (status: AssetDeliveryStatus | undefined) =>
  status === "delivery_ready" ? "Delivery ready" : "Needs fixes";

export const getAssetDeliveryBadgeClassName = (status: AssetDeliveryStatus | undefined) =>
  status === "delivery_ready"
    ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100"
    : "border-amber-300/18 bg-amber-300/[0.08] text-amber-100";

export const getAssetDeliveryTone = (asset: Asset) =>
  asset.deliveryReadiness?.isReady ? "success" : "error";

export const getAssetPrimaryReadinessNote = (asset: Asset) =>
  asset.deliveryReadiness?.notes?.[0] || "Ready for premium licensing";

export const getAssetPreviewUrl = (asset: Asset) =>
  asset.previewImageUrl || asset.previewFile?.url || asset.imageUrl || null;

export const getAssetFileMetaRows = (file: AssetFileRecord | null | undefined) =>
  [
    file?.mimeType ? `Format ${file.mimeType.replace("image/", "").toUpperCase()}` : null,
    file?.resolutionSummary ? `Resolution ${file.resolutionSummary}` : null,
    file?.aspectRatio ? `Aspect ${file.aspectRatio}` : null
  ].filter(Boolean) as string[];
