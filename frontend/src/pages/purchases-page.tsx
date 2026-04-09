import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatLicenseType, formatLicenseUsage } from "@/lib/license-taxonomy";
import { buyerNav } from "@/lib/platform-nav";
import { formatCurrency, formatDate, humanizeLabel } from "@/lib/utils";
import { fetchPurchases } from "@/services/api";
import type { Purchase } from "@/types/api";

const getOfferingTitle = (purchase: Purchase) =>
  purchase.pack?.title || purchase.asset?.title || `License #${purchase.licenseId}`;

export function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  useEffect(() => {
    void fetchPurchases().then(setPurchases);
  }, []);

  return (
    <AppShell title="Purchases" subtitle="Recorded buyer history and payment outcomes" navItems={buyerNav}>
      <section className="glass-panel rounded-[30px] border border-white/10 p-6 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-sky-200">Purchase history</p>
            <h1 className="mt-3 font-display text-4xl text-white md:text-5xl">Every checkout leaves a real trail.</h1>
          </div>
          <Link to="/app/explore">
            <Button>Browse more offers</Button>
          </Link>
        </div>
      </section>

      <div className="grid gap-5">
        {purchases.length ? (
          purchases.map((purchase) => (
            <Card key={purchase.id} className="surface-highlight p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-sky-200">
                      {purchase.pack ? "Pack purchase" : "Asset purchase"}
                    </p>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                      {humanizeLabel(purchase.payment?.status || purchase.paymentStatus || purchase.status)}
                    </span>
                  </div>
                  <h2 className="mt-3 font-display text-3xl text-white">{getOfferingTitle(purchase)}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {purchase.license
                      ? `${formatLicenseType(purchase.license.type)} · ${formatLicenseUsage(
                          purchase.license.usage
                        )}`
                      : `License #${purchase.licenseId}`}
                  </p>
                </div>

                <div className="text-left lg:text-right">
                  <p className="font-display text-3xl text-white">
                    {purchase.payment ? formatCurrency(Number(purchase.payment.amount)) : "Recorded"}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">{formatDate(purchase.createdAt)}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Purchase</p>
                  <p className="mt-2 text-white">#{purchase.id}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Selected license</p>
                  <p className="mt-2 text-white">
                    {purchase.license
                      ? formatLicenseType(purchase.license.type)
                      : `#${purchase.licenseId}`}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Payment state</p>
                  <p className="mt-2 text-white">
                    {humanizeLabel(purchase.payment?.status || purchase.paymentStatus || purchase.status)}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Entitlement</p>
                  <p className="mt-2 text-white">
                    {purchase.payment?.status === "paid" ? "Active license" : "Inactive until paid"}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {purchase.payment ? (
                  <Link to={`/app/checkout/${purchase.payment.id}`}>
                    <Button variant="secondary">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Open checkout record
                    </Button>
                  </Link>
                ) : null}
                {purchase.payment?.status === "paid" ? (
                  <Link to="/app/buyer/licenses">
                    <Button variant="ghost">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      View active rights
                    </Button>
                  </Link>
                ) : null}
              </div>
            </Card>
          ))
        ) : (
          <Card className="surface-highlight p-6">
            <p className="text-lg text-white">No purchases recorded yet.</p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Once a buyer initiates checkout, the payment and purchase trail will appear here, even before the license activates.
            </p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
