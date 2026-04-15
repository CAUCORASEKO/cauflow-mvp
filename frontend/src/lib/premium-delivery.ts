import type { LicenseGrant } from "@/types/api";
import { formatFileSize } from "@/lib/utils";

export const getDeliveryTypeLabel = (grant: LicenseGrant) =>
  grant.license?.offerClass === "free_use"
    ? "Free asset access"
    :
  grant.premiumDelivery?.mode === "pack" ? "Pack delivery" : "Single asset delivery";

export const getPremiumDeliveryLabel = (grant: LicenseGrant) =>
  grant.license?.offerClass === "free_use"
    ? grant.basicAccess?.available
      ? "Free asset access ready"
      : "Free asset access"
    :
  grant.premiumDelivery?.mode === "pack"
    ? grant.premiumDelivery?.available
      ? "Pack delivery ready"
      : "Pack delivery limited"
    : grant.premiumDelivery?.available
      ? "Premium file ready"
      : "Premium file locked";

export const getPremiumDeliveryTone = (grant: LicenseGrant) =>
  grant.license?.offerClass === "free_use"
    ? grant.basicAccess?.available
      ? "ready"
      : "locked"
    :
  grant.premiumDelivery?.available ? "ready" : "locked";

export const getPremiumDeliveryStateCopy = (grant: LicenseGrant) => {
  if (!grant.premiumDelivery) {
    return grant.license?.offerClass === "free_use"
      ? grant.basicAccess?.reason || "No premium delivery included"
      : "No premium file available yet";
  }

  if (grant.premiumDelivery.available) {
    return grant.premiumDelivery.mode === "pack" ? "Pack delivery ready" : "Premium file ready";
  }

  return grant.premiumDelivery.reason || "No premium file available yet";
};

export const getPremiumDeliverySummary = (grant: LicenseGrant) =>
  grant.license?.offerClass === "free_use"
    ? grant.basicAccess?.reason || "Open the free-use asset file from the buyer workspace."
    :
  grant.premiumDelivery?.reason ||
  (grant.premiumDelivery?.mode === "pack"
    ? "Download the premium master files included in this purchased pack."
    : "Download the original high-resolution delivery file included with this license.");

export const getPremiumDeliveryMeta = (grant: LicenseGrant) =>
  grant.license?.offerClass === "free_use"
    ? [
        grant.basicAccess?.mimeType
          ? grant.basicAccess.mimeType.replace("image/", "").toUpperCase()
          : null,
        grant.basicAccess?.resolutionSummary || null,
        grant.basicAccess?.aspectRatio ? `Aspect ${grant.basicAccess.aspectRatio}` : null,
        grant.basicAccess?.fileSize ? formatFileSize(grant.basicAccess.fileSize) : null
      ].filter(Boolean) as string[]
    :
  [
    grant.premiumDelivery?.mode === "pack" && grant.premiumDelivery?.includedAssets
      ? `${grant.premiumDelivery.includedAssets.filter((item) => item.premiumDelivery.available).length}/${grant.premiumDelivery.includedAssets.length} ready`
      : null,
    grant.premiumDelivery?.mimeType
      ? grant.premiumDelivery.mimeType.replace("image/", "").toUpperCase()
      : null,
    grant.premiumDelivery?.resolutionSummary || null,
    grant.premiumDelivery?.aspectRatio ? `Aspect ${grant.premiumDelivery.aspectRatio}` : null,
    grant.premiumDelivery?.fileSize ? formatFileSize(grant.premiumDelivery.fileSize) : null
  ].filter(Boolean) as string[];
