import { useEffect, useState } from "react";
import { Download, Lock } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getPremiumDeliveryLabel,
  getPremiumDeliveryMeta,
  getPremiumDeliverySummary
} from "@/lib/premium-delivery";
import { buyerNav } from "@/lib/platform-nav";
import {
  getAssetImageUrl,
  downloadEntitlementMasterFile,
  downloadPackEntitlementAssetMasterFile,
  fetchEntitlements
} from "@/services/api";
import { formatDate, formatFileSize } from "@/lib/utils";
import type { LicenseGrant } from "@/types/api";

type PackIncludedAsset = NonNullable<
  NonNullable<LicenseGrant["premiumDelivery"]>["includedAssets"]
>[number];

const getPackAssetMeta = (item: PackIncludedAsset) =>
  [
    item.premiumDelivery.mimeType
      ? item.premiumDelivery.mimeType.replace("image/", "").toUpperCase()
      : null,
    item.premiumDelivery.resolutionSummary || null,
    item.premiumDelivery.aspectRatio ? `Aspect ${item.premiumDelivery.aspectRatio}` : null,
    item.premiumDelivery.fileSize ? formatFileSize(item.premiumDelivery.fileSize) : null
  ].filter(Boolean) as string[];

export function DownloadsPage() {
  const [grants, setGrants] = useState<LicenseGrant[]>([]);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(
    null
  );

  useEffect(() => {
    void fetchEntitlements().then(setGrants);
  }, []);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeout = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  return (
    <AppShell title="Downloads" subtitle="Buyer entitlements" navItems={buyerNav}>
      {notice ? <ActionFeedback tone={notice.tone} message={notice.message} /> : null}

      <div className="grid gap-4">
        {grants.length ? (
          grants.map((grant) => (
            <Card key={grant.id} className="surface-highlight p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-sky-200">
                    Premium delivery
                  </p>
                  <h2 className="mt-3 font-display text-3xl text-white">
                    {grant.asset?.title || grant.pack?.title || `License #${grant.licenseId}`}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {getPremiumDeliverySummary(grant)}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                      {getPremiumDeliveryLabel(grant)}
                    </span>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                      Purchase #{grant.purchaseId}
                    </span>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                      {formatDate(grant.createdAt)}
                    </span>
                    {getPremiumDeliveryMeta(grant).map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                {grant.premiumDelivery?.mode === "pack" ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/[0.08] px-4 py-2 text-sm text-sky-100">
                    Pack collection unlocked
                  </div>
                ) : grant.premiumDelivery?.available ? (
                  <Button
                    variant="secondary"
                    className="gap-2"
                    disabled={downloadingKey === `grant:${grant.id}`}
                    onClick={async () => {
                      try {
                        setDownloadingKey(`grant:${grant.id}`);
                        await downloadEntitlementMasterFile(grant.id);
                        setNotice({
                          tone: "success",
                          message: "Premium master file download started."
                        });
                      } catch (error) {
                        setNotice({
                          tone: "error",
                          message:
                            error instanceof Error
                              ? error.message
                              : "Unable to download premium master file"
                        });
                      } finally {
                        setDownloadingKey(null);
                      }
                    }}
                  >
                    <Download className="h-4 w-4 text-sky-200" />
                    {downloadingKey === `grant:${grant.id}`
                      ? "Preparing download..."
                      : "Download master file"}
                  </Button>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300">
                    <Lock className="h-4 w-4 text-slate-400" />
                    Locked
                  </div>
                )}
              </div>

              {grant.premiumDelivery?.mode === "pack" ? (
                <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Included assets
                      </p>
                      <p className="mt-2 text-sm text-white">
                        Buyers unlock premium master files asset by asset inside this purchased pack.
                      </p>
                    </div>
                    <p className="text-sm text-slate-400">
                      {grant.premiumDelivery.includedAssets?.length || 0} assets in collection
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {grant.premiumDelivery.includedAssets?.map((item) => {
                      const imageUrl = getAssetImageUrl(item.previewImageUrl || item.previewFile?.url || null);
                      const itemKey = `pack:${grant.id}:${item.id}`;
                      const itemMeta = getPackAssetMeta(item);

                      return (
                        <div
                          key={item.id}
                          className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex min-w-0 gap-4">
                              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[18px] border border-white/10 bg-slate-900">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={item.title}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-slate-500">
                                    <Lock className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                                  Included asset {item.position + 1}
                                </p>
                                <h3 className="mt-2 truncate text-lg text-white">{item.title}</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-400">
                                  {item.premiumDelivery.available
                                    ? "Premium file ready"
                                    : item.premiumDelivery.reason ||
                                      "This included asset is not available for premium download yet"}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {itemMeta.map((meta) => (
                                    <span
                                      key={meta}
                                      className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300"
                                    >
                                      {meta}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {item.premiumDelivery.available ? (
                              <Button
                                variant="secondary"
                                className="gap-2"
                                disabled={downloadingKey === itemKey}
                                onClick={async () => {
                                  try {
                                    setDownloadingKey(itemKey);
                                    await downloadPackEntitlementAssetMasterFile(grant.id, item.id);
                                    setNotice({
                                      tone: "success",
                                      message: `${item.title} download started.`
                                    });
                                  } catch (error) {
                                    setNotice({
                                      tone: "error",
                                      message:
                                        error instanceof Error
                                          ? error.message
                                          : "Unable to download pack delivery asset"
                                    });
                                  } finally {
                                    setDownloadingKey(null);
                                  }
                                }}
                              >
                                <Download className="h-4 w-4 text-sky-200" />
                                {downloadingKey === itemKey ? "Preparing download..." : "Download asset"}
                              </Button>
                            ) : (
                              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300">
                                <Lock className="h-4 w-4 text-slate-400" />
                                Unavailable
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </Card>
          ))
        ) : (
          <Card className="surface-highlight p-6">
            <p className="text-lg text-white">No delivery records yet.</p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Premium files appear here once a purchase is paid and the entitlement is active.
            </p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
