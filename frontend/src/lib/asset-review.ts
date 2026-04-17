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

export const getCreatorAssetReviewPresentation = (asset: Asset) => {
  if (asset.offerClass === "free_use") {
    return {
      label: "Not required",
      badgeClassName: "border-white/10 bg-white/[0.04] text-slate-300"
    };
  }

  return {
    label: formatAssetReviewStatus(asset.reviewStatus),
    badgeClassName: getAssetReviewBadgeClassName(asset.reviewStatus)
  };
};

export const getAssetReviewHelperCopy = (asset: Asset) => {
  if (asset.offerClass === "free_use") {
    if (asset.status === "published") {
      return "This free-use asset is live without premium review.";
    }

    if (asset.status === "archived") {
      return "This free-use asset is archived. Premium review is not required.";
    }

    return "This free-use asset does not require premium review. Publish it when you want it visible to buyers.";
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
  if (asset.offerClass === "free_use") {
    if (asset.status === "published") {
      return asset.canPublish
        ? "Published in Explore as a free-use offer."
        : asset.publishBlockedReasons?.[0] ||
            "This free-use asset is marked published, but it still needs a valid preview.";
    }

    if (asset.status === "archived") {
      return "Archived free-use offer. It stays hidden from Explore until restored.";
    }

    return asset.canPublish
      ? "Draft free-use offer. Publish it to make it buyer-visible in Explore."
      : asset.publishBlockedReasons?.[0] ||
          "Free-use assets need a valid preview before they can be published.";
  }

  if (asset.status === "published" && asset.canPublish) {
    return "Live in marketplace";
  }

  if (asset.status === "archived") {
    return "Archived premium asset. Restore it to resume premium publication work.";
  }

  if (asset.canPublish) {
    return "Approved and delivery ready. Publish to make it buyer-visible.";
  }

  return asset.publishBlockedReasons?.[0] || "Only approved, delivery-ready assets are visible to buyers.";
};

export const getAssetPublicationSummary = (asset: Asset) => {
  if (asset.offerClass === "free_use") {
    if (asset.status === "published") {
      return {
        label: "Published free-use offer",
        detail: asset.canPublish
          ? "Visible to buyers in Explore at zero cost."
          : asset.publishBlockedReasons?.[0] ||
              "This free-use asset needs a valid preview before it can stay buyer-visible.",
        badgeClassName: asset.canPublish
          ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100"
          : "border-amber-300/18 bg-amber-300/[0.08] text-amber-100",
        pillLabel: asset.canPublish ? "Published" : "Needs fixes"
      };
    }

    if (asset.status === "archived") {
      return {
        label: "Archived free-use offer",
        detail: "Hidden from Explore until you restore or republish it.",
        badgeClassName: "border-amber-300/18 bg-amber-300/[0.08] text-amber-100",
        pillLabel: "Archived"
      };
    }

    return {
      label: "Draft free-use offer",
      detail: asset.canPublish
        ? "Ready to publish, but still hidden from Explore until you publish it."
        : asset.publishBlockedReasons?.[0] ||
            "Add a valid preview before publishing this free-use offer.",
      badgeClassName: asset.canPublish
        ? "border-sky-300/18 bg-sky-300/[0.08] text-sky-100"
        : "border-amber-300/18 bg-amber-300/[0.08] text-amber-100",
      pillLabel: asset.canPublish ? "Draft" : "Needs fixes"
    };
  }

  if (asset.status === "published" && asset.canPublish) {
    return {
      label: "Live in marketplace",
      detail: "Visible to buyers now.",
      badgeClassName: "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100",
      pillLabel: "Live"
    };
  }

  if (asset.status === "archived") {
    return {
      label: "Archived premium asset",
      detail: "Hidden from buyers while preserving its premium review history.",
      badgeClassName: "border-amber-300/18 bg-amber-300/[0.08] text-amber-100",
      pillLabel: "Archived"
    };
  }

  if (asset.canPublish) {
    return {
      label: "Ready for publication",
      detail: "Approved and delivery ready.",
      badgeClassName: "border-sky-300/18 bg-sky-300/[0.08] text-sky-100",
      pillLabel: "Ready"
    };
  }

  return {
    label: "Publication blocked",
    detail: asset.publishBlockedReasons?.[0] || "This asset cannot go live yet.",
    badgeClassName: "border-amber-300/18 bg-amber-300/[0.08] text-amber-100",
    pillLabel: "Blocked"
  };
};
