import type { LicenseGrant } from "@/types/api";
import { formatFileSize } from "@/lib/utils";

export const getPremiumDeliveryLabel = (grant: LicenseGrant) =>
  grant.premiumDelivery?.available ? "Premium file ready" : "Premium file locked";

export const getPremiumDeliveryTone = (grant: LicenseGrant) =>
  grant.premiumDelivery?.available ? "ready" : "locked";

export const getPremiumDeliverySummary = (grant: LicenseGrant) =>
  grant.premiumDelivery?.reason ||
  "Download the original high-resolution delivery file included with this license.";

export const getPremiumDeliveryMeta = (grant: LicenseGrant) =>
  [
    grant.premiumDelivery?.mimeType
      ? grant.premiumDelivery.mimeType.replace("image/", "").toUpperCase()
      : null,
    grant.premiumDelivery?.resolutionSummary || null,
    grant.premiumDelivery?.aspectRatio ? `Aspect ${grant.premiumDelivery.aspectRatio}` : null,
    grant.premiumDelivery?.fileSize ? formatFileSize(grant.premiumDelivery.fileSize) : null
  ].filter(Boolean) as string[];
