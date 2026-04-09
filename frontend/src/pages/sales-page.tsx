import { useEffect, useMemo, useState } from "react";
import { CreditCard, Receipt, ShieldCheck, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card } from "@/components/ui/card";
import { formatLicenseType, formatLicenseUsage } from "@/lib/license-taxonomy";
import { creatorNav } from "@/lib/platform-nav";
import { formatCurrency, formatDate, humanizeLabel } from "@/lib/utils";
import { fetchPurchases } from "@/services/api";
import type { Purchase } from "@/types/api";

const getSaleTitle = (sale: Purchase) =>
  sale.pack?.title || sale.asset?.title || `License #${sale.licenseId}`;

const getBuyerLabel = (sale: Purchase) =>
  sale.buyer?.publicDisplayName ||
  sale.buyer?.organizationName ||
  sale.buyer?.studioName ||
  sale.buyer?.email ||
  sale.buyerEmail;

export function SalesPage() {
  const [sales, setSales] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPurchases()
      .then(setSales)
      .finally(() => setLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const paidSales = sales.filter((sale) => sale.payment?.status === "paid");
    const pendingSales = sales.filter((sale) => sale.payment?.status === "pending");
    const refundedSales = sales.filter((sale) => sale.payment?.status === "refunded");
    const revenue = paidSales.reduce(
      (sum, sale) => sum + Number(sale.payment?.amount || sale.license?.price || 0),
      0
    );

    return {
      revenue,
      paidSales: paidSales.length,
      pendingSales: pendingSales.length,
      refundedSales: refundedSales.length
    };
  }, [sales]);

  return (
    <AppShell title="Sales" subtitle="Commercial reporting and transactional visibility" navItems={creatorNav}>
      <section className="glass-panel rounded-[30px] border border-white/10 p-6 md:p-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr),360px]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-sky-200">Sales overview</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Real purchase activity tied to licenses, payments, and payout readiness.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
              This surface now follows the actual commercial trail. Every recorded checkout, successful payment, and refunded order is visible against the underlying asset or pack offer.
            </p>
          </div>

          <Card className="surface-highlight p-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Captured revenue</p>
            <p className="mt-3 font-display text-3xl text-white">{formatCurrency(metrics.revenue)}</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Revenue is calculated from paid transaction records that are currently linked to your commercial catalog.
            </p>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Recorded sales"
          value={String(sales.length)}
          detail="Every purchase record linked to your offers."
          icon={CreditCard}
        />
        <MetricCard
          label="Paid sales"
          value={String(metrics.paidSales)}
          detail="Transactions with an active paid state."
          icon={Wallet}
        />
        <MetricCard
          label="Pending sales"
          value={String(metrics.pendingSales)}
          detail="Checkout sessions still awaiting completion."
          icon={Receipt}
        />
        <MetricCard
          label="Refunded"
          value={String(metrics.refundedSales)}
          detail="Payments that were reversed after completion."
          icon={ShieldCheck}
        />
      </section>

      {loading ? (
        <Card className="surface-highlight p-6">
          <p className="text-sm text-slate-300">Loading transaction history and linked rights data.</p>
        </Card>
      ) : sales.length ? (
        <div className="grid gap-5">
          {sales.map((sale) => (
            <Card key={sale.id} className="surface-highlight p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-sky-200">
                      {sale.pack ? "Pack sale" : "Asset sale"}
                    </p>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                      {humanizeLabel(sale.payment?.status || sale.paymentStatus || sale.status)}
                    </span>
                  </div>
                  <h2 className="mt-3 font-display text-3xl text-white">{getSaleTitle(sale)}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {sale.license
                      ? `${formatLicenseType(sale.license.type)} · ${formatLicenseUsage(
                          sale.license.usage
                        )}`
                      : `License #${sale.licenseId}`}
                  </p>
                </div>

                <div className="text-left lg:text-right">
                  <p className="font-display text-3xl text-white">
                    {sale.payment ? formatCurrency(Number(sale.payment.amount)) : "Recorded"}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">{formatDate(sale.createdAt)}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Buyer</p>
                  <p className="mt-2 text-white">{getBuyerLabel(sale)}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Offer type</p>
                  <p className="mt-2 text-white">{sale.pack ? "Pack" : "Asset"}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Payment status</p>
                  <p className="mt-2 text-white">
                    {humanizeLabel(sale.payment?.status || sale.paymentStatus || sale.status)}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Payout relevance</p>
                  <p className="mt-2 text-white">
                    {sale.payment?.status === "paid"
                      ? "Eligible once payout flow runs"
                      : sale.payment?.status === "refunded"
                        ? "Removed from payout"
                        : "Not yet payable"}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="surface-highlight p-6">
          <p className="text-lg text-white">No sales recorded yet.</p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            As buyers move through checkout, this reporting surface will show pending activity, completed sales, refunded transactions, and the exact offer each sale belongs to.
          </p>
        </Card>
      )}
    </AppShell>
  );
}
