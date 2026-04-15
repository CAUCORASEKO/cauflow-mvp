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
  if (asset.offerClass === "free_use") {
    return "This asset is on the free-use path and does not require premium review.";
  }

  if (asset.reviewStatus === "approved") {
    return asset.reviewNote || "This asset has passed review and is eligible for publication.";
  }

  if (asset.reviewStatus === "in_review") {
    return "This asset is currently under premium catalog review.";
  }

  if (asset.reviewStatus === "rejected") {
    return asset.reviewNote || "This asset needs changes before it can enter the premium catalog.";
  }

  return "This asset is still being prepared for review.";
};

export const getAssetPublishGateCopy = (asset: Asset) => {
  if (asset.status === "published" && asset.canPublish) {
    return asset.offerClass === "free_use" ? "Live as free-use offer" : "Live in marketplace";
  }

  if (asset.canPublish) {
    return asset.offerClass === "free_use"
      ? "This asset is eligible for free-use publication."
      : "This asset is eligible for marketplace publication.";
  }

  return (
    asset.publishBlockedReasons?.[0] ||
    (asset.offerClass === "free_use"
      ? "Free-use assets need a valid preview before they are visible to buyers."
      : "Only approved, delivery-ready assets are visible to buyers.")
  );
};
