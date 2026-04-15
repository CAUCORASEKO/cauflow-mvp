import { Eye, FileImage, ImageIcon, PencilLine, Trash2 } from "lucide-react";
import { getAssetImageUrl } from "@/services/api";
import type { Asset, License, Purchase } from "@/types/api";
import {
  formatAssetDeliveryStatus,
  getAssetDeliveryBadgeClassName,
  getAssetPreviewUrl,
  getAssetPrimaryReadinessNote
} from "@/lib/asset-delivery";
import {
  formatAssetReviewStatus,
  getAssetReviewBadgeClassName
} from "@/lib/asset-review";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import type { AssetViewMode } from "@/components/dashboard/asset-inventory-toolbar";
import { formatCatalogStatus, getCatalogStatusBadgeClassName } from "@/lib/catalog-lifecycle";
import { formatVisualAssetType } from "@/lib/visual-taxonomy";

const getAssetPublicationSummary = (asset: Asset) => {
  if (asset.status === "published" && asset.canPublish) {
    return {
      label: "Live in marketplace",
      detail: "Visible to buyers now.",
      badgeClassName: "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100"
    };
  }

  if (asset.canPublish) {
    return {
      label: "Ready for publication",
      detail: "Approved and delivery ready.",
      badgeClassName: "border-sky-300/18 bg-sky-300/[0.08] text-sky-100"
    };
  }

  return {
    label: "Publication blocked",
    detail: asset.publishBlockedReasons?.[0] || getAssetPrimaryReadinessNote(asset),
    badgeClassName: "border-amber-300/18 bg-amber-300/[0.08] text-amber-100"
  };
};

export function AssetsGrid({
  assets,
  licenses,
  purchases,
  viewMode,
  selectedAssetId,
  statusActionAssetId,
  onSelectAsset,
  onStatusAction,
  onDeleteAsset
}: {
  assets: Asset[];
  licenses: License[];
  purchases: Purchase[];
  viewMode: AssetViewMode;
  selectedAssetId: number | null;
  statusActionAssetId: number | null;
  onSelectAsset: (asset: Asset) => void;
  onStatusAction: (asset: Asset) => void;
  onDeleteAsset: (asset: Asset) => void;
}) {
  const licenseCountByAssetId = new Map<number, number>();
  const purchaseCountByAssetId = new Map<number, number>();

  for (const license of licenses) {
    const sourceAssetId = license.sourceAssetId || license.assetId;

    if (license.sourceType !== "asset" || !sourceAssetId) {
      continue;
    }

    licenseCountByAssetId.set(
      sourceAssetId,
      (licenseCountByAssetId.get(sourceAssetId) || 0) + 1
    );
  }

  const assetIdByLicenseId = new Map(
    licenses
      .filter((license) => license.sourceType === "asset")
      .map((license) => [license.id, license.sourceAssetId || license.assetId])
  );

  for (const purchase of purchases) {
    const assetId = assetIdByLicenseId.get(purchase.licenseId);

    if (assetId) {
      purchaseCountByAssetId.set(assetId, (purchaseCountByAssetId.get(assetId) || 0) + 1);
    }
  }

  return (
    <div
      className={
        viewMode === "grid"
          ? "grid gap-4 xl:gap-5 md:grid-cols-2 2xl:grid-cols-3"
          : "space-y-3"
      }
    >
      {assets.map((asset) => {
        const imageUrl = getAssetImageUrl(getAssetPreviewUrl(asset));
        const isSelected = selectedAssetId === asset.id;
        const isUpdatingStatus = statusActionAssetId === asset.id;
        const licenseCount = licenseCountByAssetId.get(asset.id) || 0;
        const purchaseCount = purchaseCountByAssetId.get(asset.id) || 0;
        const deliveryStatus = asset.deliveryReadiness?.status;
        const reviewStatus = asset.reviewStatus;
        const publicationSummary = getAssetPublicationSummary(asset);
        const quickActionLabel =
          asset.status === "published"
            ? "Unpublish"
            : asset.status === "archived"
              ? "Restore"
              : asset.canPublish
                ? "Publish"
                : "Review detail";
        const quickActionClassName =
          asset.status === "published"
            ? "border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]"
            : asset.status === "archived"
              ? "border-amber-300/15 bg-amber-300/[0.08] text-amber-100 hover:bg-amber-300/[0.12]"
              : asset.canPublish
                ? "border-emerald-400/15 bg-emerald-400/[0.08] text-emerald-100 hover:bg-emerald-400/[0.12]"
                : "border-sky-300/15 bg-sky-300/[0.08] text-sky-100 hover:bg-sky-300/[0.14]";

        return (
          <Card
            key={asset.id}
            tabIndex={0}
            className={`surface-highlight group overflow-hidden border-white/8 bg-slate-950/50 focus-visible:outline-none ${
              viewMode === "grid"
                ? "hover:-translate-y-1 hover:border-white/15 hover:bg-slate-950/70 hover:shadow-[0_24px_55px_rgba(2,8,23,0.35)]"
                : "p-0 hover:border-white/14 hover:bg-slate-950/65"
            } ${
              isSelected
                ? "border-sky-300/24 bg-sky-300/[0.06] shadow-[0_0_0_1px_rgba(125,211,252,0.12),0_24px_50px_rgba(2,8,23,0.32)]"
                : ""
            }`}
          >
            {viewMode === "grid" ? (
              <>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => onSelectAsset(asset)}
                >
                  <div className="relative aspect-[5/4] overflow-hidden border-b border-white/10 bg-slate-900">
                    <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={asset.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-500">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}
                    <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-300 backdrop-blur">
                        Asset #{asset.id}
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80">
                        {formatVisualAssetType(asset.visualType)}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${getCatalogStatusBadgeClassName(
                          asset.status
                        )}`}
                      >
                        {formatCatalogStatus(asset.status)}
                      </span>
                    </div>
                  </div>
                </button>

                <div className="space-y-4 p-5">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="line-clamp-1 font-display text-[1.35rem] font-semibold tracking-tight text-white">
                          {asset.title}
                        </h3>
                        <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-sky-200">
                          {formatVisualAssetType(asset.visualType)}
                        </p>
                        <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                          Added {formatDate(asset.createdAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Delete ${asset.title}`}
                        className="focus-ring rounded-full border border-transparent p-2 text-slate-500 transition hover:border-rose-400/15 hover:bg-rose-400/[0.08] hover:text-rose-200"
                        onClick={() => onDeleteAsset(asset)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="min-h-[4.5rem] text-sm leading-6 text-slate-400">
                      {asset.description || "No description provided."}
                    </p>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            Commercial state
                          </p>
                          <p className="mt-1 text-sm font-medium text-white">
                            {publicationSummary.label}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-400">
                            {publicationSummary.detail}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${publicationSummary.badgeClassName}`}
                        >
                          {formatCatalogStatus(asset.status)}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            Review status
                          </p>
                          <div className="mt-2">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${getAssetReviewBadgeClassName(
                                reviewStatus
                              )}`}
                            >
                              {formatAssetReviewStatus(reviewStatus)}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            Delivery readiness
                          </p>
                          <div className="mt-2">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${getAssetDeliveryBadgeClassName(
                                deliveryStatus
                              )}`}
                            >
                              {formatAssetDeliveryStatus(deliveryStatus)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Licenses
                      </p>
                      <p className="mt-1 text-sm font-medium text-white">{licenseCount}</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Purchases
                      </p>
                      <p className="mt-1 text-sm font-medium text-white">{purchaseCount}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/8 pt-3">
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Catalog status
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className={`focus-ring inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] transition-all duration-300 ${quickActionClassName}`}
                        onClick={() =>
                          asset.status === "draft" && !asset.canPublish
                            ? onSelectAsset(asset)
                            : onStatusAction(asset)
                        }
                        disabled={isUpdatingStatus}
                      >
                        {isUpdatingStatus ? "Updating..." : quickActionLabel}
                      </button>
                      <button
                        type="button"
                        className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white transition-all duration-300 hover:bg-white/[0.08]"
                        onClick={() => onSelectAsset(asset)}
                      >
                        <PencilLine className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="focus-ring inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/8 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-sky-100 transition-all duration-300 hover:bg-sky-300/14"
                        onClick={() => onSelectAsset(asset)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Open detail
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid gap-4 p-4 md:grid-cols-[128px,minmax(0,1fr),auto] md:items-center">
                <button
                  type="button"
                  className="overflow-hidden rounded-[22px] border border-white/10 bg-slate-900 text-left"
                  onClick={() => onSelectAsset(asset)}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={asset.title}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-500">
                      <FileImage className="h-6 w-6" />
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  className="min-w-0 text-left"
                  onClick={() => onSelectAsset(asset)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-2xl text-white">{asset.title}</h3>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      #{asset.id}
                    </span>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      {formatVisualAssetType(asset.visualType)}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${getCatalogStatusBadgeClassName(
                        asset.status
                      )}`}
                    >
                      {formatCatalogStatus(asset.status)}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
                    {asset.description || "No description provided."}
                  </p>
                  <div className="mt-4 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          Commercial state
                        </p>
                        <p className="mt-1 text-sm font-medium text-white">
                          {publicationSummary.label}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {publicationSummary.detail}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${publicationSummary.badgeClassName}`}
                      >
                        {asset.status === "published" && asset.canPublish
                          ? "Live"
                          : asset.canPublish
                            ? "Ready"
                            : "Blocked"}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${getAssetReviewBadgeClassName(
                          reviewStatus
                        )}`}
                      >
                        Review: {formatAssetReviewStatus(reviewStatus)}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${getAssetDeliveryBadgeClassName(
                          deliveryStatus
                        )}`}
                      >
                        Delivery: {formatAssetDeliveryStatus(deliveryStatus)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <span>Added {formatDate(asset.createdAt)}</span>
                    <span>{licenseCount} licenses</span>
                    <span>{purchaseCount} purchases</span>
                  </div>
                </button>

                <div className="flex flex-col items-start gap-2 md:items-end">
                  <button
                    type="button"
                    className={`focus-ring inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition ${quickActionClassName}`}
                    onClick={() =>
                      asset.status === "draft" && !asset.canPublish
                        ? onSelectAsset(asset)
                        : onStatusAction(asset)
                    }
                    disabled={isUpdatingStatus}
                  >
                    {isUpdatingStatus ? "Updating..." : quickActionLabel}
                  </button>
                  <button
                    type="button"
                    className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white transition hover:bg-white/[0.08]"
                    onClick={() => onSelectAsset(asset)}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="focus-ring inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/8 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-sky-100 transition hover:bg-sky-300/14"
                    onClick={() => onSelectAsset(asset)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Detail
                  </button>
                  <button
                    type="button"
                    className="focus-ring inline-flex items-center gap-2 rounded-full border border-rose-400/15 bg-rose-400/[0.05] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-rose-100 transition hover:bg-rose-400/[0.12]"
                    onClick={() => onDeleteAsset(asset)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
