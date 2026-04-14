import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { AdminEmptyState, AdminStatCard, AdminStatusPill } from "@/components/admin/admin-ui";
import { Card } from "@/components/ui/card";
import { adminNav } from "@/lib/platform-nav";
import { formatAssetDeliveryStatus } from "@/lib/asset-delivery";
import { formatAssetReviewStatus } from "@/lib/asset-review";
import { formatLicenseType, formatLicenseUsage } from "@/lib/license-taxonomy";
import { formatCurrency, formatDate } from "@/lib/utils";
import { fetchAdminCatalog, getAssetImageUrl } from "@/services/api";
import type { AdminCatalogSnapshot } from "@/types/api";

type CatalogView = "assets" | "packs" | "licenses";

export function AdminCatalogPage() {
  const [snapshot, setSnapshot] = useState<AdminCatalogSnapshot | null>(null);
  const [view, setView] = useState<CatalogView>("assets");

  useEffect(() => {
    void fetchAdminCatalog().then(setSnapshot);
  }, []);

  const viewLabel = useMemo(
    () =>
      view === "assets" ? "assets" : view === "packs" ? "packs" : "licenses",
    [view]
  );

  return (
    <AppShell title="Catalog" subtitle="Admin catalog operations" navItems={adminNav}>
      <section className="glass-panel rounded-[30px] border border-white/10 p-6 md:p-7">
        <p className="text-xs uppercase tracking-[0.28em] text-sky-200">Catalog oversight</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white md:text-5xl">
          Inspect the premium catalog across assets, packs, and license layers without losing lifecycle context.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
          This surface is for platform quality control: review state, publication state, delivery
          discipline, and commercial readiness across the creator-managed catalog.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {(["assets", "packs", "licenses"] as CatalogView[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={`focus-ring rounded-full border px-4 py-2 text-sm transition-colors ${
                view === option
                  ? "border-sky-300/25 bg-sky-300/[0.08] text-sky-100"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {option[0].toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <AdminStatCard
          label="Assets"
          value={String(snapshot?.summary.assetsCount ?? 0)}
          detail="Total visual assets present across draft, published, and archived states."
        />
        <AdminStatCard
          label="In review"
          value={String(snapshot?.summary.inReviewCount ?? 0)}
          detail="Assets currently sitting in the moderation queue."
        />
        <AdminStatCard
          label="Packs"
          value={String(snapshot?.summary.packsCount ?? 0)}
          detail="Collection-level offers tied to premium licensing."
        />
        <AdminStatCard
          label="Licenses"
          value={String(snapshot?.summary.licensesCount ?? 0)}
          detail="Commercial templates attached to the catalog."
        />
      </section>

      {view === "assets" ? (
        snapshot?.assets.length ? (
          <div className="grid gap-5">
            {snapshot.assets.map((asset) => {
              const imageUrl = getAssetImageUrl(
                asset.previewImageUrl || asset.previewFile?.url || asset.imageUrl || null
              );

              return (
                <Card key={asset.id} className="surface-highlight p-5">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[20px] border border-white/10 bg-slate-900">
                        {imageUrl ? (
                          <img src={imageUrl} alt={asset.title} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <AdminStatusPill label={asset.status} />
                          <AdminStatusPill
                            label={formatAssetReviewStatus(asset.reviewStatus)}
                            tone={
                              asset.reviewStatus === "approved"
                                ? "success"
                                : asset.reviewStatus === "in_review"
                                  ? "info"
                                  : asset.reviewStatus === "rejected"
                                    ? "danger"
                                    : "neutral"
                            }
                          />
                          <AdminStatusPill
                            label={formatAssetDeliveryStatus(asset.deliveryReadiness?.status)}
                            tone={asset.deliveryReadiness?.isReady ? "success" : "warning"}
                          />
                        </div>
                        <h2 className="mt-3 font-display text-2xl text-white">{asset.title}</h2>
                        <p className="mt-2 text-sm text-slate-400">
                          {asset.creator?.publicDisplayName ||
                            asset.creator?.organizationName ||
                            asset.creator?.studioName ||
                            asset.creator?.email ||
                            "Unknown creator"}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {asset.reviewNote ||
                            asset.deliveryReadiness?.helperText ||
                            "No moderation note recorded yet."}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3 xl:w-[420px]">
                      <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Visual type</p>
                        <p className="mt-2 text-white">{asset.visualType.replace(/_/g, " ")}</p>
                      </div>
                      <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Master file</p>
                        <p className="mt-2 text-white">
                          {asset.masterFile?.resolutionSummary || "Unavailable"}
                        </p>
                      </div>
                      <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Created</p>
                        <p className="mt-2 text-white">{formatDate(asset.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <AdminEmptyState
            title="No assets in catalog."
            copy="Creator assets will appear here once the visual catalog is populated."
          />
        )
      ) : null}

      {view === "packs" ? (
        snapshot?.packs.length ? (
          <div className="grid gap-5">
            {snapshot.packs.map((pack) => (
              <Card key={pack.id} className="surface-highlight p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <AdminStatusPill label={pack.status} />
                      <AdminStatusPill label={pack.category.replace(/_/g, " ")} tone="info" />
                    </div>
                    <h2 className="mt-3 font-display text-2xl text-white">{pack.title}</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      {pack.creator?.publicDisplayName ||
                        pack.creator?.organizationName ||
                        pack.creator?.studioName ||
                        pack.creator?.email ||
                        "Unknown creator"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{pack.description}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 xl:w-[420px]">
                    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Price</p>
                      <p className="mt-2 text-white">{formatCurrency(Number(pack.price))}</p>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Asset count</p>
                      <p className="mt-2 text-white">{pack.assetCount}</p>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Updated</p>
                      <p className="mt-2 text-white">{formatDate(pack.updatedAt)}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <AdminEmptyState title="No packs in catalog." copy="Pack offers will appear here once creators publish collections." />
        )
      ) : null}

      {view === "licenses" ? (
        snapshot?.licenses.length ? (
          <div className="grid gap-5">
            {snapshot.licenses.map((license) => (
              <Card key={license.id} className="surface-highlight p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <AdminStatusPill label={license.status} />
                      <AdminStatusPill label={formatLicenseUsage(license.usage)} tone="info" />
                    </div>
                    <h2 className="mt-3 font-display text-2xl text-white">
                      {formatLicenseType(license.type)}
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      {license.asset?.title || `Asset #${license.assetId}`}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Owned by{" "}
                      {license.creator?.publicDisplayName ||
                        license.creator?.organizationName ||
                        license.creator?.studioName ||
                        license.creator?.email ||
                        "Unknown creator"}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4 xl:w-[520px]">
                    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Price</p>
                      <p className="mt-2 text-white">{formatCurrency(Number(license.price))}</p>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Purchases</p>
                      <p className="mt-2 text-white">{license.purchaseCount}</p>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Active grants</p>
                      <p className="mt-2 text-white">{license.activeGrantCount}</p>
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Created</p>
                      <p className="mt-2 text-white">{formatDate(license.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <AdminEmptyState
            title={`No ${viewLabel} yet.`}
            copy="License templates will appear here as creators attach commercial terms to their assets."
          />
        )
      ) : null}
    </AppShell>
  );
}
