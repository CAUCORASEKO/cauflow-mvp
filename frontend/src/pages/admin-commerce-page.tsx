import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AdminEmptyState, AdminStatCard, AdminStatusPill } from "@/components/admin/admin-ui";
import { Card } from "@/components/ui/card";
import { adminNav } from "@/lib/platform-nav";
import { formatCurrency, formatDate, humanizeLabel } from "@/lib/utils";
import { fetchAdminCommerce } from "@/services/api";
import type { AdminCommerceRecord, AdminCommerceSnapshot } from "@/types/api";

const getOfferingTitle = (purchase: AdminCommerceRecord) =>
  purchase.pack?.title || purchase.asset?.title || `License #${purchase.licenseId}`;

const getPurchaseStatus = (purchase: AdminCommerceRecord) =>
  purchase.payment?.status || purchase.paymentStatus || purchase.status;

const getItemType = (purchase: AdminCommerceRecord) =>
  purchase.packId || purchase.pack
    ? "Pack"
    : purchase.assetId || purchase.asset
      ? "Asset"
      : purchase.licenseId
        ? "License"
        : "Record";

const getBuyerLabel = (purchase: AdminCommerceRecord) =>
  purchase.buyer?.publicDisplayName ||
  purchase.buyer?.organizationName ||
  purchase.buyer?.studioName ||
  purchase.buyer?.email ||
  purchase.buyerEmail;

const getCreatorLabel = (purchase: AdminCommerceRecord) =>
  purchase.creator?.publicDisplayName ||
  purchase.creator?.organizationName ||
  purchase.creator?.studioName ||
  purchase.creator?.email ||
  "Unavailable";

export function AdminCommercePage() {
  const [snapshot, setSnapshot] = useState<AdminCommerceSnapshot | null>(null);

  useEffect(() => {
    void fetchAdminCommerce().then(setSnapshot);
  }, []);

  return (
    <AppShell title="Purchases" subtitle="Admin commerce visibility" navItems={adminNav}>
      <section className="glass-panel rounded-[30px] border border-white/10 p-6 md:p-7">
        <p className="text-xs uppercase tracking-[0.28em] text-sky-200">Commercial activity</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white md:text-5xl">
          Track what sold, what is pending, and whether platform rights actually activated.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
          This is the first commercial oversight layer for admins: purchases, payment outcomes,
          buyer and creator context, and the entitlement state created behind each transaction.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <AdminStatCard
          label="Purchases"
          value={String(snapshot?.summary.purchasesCount ?? 0)}
          detail="All recorded purchase rows on the platform."
        />
        <AdminStatCard
          label="Paid"
          value={String(snapshot?.summary.paidPurchasesCount ?? 0)}
          detail="Commercial events with successful payment status."
        />
        <AdminStatCard
          label="Pending"
          value={String(snapshot?.summary.pendingPurchasesCount ?? 0)}
          detail="Transactions still waiting for payment completion."
        />
        <AdminStatCard
          label="Active grants"
          value={String(snapshot?.summary.activeGrantsCount ?? 0)}
          detail="Purchases that currently resulted in active rights."
        />
      </section>

      {snapshot?.purchases.length ? (
        <div className="grid gap-5">
          {snapshot.purchases.map((purchase) => (
            <Card key={purchase.id} className="surface-highlight p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <AdminStatusPill label={getItemType(purchase)} tone="info" />
                    <AdminStatusPill
                      label={humanizeLabel(getPurchaseStatus(purchase))}
                      tone={
                        getPurchaseStatus(purchase) === "paid"
                          ? "success"
                          : getPurchaseStatus(purchase) === "pending"
                            ? "warning"
                            : getPurchaseStatus(purchase) === "refunded"
                              ? "danger"
                              : "neutral"
                      }
                    />
                    <AdminStatusPill
                      label={purchase.grantStatus ? humanizeLabel(purchase.grantStatus) : "No grant"}
                      tone={purchase.grantStatus === "active" ? "success" : "neutral"}
                    />
                  </div>
                  <h2 className="mt-3 font-display text-3xl text-white">{getOfferingTitle(purchase)}</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Buyer: {getBuyerLabel(purchase)}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Creator: {getCreatorLabel(purchase)}
                  </p>
                </div>

                <div className="text-left xl:text-right">
                  <p className="font-display text-3xl text-white">
                    {purchase.payment ? formatCurrency(Number(purchase.payment.amount)) : "Recorded"}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">{formatDate(purchase.createdAt)}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-5">
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Purchase</p>
                  <p className="mt-2 text-white">#{purchase.id}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Item type</p>
                  <p className="mt-2 text-white">{getItemType(purchase)}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Payment</p>
                  <p className="mt-2 text-white">
                    {humanizeLabel(getPurchaseStatus(purchase))}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Entitlement</p>
                  <p className="mt-2 text-white">
                    {purchase.grantStatus ? humanizeLabel(purchase.grantStatus) : "Not created"}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Downloads</p>
                  <p className="mt-2 text-white">
                    {purchase.downloadAccess ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <AdminEmptyState
          title="No purchase records yet."
          copy="Commercial activity will appear here once buyers move through checkout and payment."
        />
      )}
    </AppShell>
  );
}
