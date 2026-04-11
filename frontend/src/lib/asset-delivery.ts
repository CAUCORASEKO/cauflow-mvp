import type { Asset, AssetDeliveryStatus, AssetFileRecord } from "@/types/api";

export const assetDeliveryRulesCopy =
  "Premium master files should be JPG, PNG, or WebP with at least a 2000px long edge and a 1400px short edge.";

export const formatAssetDeliveryStatus = (status: AssetDeliveryStatus | undefined) =>
  status === "delivery_ready" ? "Delivery ready" : "Needs fixes";

export const getAssetDeliveryBadgeClassName = (status: AssetDeliveryStatus | undefined) =>
  status === "delivery_ready"
    ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100"
    : "border-amber-300/18 bg-amber-300/[0.08] text-amber-100";

export const getAssetDeliveryTone = (asset: Asset) =>
  asset.deliveryReadiness?.isReady ? "success" : "error";

export const getAssetPrimaryReadinessNote = (asset: Asset) =>
  asset.deliveryReadiness?.notes?.[0] ||
  "Assets need a valid premium file before they are ready for high-value licensing.";

export const getAssetPreviewUrl = (asset: Asset) =>
  asset.previewImageUrl || asset.previewFile?.url || asset.imageUrl || null;

export const getAssetFileMetaRows = (file: AssetFileRecord | null | undefined) =>
  [
    file?.mimeType ? `Format ${file.mimeType.replace("image/", "").toUpperCase()}` : null,
    file?.resolutionSummary ? `Resolution ${file.resolutionSummary}` : null,
    file?.aspectRatio ? `Aspect ${file.aspectRatio}` : null
  ].filter(Boolean) as string[];
