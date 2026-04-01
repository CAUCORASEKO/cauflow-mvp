import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, Receipt, ShieldCheck, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PanelLoadingState } from "@/components/dashboard/panel-loading-state";
import { PurchaseDetailDrawer } from "@/components/dashboard/purchase-detail-drawer";
import { PurchaseList } from "@/components/dashboard/purchase-list";
import { Card } from "@/components/ui/card";
import { creatorNav } from "@/lib/platform-nav";
import { deletePurchase, fetchAssets, fetchLicenses, fetchPurchases } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import type { Asset, License, Purchase } from "@/types/api";

export function SalesPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [sales, setSales] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [purchasePendingDelete, setPurchasePendingDelete] = useState<Purchase | null>(null);
  const [isDeletingPurchase, setIsDeletingPurchase] = useState(false);

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const [nextAssets, nextLicenses, nextSales] = await Promise.all([
        fetchAssets(),
        fetchLicenses(),
        fetchPurchases()
      ]);

      setAssets(nextAssets);
      setLicenses(nextLicenses);
      setSales(nextSales);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  const totalRevenue = useMemo(
    () =>
      sales.reduce((sum, purchase) => {
        const matchedLicense = licenses.find((license) => license.id === purchase.licenseId);
        return sum + Number(matchedLicense?.price || 0);
      }, 0),
    [licenses, sales]
  );

  const paidSalesCount = sales.filter((sale) => sale.paymentStatus === "paid").length;
  const pendingSalesCount = sales.filter((sale) => sale.paymentStatus === "pending").length;

  const handlePurchaseUpdated = useCallback((updatedPurchase: Purchase) => {
    setSales((currentSales) =>
      currentSales.map((purchase) =>
        purchase.id === updatedPurchase.id ? updatedPurchase : purchase
      )
    );
    setSelectedPurchaseId(updatedPurchase.id);
  }, []);

  const handleDeletePurchase = useCallback(async () => {
    if (!purchasePendingDelete) {
      return;
    }

    try {
      setIsDeletingPurchase(true);
      const deletedPurchase = await deletePurchase(purchasePendingDelete.id);
      setSales((currentSales) =>
        currentSales.filter((purchase) => purchase.id !== deletedPurchase.id)
      );
      setSelectedPurchaseId((currentId) =>
        currentId === deletedPurchase.id ? null : currentId
      );
      setPurchasePendingDelete(null);
    } finally {
      setIsDeletingPurchase(false);
    }
  }, [purchasePendingDelete]);

  return (
    <AppShell title="Sales" subtitle="Commercial reporting and transaction trail" navItems={creatorNav}>
      <section className="glass-panel rounded-[30px] border border-white/10 p-6 md:p-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr),360px]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-sky-200">Sales overview</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Dedicated reporting for the commercial side of the pipeline.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
              Assets, Packs, and Licenses stay together in the creator workspace. Sales remains its
              own surface so transaction recording, revenue signals, and buyer history feel clearly separate.
            </p>
          </div>

          <Card className="surface-highlight p-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Commercial focus</p>
            <p className="mt-3 font-display text-3xl text-white">{formatCurrency(totalRevenue)}</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Revenue represented by the currently recorded sales trail and linked license pricing.
            </p>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Recorded sales"
          value={String(sales.length)}
          detail="All transaction records currently attached to your catalog."
          icon={CreditCard}
        />
        <MetricCard
          label="Paid sales"
          value={String(paidSalesCount)}
          detail="Transactions that have cleared into the paid state."
          icon={Wallet}
        />
        <MetricCard
          label="Pending sales"
          value={String(pendingSalesCount)}
          detail="Transactions that still need payment completion or review."
          icon={Receipt}
        />
        <MetricCard
          label="Licenses in market"
          value={String(licenses.length)}
          detail="Rights packages currently available to support transactions."
          icon={ShieldCheck}
        />
      </section>

      <section className="space-y-5">
        <Card className="surface-highlight p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Dedicated view</p>
          <h2 className="mt-3 font-display text-3xl text-white">Sales is now clearly separate from the workspace.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            Buyers create the commercial events. This page is for reviewing that transaction trail,
            buyer history, and revenue patterns without mixing those concerns into the operational
            asset, pack, and license workspace.
          </p>
        </Card>

        {loading ? (
          <PanelLoadingState title="sales" />
        ) : sales.length > 0 ? (
          <PurchaseList
            purchases={sales}
            licenses={licenses}
            assets={assets}
            selectedPurchaseId={selectedPurchaseId}
            onSelectPurchase={(purchase) => setSelectedPurchaseId(purchase.id)}
            onDeletePurchase={(purchase) => setPurchasePendingDelete(purchase)}
          />
        ) : (
          <Card className="p-6">
            <DashboardEmptyState
              icon={CreditCard}
              eyebrow="No sales recorded yet"
              title="Transactions will appear here once buyers purchase your licenses"
              copy="This dedicated reporting view will populate as purchase activity moves through checkout and activation."
              hint="Keep building the catalog in the workspace while sales volume grows"
            />
          </Card>
        )}
      </section>

      <PurchaseDetailDrawer
        purchaseId={selectedPurchaseId}
        licenses={licenses}
        assets={assets}
        isDeleting={isDeletingPurchase}
        onClose={() => setSelectedPurchaseId(null)}
        onDeleteRequest={(purchase) => setPurchasePendingDelete(purchase)}
        onPurchaseUpdated={handlePurchaseUpdated}
      />

      <ConfirmDialog
        open={Boolean(purchasePendingDelete)}
        title={
          purchasePendingDelete
            ? `Delete purchase #${purchasePendingDelete.id}?`
            : "Delete purchase?"
        }
        description="This removes the transaction record from the sales trail. The action cannot be undone."
        confirmLabel="Delete sale"
        isConfirming={isDeletingPurchase}
        onClose={() => {
          if (!isDeletingPurchase) {
            setPurchasePendingDelete(null);
          }
        }}
        onConfirm={() => void handleDeletePurchase()}
      />
    </AppShell>
  );
}
