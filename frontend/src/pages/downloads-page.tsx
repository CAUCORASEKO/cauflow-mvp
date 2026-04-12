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
  downloadEntitlementMasterFile,
  fetchEntitlements
} from "@/services/api";
import { formatDate } from "@/lib/utils";
import type { LicenseGrant } from "@/types/api";

export function DownloadsPage() {
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
                    <Lock className="h-4 w-4 text-slate-400" />
                    Locked
                  </div>
                )}
              </div>
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
