import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, FolderOpen, Lock, Package } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getDeliveryTypeLabel,
  getPremiumDeliveryStateCopy
} from "@/lib/premium-delivery";
import { buyerNav } from "@/lib/platform-nav";
import {
  downloadEntitlementMasterFile,
  downloadPackEntitlementAssetMasterFile,
  fetchEntitlements,
  fetchPurchases,
  getAssetImageUrl
} from "@/services/api";
import { cn, formatDate, formatFileSize, humanizeLabel } from "@/lib/utils";
import type { LicenseGrant, Purchase } from "@/types/api";

type DeliveryFilter = "all" | "available" | "unavailable" | "single" | "packs";

type PackIncludedAsset = NonNullable<
  NonNullable<LicenseGrant["premiumDelivery"]>["includedAssets"]
>[number];

type AssetDeliveryEntry = {
  kind: "asset";
  id: string;
  title: string;
  sourceLabel: string;
  contextLabel: string;
  purchaseId: number;
  createdAt: string;
  available: boolean;
  stateCopy: string;
  fileName: string | null;
  fileFormat: string;
  resolutionLabel: string;
  fileSizeLabel: string;
  meta: string[];
  imageUrl: string | null;
  action:
    | {
        key: string;
        label: string;
        onDownload: () => Promise<void>;
      }
    | null;
};

type PackDeliveryEntry = {
  kind: "pack";
  id: string;
  title: string;
  sourceLabel: string;
  contextLabel: string;
  purchaseId: number;
  createdAt: string;
  available: boolean;
  stateCopy: string;
  availableCount: number;
  totalCount: number;
  items: AssetDeliveryEntry[];
};

const FILTERS: Array<{ id: DeliveryFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "available", label: "Available" },
  { id: "unavailable", label: "Unavailable" },
  { id: "single", label: "Single assets" },
  { id: "packs", label: "Packs" }
];

const formatMimeLabel = (mimeType: string | null | undefined) =>
  mimeType ? mimeType.replace("image/", "").toUpperCase() : null;

const getFileFormatLabel = (mimeType: string | null | undefined, fileName: string | null) =>
  formatMimeLabel(mimeType) ||
  fileName?.split(".").pop()?.toUpperCase() ||
  "Unknown format";

const getFileMeta = ({
  mimeType,
  resolutionSummary,
  aspectRatio,
  fileSize
}: {
  mimeType?: string | null;
  resolutionSummary?: string | null;
  aspectRatio?: string | null;
  fileSize?: number | null;
}) =>
  [
    formatMimeLabel(mimeType),
    resolutionSummary || null,
    aspectRatio ? `Aspect ${aspectRatio}` : null,
    fileSize ? formatFileSize(fileSize) : null
  ].filter(Boolean) as string[];

const getPurchasePaymentState = (purchase: Purchase) =>
  purchase.payment?.status || purchase.paymentStatus || purchase.status;

const getPendingDeliveryReason = (purchase: Purchase) => {
  const paymentState = getPurchasePaymentState(purchase);

  if (paymentState !== "paid") {
    return paymentState === "pending"
      ? "Waiting for successful payment"
      : `Unavailable while payment is ${humanizeLabel(paymentState)}`;
  }

  if (purchase.assetId && !purchase.asset?.masterFile?.fileName) {
    return "No premium file available yet";
  }

  if (purchase.packId && !purchase.pack?.assetCount) {
    return "No premium file available yet";
  }

  return "Entitlement inactive";
};

const buildAssetEntryFromGrant = (grant: LicenseGrant): AssetDeliveryEntry => ({
  kind: "asset",
  id: `grant:${grant.id}`,
  title: grant.asset?.title || `License #${grant.licenseId}`,
  sourceLabel:
    grant.license?.offerClass === "free_use" ? "Free-use asset" : "Single asset purchase",
  contextLabel:
    grant.license?.offerClass === "free_use" ? "Free asset access" : getDeliveryTypeLabel(grant),
  purchaseId: grant.purchaseId,
  createdAt: grant.createdAt,
  available:
    grant.license?.offerClass === "free_use"
      ? Boolean(grant.basicAccess?.available)
      : Boolean(grant.premiumDelivery?.available),
  stateCopy:
    grant.license?.offerClass === "free_use"
      ? grant.basicAccess?.reason || "No premium delivery included"
      : getPremiumDeliveryStateCopy(grant),
  fileName:
    grant.license?.offerClass === "free_use"
      ? grant.basicAccess?.fileName || null
      : grant.premiumDelivery?.fileName || null,
  fileFormat: getFileFormatLabel(
    grant.license?.offerClass === "free_use"
      ? grant.basicAccess?.mimeType || null
      : grant.premiumDelivery?.mimeType || null,
    grant.license?.offerClass === "free_use"
      ? grant.basicAccess?.fileName || null
      : grant.premiumDelivery?.fileName || null
  ),
  resolutionLabel:
    (grant.license?.offerClass === "free_use"
      ? grant.basicAccess?.resolutionSummary
      : grant.premiumDelivery?.resolutionSummary) || "Resolution unavailable",
  fileSizeLabel: formatFileSize(
    (grant.license?.offerClass === "free_use"
      ? grant.basicAccess?.fileSize
      : grant.premiumDelivery?.fileSize) || null
  ),
  meta: getFileMeta(
    grant.license?.offerClass === "free_use" ? grant.basicAccess || {} : grant.premiumDelivery || {}
  ),
  imageUrl: getAssetImageUrl(grant.asset?.previewImageUrl || grant.asset?.previewFile?.url || null),
  action:
    grant.license?.offerClass === "free_use"
      ? grant.basicAccess?.available && grant.basicAccess.accessUrl
        ? {
            key: `grant:${grant.id}`,
            label: "Open free asset",
            onDownload: async () => {
              window.open(getAssetImageUrl(grant.basicAccess?.accessUrl || null) || "", "_blank", "noopener,noreferrer");
            }
          }
        : null
      : grant.premiumDelivery?.available
        ? {
            key: `grant:${grant.id}`,
            label: "Download master file",
            onDownload: () => downloadEntitlementMasterFile(grant.id)
          }
        : null
});

const buildPackAssetEntry = (
  grant: LicenseGrant,
  item: PackIncludedAsset
): AssetDeliveryEntry => ({
  kind: "asset",
  id: `pack:${grant.id}:${item.id}`,
  title: item.title,
  sourceLabel: "Purchased pack",
  contextLabel: `Included in ${grant.pack?.title || "pack"}`,
  purchaseId: grant.purchaseId,
  createdAt: grant.createdAt,
  available: item.premiumDelivery.available,
  stateCopy: item.premiumDelivery.available
    ? "Download available"
    : item.premiumDelivery.reason || "Included pack asset unavailable",
  fileName: item.premiumDelivery.fileName || null,
  fileFormat: getFileFormatLabel(
    item.premiumDelivery.mimeType || null,
    item.premiumDelivery.fileName || null
  ),
  resolutionLabel: item.premiumDelivery.resolutionSummary || "Resolution unavailable",
  fileSizeLabel: formatFileSize(item.premiumDelivery.fileSize || null),
  meta: getFileMeta(item.premiumDelivery),
  imageUrl: getAssetImageUrl(item.previewImageUrl || item.previewFile?.url || null),
  action: item.premiumDelivery.available
    ? {
        key: `pack:${grant.id}:${item.id}`,
        label: "Download asset",
        onDownload: () => downloadPackEntitlementAssetMasterFile(grant.id, item.id)
      }
    : null
});

const buildPackEntryFromGrant = (grant: LicenseGrant): PackDeliveryEntry => {
  const items = (grant.premiumDelivery?.includedAssets || []).map((item) =>
    buildPackAssetEntry(grant, item)
  );
  const availableCount = items.filter((item) => item.available).length;

  return {
    kind: "pack",
    id: `pack-grant:${grant.id}`,
    title: grant.pack?.title || `Pack #${grant.packId || grant.licenseId}`,
    sourceLabel: "Pack purchase",
    contextLabel: "Pack delivery",
    purchaseId: grant.purchaseId,
    createdAt: grant.createdAt,
    available: availableCount > 0,
    stateCopy: getPremiumDeliveryStateCopy(grant),
    availableCount,
    totalCount: items.length,
    items
  };
};

const buildPendingAssetEntry = (purchase: Purchase): AssetDeliveryEntry => ({
  kind: "asset",
  id: `purchase:${purchase.id}`,
  title: purchase.asset?.title || `License #${purchase.licenseId}`,
  sourceLabel: "Single asset purchase",
  contextLabel: "Delivery pending",
  purchaseId: purchase.id,
  createdAt: purchase.createdAt,
  available: false,
  stateCopy: getPendingDeliveryReason(purchase),
  fileName: purchase.asset?.masterFile?.fileName || null,
  fileFormat: getFileFormatLabel(
    purchase.asset?.masterFile?.mimeType || null,
    purchase.asset?.masterFile?.fileName || null
  ),
  resolutionLabel: purchase.asset?.masterFile?.resolutionSummary || "Resolution unavailable",
  fileSizeLabel: formatFileSize(purchase.asset?.masterFile?.fileSize || null),
  meta: getFileMeta(purchase.asset?.masterFile || {}),
  imageUrl: getAssetImageUrl(
    purchase.asset?.previewImageUrl || purchase.asset?.previewFile?.url || null
  ),
  action: null
});

const buildPendingPackEntry = (purchase: Purchase): PackDeliveryEntry => ({
  kind: "pack",
  id: `purchase-pack:${purchase.id}`,
  title: purchase.pack?.title || `Pack #${purchase.packId || purchase.id}`,
  sourceLabel: "Pack purchase",
  contextLabel: "Pack delivery",
  purchaseId: purchase.id,
  createdAt: purchase.createdAt,
  available: false,
  stateCopy: getPendingDeliveryReason(purchase),
  availableCount: 0,
  totalCount: purchase.pack?.assetCount || 0,
  items: []
});

const matchesAssetFilter = (item: AssetDeliveryEntry, filter: DeliveryFilter) => {
  if (filter === "all") {
    return true;
  }

  if (filter === "available") {
    return item.available;
  }

  if (filter === "unavailable") {
    return !item.available;
  }

  if (filter === "single") {
    return true;
  }

  return false;
};

const matchesPackFilter = (item: PackDeliveryEntry, filter: DeliveryFilter) => {
  if (filter === "all" || filter === "packs") {
    return true;
  }

  if (filter === "available") {
    return item.availableCount > 0;
  }

  if (filter === "unavailable") {
    return item.items.length === 0 || item.items.some((asset) => !asset.available);
  }

  return false;
};

function DeliveryStateBadge({
  available,
  label
}: {
  available: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        available
          ? "border-sky-300/20 bg-sky-300/[0.08] text-sky-100"
          : "border-white/10 bg-white/[0.04] text-slate-300"
      )}
    >
      {available ? label : label}
    </span>
  );
}

function DeliveryMeta({ items }: { items: string[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function AssetDeliveryCard({
  item,
  downloadingKey,
  setDownloadingKey,
  setNotice
}: {
  item: AssetDeliveryEntry;
  downloadingKey: string | null;
  setDownloadingKey: (value: string | null) => void;
  setNotice: (value: { tone: "success" | "error"; message: string } | null) => void;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[18px] border border-white/10 bg-slate-900">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-500">
                <Lock className="h-5 w-5" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                {item.sourceLabel}
              </p>
              <DeliveryStateBadge available={item.available} label="Unavailable" />
            </div>
            <h3 className="mt-2 text-lg text-white">{item.title}</h3>
            <p className="mt-1 text-sm text-slate-400">{item.contextLabel}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.stateCopy}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
              <span>Purchase #{item.purchaseId}</span>
              <span>{formatDate(item.createdAt)}</span>
              {item.fileName ? <span>{item.fileName}</span> : null}
            </div>
            <DeliveryMeta items={item.meta} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Download file
                </p>
                <p className="mt-2 text-sm text-white">{item.fileName || "No file attached"}</p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Format</p>
                <p className="mt-2 text-sm text-white">{item.fileFormat}</p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Resolution
                </p>
                <p className="mt-2 text-sm text-white">{item.resolutionLabel}</p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">File size</p>
                <p className="mt-2 text-sm text-white">{item.fileSizeLabel}</p>
              </div>
            </div>
          </div>
        </div>

        {item.action ? (
          <Button
            variant="secondary"
            className="gap-2"
            disabled={downloadingKey === item.action.key}
            onClick={async () => {
              const action = item.action;

              if (!action) {
                return;
              }

              try {
                setDownloadingKey(action.key);
                await action.onDownload();
                setNotice({
                  tone: "success",
                  message: `${item.title} download started.`
                });
              } catch (error) {
                setNotice({
                  tone: "error",
                  message:
                    error instanceof Error ? error.message : "Unable to start premium download"
                });
              } finally {
                setDownloadingKey(null);
              }
            }}
          >
            <Download className="h-4 w-4 text-sky-200" />
            {downloadingKey === item.action.key ? "Preparing download..." : item.action.label}
          </Button>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300">
            <Lock className="h-4 w-4 text-slate-400" />
            Locked
          </div>
        )}
      </div>
    </div>
  );
}

export function DownloadsPage() {
  const [grants, setGrants] = useState<LicenseGrant[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [filter, setFilter] = useState<DeliveryFilter>("all");
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(
    null
  );

  useEffect(() => {
    void Promise.all([fetchEntitlements(), fetchPurchases()]).then(([entitlements, history]) => {
      setGrants(entitlements);
      setPurchases(history);
    });
  }, []);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeout = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const grantsByPurchaseId = new Map(grants.map((grant) => [grant.purchaseId, grant]));
  const singleAssetEntries = grants
    .filter((grant) => grant.premiumDelivery?.mode !== "pack")
    .map((grant) => buildAssetEntryFromGrant(grant));
  const packEntries = grants
    .filter((grant) => grant.premiumDelivery?.mode === "pack")
    .map((grant) => buildPackEntryFromGrant(grant));

  const pendingPurchases = purchases.filter((purchase) => !grantsByPurchaseId.has(purchase.id));

  for (const purchase of pendingPurchases) {
    if (purchase.packId) {
      packEntries.push(buildPendingPackEntry(purchase));
      continue;
    }

    singleAssetEntries.push(buildPendingAssetEntry(purchase));
  }

  singleAssetEntries.sort((left, right) => right.purchaseId - left.purchaseId);
  packEntries.sort((left, right) => right.purchaseId - left.purchaseId);

  const visibleSingleAssets = singleAssetEntries.filter((item) =>
    matchesAssetFilter(item, filter)
  );
  const visiblePacks = packEntries.filter((item) => matchesPackFilter(item, filter));

  const downloadableCount =
    singleAssetEntries.filter((item) => item.available).length +
    packEntries.reduce((sum, item) => sum + item.availableCount, 0);
  const unavailableCount =
    singleAssetEntries.filter((item) => !item.available).length +
    packEntries.reduce(
      (sum, item) => sum + Math.max(item.totalCount - item.availableCount, item.items.length ? 0 : 1),
      0
    );

  return (
    <AppShell
      title="Downloads"
      subtitle="Premium delivery and free asset access"
      navItems={buyerNav}
    >
      {notice ? <ActionFeedback tone={notice.tone} message={notice.message} /> : null}

      <section className="glass-panel rounded-[30px] border border-white/10 p-6 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Delivery management</p>
            <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">
              Premium master files and free-use asset access stay organized after acquisition.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              Manage what is ready now, see which files came from single licenses or purchased
              packs, and understand why anything is still locked before you click download.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Ready now</p>
              <p className="mt-2 font-display text-3xl text-white">{downloadableCount}</p>
              <p className="mt-2 text-sm text-slate-400">Files currently available</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Pack collections
              </p>
              <p className="mt-2 font-display text-3xl text-white">{packEntries.length}</p>
              <p className="mt-2 text-sm text-slate-400">Purchased packs tracked here</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Unavailable
              </p>
              <p className="mt-2 font-display text-3xl text-white">{unavailableCount}</p>
              <p className="mt-2 text-sm text-slate-400">Waiting on payment or delivery readiness</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={cn(
                "focus-ring rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                filter === option.id
                  ? "border-sky-300/25 bg-sky-300/[0.08] text-sky-100"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] hover:text-white"
              )}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
              <span className="ml-2 text-xs text-slate-500">
                {option.id === "all"
                  ? singleAssetEntries.length + packEntries.length
                  : option.id === "available"
                    ? downloadableCount
                    : option.id === "unavailable"
                      ? unavailableCount
                      : option.id === "single"
                        ? singleAssetEntries.length
                        : packEntries.length}
              </span>
            </button>
          ))}
        </div>
      </section>

      {visibleSingleAssets.length ? (
        <section className="grid gap-4">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-5 w-5 text-sky-200" />
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                Single asset access
              </p>
              <p className="text-sm text-slate-300">
                Premium master files and free-use asset access for single-asset acquisitions.
              </p>
            </div>
          </div>

          {visibleSingleAssets.map((item) => (
            <AssetDeliveryCard
              key={item.id}
              item={item}
              downloadingKey={downloadingKey}
              setDownloadingKey={setDownloadingKey}
              setNotice={setNotice}
            />
          ))}
        </section>
      ) : null}

      {visiblePacks.length ? (
        <section className="grid gap-4">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-sky-200" />
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Pack downloads</p>
              <p className="text-sm text-slate-300">
                Premium assets unlocked through purchased collections.
              </p>
            </div>
          </div>

          {visiblePacks.map((pack) => (
            <Card key={pack.id} className="surface-highlight p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200">
                      {pack.sourceLabel}
                    </p>
                    <DeliveryStateBadge
                      available={pack.available}
                      label={pack.availableCount > 0 ? "Partially available" : "Unavailable"}
                    />
                  </div>
                  <h2 className="mt-3 font-display text-3xl text-white">{pack.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{pack.stateCopy}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    <span>Purchase #{pack.purchaseId}</span>
                    <span>{formatDate(pack.createdAt)}</span>
                    <span>{pack.availableCount} ready</span>
                    <span>{pack.totalCount} included assets</span>
                  </div>
                </div>

                <div className="rounded-full border border-sky-300/15 bg-sky-300/[0.08] px-4 py-2 text-sm text-sky-100">
                  {pack.availableCount > 0
                    ? `${pack.availableCount} download${pack.availableCount === 1 ? "" : "s"} available`
                    : "Pack delivery locked"}
                </div>
              </div>

              {pack.items.length ? (
                <div className="mt-5 grid gap-3">
                  {pack.items
                    .filter((item) =>
                      filter === "available"
                        ? item.available
                        : filter === "unavailable"
                          ? !item.available
                          : true
                    )
                    .map((item) => (
                      <AssetDeliveryCard
                        key={item.id}
                        item={item}
                        downloadingKey={downloadingKey}
                        setDownloadingKey={setDownloadingKey}
                        setNotice={setNotice}
                      />
                    ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300">
                  Included pack assets will appear here once delivery access is active.
                </div>
              )}
            </Card>
          ))}
        </section>
      ) : null}

      {!visibleSingleAssets.length && !visiblePacks.length ? (
        <Card className="surface-highlight p-6">
          <p className="text-lg text-white">No delivery records match this view.</p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            Premium downloads and free-use asset access appear here after acquisition records are created.
            Locked items stay visible so payment and availability states remain clear.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/app/buyer/purchases">
              <Button variant="secondary">Open purchases</Button>
            </Link>
            <Link to="/app/explore">
              <Button variant="ghost">Browse more offers</Button>
            </Link>
          </div>
        </Card>
      ) : null}
    </AppShell>
  );
}
