import { useEffect, useState } from "react";
import { Download, Lock, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
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
import { formatCurrency, formatDate, humanizeLabel } from "@/lib/utils";
import {
  downloadEntitlementMasterFile,
  fetchEntitlements
} from "@/services/api";
import type { LicenseGrant } from "@/types/api";
import { formatPackCategory, formatVisualAssetType } from "@/lib/visual-taxonomy";

const getGrantTitle = (grant: LicenseGrant) =>
  grant.pack?.title || grant.asset?.title || `License #${grant.licenseId}`;

export function ActiveLicensesPage() {
  const [grants, setGrants] = useState<LicenseGrant[]>([]);
  const [downloadingGrantId, setDownloadingGrantId] = useState<number | null>(null);
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
    <AppShell title="Active licenses" subtitle="Buyer rights activated by successful payment" navItems={buyerNav}>
      <section className="glass-panel rounded-[30px] border border-white/10 p-6 md:p-7">
        <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Entitlements</p>
        <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">Commercial rights live here after checkout clears.</h1>
      </section>

      {notice ? <ActionFeedback tone={notice.tone} message={notice.message} /> : null}

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
                    {grant.payment ? formatCurrency(Number(grant.payment.amount)) : "Recorded"}
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
                  <p className="mt-2 text-white">{grant.downloadAccess ? "Enabled" : "Disabled"}</p>
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
                      Premium delivery
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {getPremiumDeliveryLabel(grant)}
                    </p>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                      {getPremiumDeliverySummary(grant)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
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

                  {grant.premiumDelivery?.available ? (
                    <Button
                      variant="secondary"
                      className="gap-2"
                      disabled={downloadingGrantId === grant.id}
                      onClick={async () => {
                        try {
                          setDownloadingGrantId(grant.id);
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
                          setDownloadingGrantId(null);
                        }
                      }}
                    >
                      <Download className="h-4 w-4 text-sky-200" />
                      {downloadingGrantId === grant.id
                        ? "Preparing download..."
                        : "Download master file"}
                    </Button>
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
            </Card>
          ))
        ) : (
          <Card className="surface-highlight p-6">
            <p className="text-lg text-white">No active licenses yet.</p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Successful payments activate buyer rights here. Failed or canceled checkout sessions stay out of the entitlement list.
            </p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
