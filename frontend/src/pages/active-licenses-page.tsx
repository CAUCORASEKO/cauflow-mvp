import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatLicenseType, formatLicenseUsage } from "@/lib/license-taxonomy";
import {
  getPremiumDeliveryLabel,
  getPremiumDeliveryMeta,
  getPremiumDeliverySummary,
  getPremiumDeliveryTone
} from "@/lib/premium-delivery";
import { buyerNav } from "@/lib/platform-nav";
import { formatCurrency, formatDate, formatFileSize, humanizeLabel } from "@/lib/utils";
import { getAssetImageUrl, fetchEntitlements } from "@/services/api";
import type { LicenseGrant } from "@/types/api";
import { formatPackCategory, formatVisualAssetType } from "@/lib/visual-taxonomy";

const getGrantTitle = (grant: LicenseGrant) =>
  grant.pack?.title || grant.asset?.title || `License #${grant.licenseId}`;

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

export function ActiveLicensesPage() {
  const [grants, setGrants] = useState<LicenseGrant[]>([]);

  useEffect(() => {
    void fetchEntitlements().then(setGrants);
  }, []);

  return (
    <AppShell title="Active licenses" subtitle="Buyer rights and free-use access" navItems={buyerNav}>
      <section className="glass-panel rounded-[30px] border border-white/10 p-6 md:p-7">
        <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Entitlements</p>
        <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">Acquired access lives here after payment or free claim.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
          Downloads is now the main place to retrieve premium files or free-use asset access. This
          view keeps the commercial state visible alongside each active entitlement.
        </p>
      </section>

      <div className="grid gap-5">
        {grants.length ? (
          grants.map((grant) => (
            <Card key={grant.id} className="surface-highlight p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-sky-200">Active right</p>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                      {humanizeLabel(grant.status)}
                    </span>
                  </div>
                  <h2 className="mt-3 font-display text-3xl text-white">{getGrantTitle(grant)}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {grant.license
                      ? `${formatLicenseType(grant.license.type)} · ${formatLicenseUsage(
                          grant.license.usage
                        )}`
                      : `License #${grant.licenseId}`}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    {grant.pack
                      ? formatPackCategory(grant.pack.category)
                      : grant.asset
                        ? formatVisualAssetType(grant.asset.visualType)
                        : "Visual asset"}
                  </p>
                </div>

                <div className="text-left lg:text-right">
                  <p className="font-display text-3xl text-white">
                    {grant.license?.offerClass === "free_use"
                      ? "Free"
                      : grant.payment
                        ? formatCurrency(Number(grant.payment.amount))
                        : "Recorded"}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">{formatDate(grant.createdAt)}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Grant</p>
                  <p className="mt-2 text-white">#{grant.id}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Purchase</p>
                  <p className="mt-2 text-white">#{grant.purchaseId}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Download access</p>
                  <p className="mt-2 text-white">
                    {grant.license?.offerClass === "free_use"
                      ? "Basic access"
                      : grant.downloadAccess
                        ? "Enabled"
                        : "Disabled"}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Creator</p>
                  <p className="mt-2 text-white">
                    {grant.creator?.publicDisplayName ||
                      grant.creator?.organizationName ||
                      grant.creator?.studioName ||
                      grant.creator?.email ||
                      "Unavailable"}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      {grant.license?.offerClass === "free_use" ? "Free asset access" : "Premium delivery"}
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {grant.license?.offerClass === "free_use"
                        ? grant.basicAccess?.available
                          ? "Free asset access ready"
                          : "Free asset access unavailable"
                        : getPremiumDeliveryLabel(grant)}
                    </p>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                      {grant.license?.offerClass === "free_use"
                        ? grant.basicAccess?.reason || "No premium delivery is included with this free-use acquisition."
                        : getPremiumDeliverySummary(grant)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(grant.license?.offerClass === "free_use"
                        ? [
                            grant.basicAccess?.mimeType
                              ? grant.basicAccess.mimeType.replace("image/", "").toUpperCase()
                              : null,
                            grant.basicAccess?.resolutionSummary || null,
                            grant.basicAccess?.aspectRatio ? `Aspect ${grant.basicAccess.aspectRatio}` : null,
                            grant.basicAccess?.fileSize ? formatFileSize(grant.basicAccess.fileSize) : null
                          ].filter(Boolean)
                        : getPremiumDeliveryMeta(grant)
                      ).map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {grant.license?.offerClass === "free_use" &&
                  grant.basicAccess?.available &&
                  getAssetImageUrl(grant.basicAccess.accessUrl) ? (
                    <a
                      href={getAssetImageUrl(grant.basicAccess.accessUrl) || undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="secondary">Open Free Asset</Button>
                    </a>
                  ) : grant.premiumDelivery?.mode === "pack" ? (
                    <Link to="/app/buyer/downloads">
                      <Button variant="secondary">Open Downloads</Button>
                    </Link>
                  ) : grant.premiumDelivery?.available ? (
                    <Link to="/app/buyer/downloads">
                      <Button variant="secondary">Open Downloads</Button>
                    </Link>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300">
                      {getPremiumDeliveryTone(grant) === "locked" ? (
                        <Lock className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ShieldCheck className="h-4 w-4 text-sky-200" />
                      )}
                      Locked
                    </div>
                  )}
                </div>
              </div>

              {grant.premiumDelivery?.mode === "pack" ? (
                <div className="mt-4 grid gap-3">
                  {grant.premiumDelivery.includedAssets?.map((item) => {
                    const imageUrl = getAssetImageUrl(item.previewImageUrl || item.previewFile?.url || null);

                    return (
                      <div
                        key={item.id}
                        className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex min-w-0 gap-4">
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[16px] border border-white/10 bg-slate-900">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={item.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-500">
                                  <Lock className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white">{item.title}</p>
                              <p className="mt-1 text-sm leading-6 text-slate-400">
                                {item.premiumDelivery.available
                                  ? "Premium file ready"
                                  : item.premiumDelivery.reason ||
                                    "This included asset is not available for premium download yet"}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {getPackAssetMeta(item).map((meta) => (
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
                            <Link to="/app/buyer/downloads">
                              <Button variant="ghost">Open Downloads</Button>
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </Card>
          ))
        ) : (
          <Card className="surface-highlight p-6">
            <p className="text-lg text-white">No active licenses yet.</p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Paid purchases and free claims activate buyer access here. Failed or canceled checkout sessions stay out of the entitlement list.
            </p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
