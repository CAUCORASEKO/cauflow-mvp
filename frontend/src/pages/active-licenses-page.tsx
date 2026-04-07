import { useEffect, useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { buyerNav } from "@/lib/platform-nav";
import { formatCurrency, formatDate, humanizeLabel } from "@/lib/utils";
import { fetchEntitlements } from "@/services/api";
import type { LicenseGrant } from "@/types/api";

const getGrantTitle = (grant: LicenseGrant) =>
  grant.pack?.title || grant.asset?.title || `License #${grant.licenseId}`;

export function ActiveLicensesPage() {
  const [grants, setGrants] = useState<LicenseGrant[]>([]);

  useEffect(() => {
    void fetchEntitlements().then(setGrants);
  }, []);

  return (
    <AppShell title="Active licenses" subtitle="Buyer rights activated by successful payment" navItems={buyerNav}>
      <section className="glass-panel rounded-[30px] border border-white/10 p-6 md:p-7">
        <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Entitlements</p>
        <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">Commercial rights live here after checkout clears.</h1>
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
                    {grant.license ? `${grant.license.type} · ${grant.license.usage}` : `License #${grant.licenseId}`}
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

              <div className="mt-5 flex items-center gap-2 text-sm text-slate-300">
                {grant.downloadAccess ? (
                  <>
                    <Download className="h-4 w-4 text-sky-200" />
                    This purchase currently carries download or access rights.
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 text-sky-200" />
                    This entitlement remains recorded even when direct download access is disabled.
                  </>
                )}
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
