import type { Asset, AssetReviewStatus } from "@/types/api";

export const formatAssetReviewStatus = (status: AssetReviewStatus | undefined) => {
  if (status === "in_review") {
    return "In review";
  }

  if (status === "approved") {
    return "Approved";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  return "Draft";
};

export const getAssetReviewBadgeClassName = (status: AssetReviewStatus | undefined) => {
  if (status === "approved") {
    return "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100";
  }

  if (status === "in_review") {
    return "border-sky-300/20 bg-sky-300/[0.08] text-sky-100";
  }

  if (status === "rejected") {
    return "border-rose-400/18 bg-rose-400/[0.08] text-rose-100";
  }

  return "border-white/10 bg-white/[0.04] text-slate-300";
};

export const getAssetReviewHelperCopy = (asset: Asset) => {
  if (asset.reviewStatus === "approved") {
    return asset.reviewNote || "This asset has passed review and can move toward publication.";
  }

  if (asset.reviewStatus === "in_review") {
    return "This asset is currently in review and cannot go live until it is approved.";
  }

  if (asset.reviewStatus === "rejected") {
    return asset.reviewNote || "This asset needs revisions before it can be submitted again.";
  }

  return "Draft assets stay private until delivery is ready and review has been requested.";
};

export const getAssetPublishGateCopy = (asset: Asset) => {
  if (asset.status === "published" && asset.canPublish) {
    return "Live in the marketplace.";
  }

  if (asset.canPublish) {
    return "Ready to publish once you decide to send it live.";
  }

  return asset.publishBlockedReasons?.[0] || "Publication is blocked until review and delivery requirements are satisfied.";
};
