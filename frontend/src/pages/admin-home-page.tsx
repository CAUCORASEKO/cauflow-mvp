import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { AdminEmptyState, AdminStatCard, AdminStatusPill } from "@/components/admin/admin-ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminNav } from "@/lib/platform-nav";
import { formatCurrency, formatDate } from "@/lib/utils";
import { fetchAdminOverview, getAssetImageUrl } from "@/services/api";
import type { AdminOverview, Purchase } from "@/types/api";

const getPurchaseTitle = (purchase: Purchase) =>
  purchase.pack?.title || purchase.asset?.title || `License #${purchase.licenseId}`;

const getPurchaseStatus = (purchase: Purchase) =>
  purchase.payment?.status || purchase.paymentStatus || purchase.status;

export function AdminHomePage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);

  useEffect(() => {
    void fetchAdminOverview().then(setOverview);
  }, []);

  const metrics = overview?.metrics;

  return (
    <AppShell title="Admin workspace" subtitle="Platform operations" navItems={adminNav}>
      <section className="glass-panel rounded-[30px] border border-white/10 p-6 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr),420px]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-sky-200">Operational overview</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Platform control starts with review pressure, catalog health, and commercial clarity.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
              This workspace is the first CauFlow backoffice layer: calm enough to scan quickly,
              structured enough to moderate the premium catalog, and grounded in actual licensing
              and delivery operations.
            </p>
          </div>

          <Card className="surface-highlight p-5">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Immediate attention
            </p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-slate-400">Assets waiting for review</p>
                <p className="mt-2 font-display text-3xl text-white">
                  {metrics?.assetsPendingReview ?? 0}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-slate-400">Pending purchases</p>
                <p className="mt-2 font-display text-3xl text-white">
                  {metrics?.pendingPurchasesCount ?? 0}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-slate-400">Active rights on platform</p>
                <p className="mt-2 font-display text-3xl text-white">
                  {metrics?.activeLicenseGrantsCount ?? 0}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <AdminStatCard
          label="Catalog assets"
          value={String(metrics?.assetsCount ?? 0)}
          detail="All assets currently present across draft, published, and archived states."
        />
        <AdminStatCard
          label="Published assets"
          value={String(metrics?.publishedAssets ?? 0)}
          detail="Buyer-visible assets currently live in the premium catalog."
        />
        <AdminStatCard
          label="Archived assets"
          value={String(metrics?.archivedAssets ?? 0)}
          detail="Items retained for history, cleanup, or moderation traceability."
        />
        <AdminStatCard
          label="Packs"
          value={String(metrics?.packsCount ?? 0)}
          detail="Curated collections carrying their own commercial lifecycle."
        />
        <AdminStatCard
          label="Licenses"
          value={String(metrics?.licensesCount ?? 0)}
          detail="Commercial terms currently attached across the catalog."
        />
        <AdminStatCard
          label="Paid purchases"
          value={String(metrics?.paidPurchasesCount ?? 0)}
          detail="Completed commercial events linked to active platform rights."
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr),minmax(0,0.9fr)]">
        <Card className="surface-highlight p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Review queue preview
              </p>
              <h2 className="mt-3 font-display text-3xl text-white">Assets currently under review</h2>
            </div>
            <Link to="/app/admin/review">
              <Button variant="ghost" className="gap-2">
                Open review queue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {overview?.reviewQueue?.length ? (
            <div className="mt-5 grid gap-3">
              {overview.reviewQueue.map((asset) => {
                const imageUrl = getAssetImageUrl(
                  asset.previewImageUrl || asset.previewFile?.url || asset.imageUrl || null
                );

                return (
                  <div
                    key={asset.id}
                    className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex gap-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[16px] border border-white/10 bg-slate-900">
                        {imageUrl ? (
                          <img src={imageUrl} alt={asset.title} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <AdminStatusPill label="In review" tone="info" />
                          <AdminStatusPill
                            label={asset.deliveryReadiness?.isReady ? "Delivery ready" : "Needs fixes"}
                            tone={asset.deliveryReadiness?.isReady ? "success" : "warning"}
                          />
                        </div>
                        <h3 className="mt-3 text-lg text-white">{asset.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {asset.creator?.publicDisplayName ||
                            asset.creator?.organizationName ||
                            asset.creator?.studioName ||
                            asset.creator?.email ||
                            "Unknown creator"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300">
              No assets are currently waiting in review.
            </div>
          )}
        </Card>

        <div className="grid gap-5">
          <Card className="surface-highlight p-6">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Platform population</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-slate-400">Creators</p>
                <p className="mt-2 font-display text-3xl text-white">
                  {metrics?.creatorsCount ?? 0}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-slate-400">Buyers</p>
                <p className="mt-2 font-display text-3xl text-white">
                  {metrics?.buyersCount ?? 0}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 sm:col-span-2">
                <p className="text-sm text-slate-400">Total users</p>
                <p className="mt-2 font-display text-3xl text-white">
                  {metrics?.totalUsersCount ?? 0}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 sm:col-span-2">
                <p className="text-sm text-slate-400">Total purchases</p>
                <p className="mt-2 font-display text-3xl text-white">
                  {metrics?.purchasesCount ?? 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="surface-highlight p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Recent commerce
                </p>
                <h2 className="mt-3 font-display text-2xl text-white">Latest purchase activity</h2>
              </div>
              <Link to="/app/admin/commerce">
                <Button variant="ghost">Open purchases</Button>
              </Link>
            </div>

            {overview?.recentPurchases?.length ? (
              <div className="mt-5 grid gap-3">
                {overview.recentPurchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-white">{getPurchaseTitle(purchase)}</p>
                        <p className="mt-1 text-sm text-slate-400">{formatDate(purchase.createdAt)}</p>
                      </div>
                      <AdminStatusPill
                        label={getPurchaseStatus(purchase)}
                        tone={
                          getPurchaseStatus(purchase) === "paid"
                            ? "success"
                            : getPurchaseStatus(purchase) === "pending"
                              ? "warning"
                              : "neutral"
                        }
                      />
                    </div>
                    <p className="mt-3 text-sm text-slate-300">
                      {purchase.payment ? formatCurrency(Number(purchase.payment.amount)) : "Recorded"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <AdminEmptyState
                title="No purchase activity yet."
                copy="Commercial records will appear here once buyers begin moving through checkout."
              />
            )}
          </Card>
        </div>
      </section>
    </AppShell>
  );
}
