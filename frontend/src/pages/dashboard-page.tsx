import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Boxes,
  CreditCard,
  FolderOpen,
  RefreshCcw,
  SearchX,
  ShieldCheck,
  ShoppingCart
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ActionFeedback } from "@/components/dashboard/action-feedback";
import {
  AssetInventoryToolbar,
  type AssetImageFilter,
  type AssetSortOrder,
  type AssetViewMode
} from "@/components/dashboard/asset-inventory-toolbar";
import { AssetDetailDrawer } from "@/components/dashboard/asset-detail-drawer";
import { AssetLoadingState } from "@/components/dashboard/asset-loading-state";
import { AssetUploadForm } from "@/components/dashboard/asset-upload-form";
import { AssetsGrid } from "@/components/dashboard/assets-grid";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { LicenseForm } from "@/components/dashboard/license-form";
import { LicenseList } from "@/components/dashboard/license-list";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PurchaseForm } from "@/components/dashboard/purchase-form";
import { PurchaseList } from "@/components/dashboard/purchase-list";
import { PanelLoadingState } from "@/components/dashboard/panel-loading-state";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  deleteAsset,
  fetchAssets,
  fetchLicenses,
  fetchPurchases
} from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import type { Asset, License, Purchase } from "@/types/api";

export function DashboardPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [imageFilter, setImageFilter] = useState<AssetImageFilter>("all");
  const [sortOrder, setSortOrder] = useState<AssetSortOrder>("newest");
  const [viewMode, setViewMode] = useState<AssetViewMode>("grid");
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [assetPendingDelete, setAssetPendingDelete] = useState<Asset | null>(null);
  const [isDeletingAsset, setIsDeletingAsset] = useState(false);
  const [workspaceNotice, setWorkspaceNotice] = useState<{
    tone: "success" | "error";
    message: string;
    detail?: string;
  } | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [nextAssets, nextLicenses, nextPurchases] = await Promise.all([
        fetchAssets(),
        fetchLicenses(),
        fetchPurchases()
      ]);
      setAssets(nextAssets);
      setLicenses(nextLicenses);
      setPurchases(nextPurchases);
      setLastSyncedAt(new Date());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!workspaceNotice) {
      return;
    }

    const timeout = window.setTimeout(() => setWorkspaceNotice(null), 3400);
    return () => window.clearTimeout(timeout);
  }, [workspaceNotice]);

  const totalRevenue = useMemo(
    () =>
      purchases.reduce((sum, purchase) => {
        const matchedLicense = licenses.find(
          (license) => license.id === purchase.licenseId
        );
        return sum + Number(matchedLicense?.price || 0);
      }, 0),
    [licenses, purchases]
  );

  const filteredAssets = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return [...assets]
      .filter((asset) => {
        const matchesSearch =
          !normalizedQuery ||
          asset.title.toLowerCase().includes(normalizedQuery) ||
          asset.description?.toLowerCase().includes(normalizedQuery);

        const matchesImageFilter =
          imageFilter === "all" ||
          (imageFilter === "with-image" && Boolean(asset.imageUrl)) ||
          (imageFilter === "without-image" && !asset.imageUrl);

        return matchesSearch && matchesImageFilter;
      })
      .sort((left, right) => {
        const leftTimestamp = new Date(left.createdAt).getTime();
        const rightTimestamp = new Date(right.createdAt).getTime();

        return sortOrder === "newest"
          ? rightTimestamp - leftTimestamp
          : leftTimestamp - rightTimestamp;
      });
  }, [assets, imageFilter, searchQuery, sortOrder]);

  const handleAssetCreated = useCallback((asset: Asset) => {
    setAssets((currentAssets) => [asset, ...currentAssets]);
    setSelectedAssetId(asset.id);
    setLastSyncedAt(new Date());
    setWorkspaceNotice({
      tone: "success",
      message: "Asset added to inventory",
      detail: "The new record is available in the catalog immediately."
    });
  }, []);

  const handleAssetUpdated = useCallback((updatedAsset: Asset) => {
    setAssets((currentAssets) =>
      currentAssets.map((asset) => (asset.id === updatedAsset.id ? updatedAsset : asset))
    );
    setSelectedAssetId(updatedAsset.id);
    setLastSyncedAt(new Date());
  }, []);

  const handleLicenseCreated = useCallback((license: License) => {
    setLicenses((currentLicenses) => [license, ...currentLicenses]);
    setSelectedAssetId(license.assetId);
    setLastSyncedAt(new Date());
    setWorkspaceNotice({
      tone: "success",
      message: "License package created",
      detail: "The linked asset detail now reflects the new rights package."
    });
  }, []);

  const handlePurchaseCreated = useCallback(
    (purchase: Purchase) => {
      setPurchases((currentPurchases) => [purchase, ...currentPurchases]);
      const matchedLicense = licenses.find(
        (license) => license.id === purchase.licenseId
      );

      if (matchedLicense) {
        setSelectedAssetId(matchedLicense.assetId);
      }

      setLastSyncedAt(new Date());
      setWorkspaceNotice({
        tone: "success",
        message: "Purchase recorded",
        detail: "Revenue and relationship cues update without a manual refresh."
      });
    },
    [licenses]
  );

  const handleDeleteAsset = useCallback(async () => {
    if (!assetPendingDelete) {
      return;
    }

    try {
      setIsDeletingAsset(true);
      const deletedAsset = await deleteAsset(assetPendingDelete.id);
      const deletedLicenseIds = new Set(
        licenses
          .filter((license) => license.assetId === deletedAsset.id)
          .map((license) => license.id)
      );

      setAssets((currentAssets) =>
        currentAssets.filter((asset) => asset.id !== deletedAsset.id)
      );
      setLicenses((currentLicenses) =>
        currentLicenses.filter((license) => license.assetId !== deletedAsset.id)
      );
      setPurchases((currentPurchases) =>
        currentPurchases.filter(
          (purchase) => !deletedLicenseIds.has(purchase.licenseId)
        )
      );
      setSelectedAssetId((currentSelectedAssetId) =>
        currentSelectedAssetId === deletedAsset.id ? null : currentSelectedAssetId
      );
      setAssetPendingDelete(null);
      setLastSyncedAt(new Date());
      setWorkspaceNotice({
        tone: "success",
        message: "Asset deleted",
        detail:
          "Linked licenses and purchases were removed from the workspace state as well."
      });
    } catch (deleteError) {
      setWorkspaceNotice({
        tone: "error",
        message:
          deleteError instanceof Error ? deleteError.message : "Unable to delete asset"
      });
    } finally {
      setIsDeletingAsset(false);
    }
  }, [assetPendingDelete, licenses]);

  const hasSearchFilters =
    searchQuery.trim().length > 0 || imageFilter !== "all" || sortOrder !== "newest";

  return (
    <DashboardShell
      assetsCount={assets.length}
      licensesCount={licenses.length}
      purchasesCount={purchases.length}
      totalRevenue={totalRevenue}
      hasError={Boolean(error)}
    >
      <section
        id="overview"
        className="glass-panel surface-highlight rounded-[30px] border border-white/10 p-5 md:p-6 xl:p-7"
      >
        <div className="grid gap-4 lg:gap-5 xl:gap-6 lg:grid-cols-[minmax(0,1.2fr),minmax(320px,0.84fr)] 2xl:grid-cols-[minmax(0,1.28fr),390px]">
          <div className="max-w-3xl self-start">
            <p className="text-xs uppercase tracking-[0.28em] text-sky-200">
              Workspace overview
            </p>
            <h1 className="mt-3 font-display text-[2.45rem] font-semibold tracking-tight text-white sm:text-[2.8rem] lg:text-[2.95rem] xl:text-[3.25rem] xl:leading-[1.02]">
              Operate the full asset-to-license pipeline from one command surface.
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-300 md:text-base xl:text-lg">
              Review inventory, package rights, search catalog records, inspect
              relationships, and record purchase activity against the live CauFlow
              backend without leaving the workspace.
            </p>
          </div>

          <div className="grid w-full gap-3 self-start sm:grid-cols-2">
            <div className="surface-highlight rounded-[24px] border border-white/10 bg-black/20 p-4 sm:col-span-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    API status
                  </p>
                  <div className="mt-2 flex items-center gap-2.5">
                    <div
                      className={`h-2.5 w-2.5 rounded-full shadow-[0_0_18px_currentColor] ${
                        error ? "bg-rose-300" : "bg-emerald-400"
                      }`}
                    />
                    <span className="text-sm font-semibold text-white">
                      {error ? "Needs attention" : "Connected to localhost:5001"}
                    </span>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => void loadDashboard()}
                  className="gap-2 px-4 py-2.5"
                  disabled={loading}
                  aria-busy={loading}
                >
                  <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  {loading ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                <span>Assets</span>
                <span>Licenses</span>
                <span>Purchases</span>
                <span>
                  {lastSyncedAt
                    ? `Synced ${lastSyncedAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}`
                    : "Awaiting sync"}
                </span>
              </div>
            </div>

            <div className="surface-highlight rounded-[24px] border border-white/10 bg-white/[0.03] p-3.5 xl:p-4 transition-all duration-300 hover:border-white/14 hover:bg-white/[0.05]">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Focus
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                Searchable operational inventory
              </p>
            </div>
            <div className="surface-highlight rounded-[24px] border border-white/10 bg-white/[0.03] p-3.5 xl:p-4 transition-all duration-300 hover:border-white/14 hover:bg-white/[0.05]">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Flow health
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm font-medium text-white">
                Live workspace
                <ArrowUpRight className="h-4 w-4 text-sky-200" />
              </p>
            </div>
          </div>
        </div>
      </section>

      {workspaceNotice ? (
        <ActionFeedback
          tone={workspaceNotice.tone}
          message={workspaceNotice.message}
          detail={workspaceNotice.detail}
        />
      ) : null}

      {error ? (
        <Card className="surface-highlight border border-rose-400/20 bg-rose-400/5 p-5">
          <p className="font-semibold text-rose-200">Unable to load dashboard data</p>
          <p className="mt-2 text-sm text-rose-100/80">{error}</p>
        </Card>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        <MetricCard
          label="Assets"
          value={String(assets.length)}
          detail="Curated inventory uploaded into the platform."
          icon={Boxes}
        />
        <MetricCard
          label="Licenses"
          value={String(licenses.length)}
          detail="Monetizable rights packages attached to assets."
          icon={ShieldCheck}
        />
        <MetricCard
          label="Revenue represented"
          value={formatCurrency(totalRevenue)}
          detail="Derived from recorded purchases and linked license prices."
          icon={CreditCard}
        />
      </section>

      <section
        id="assets"
        className="grid gap-5 xl:grid-cols-[minmax(320px,0.82fr),minmax(0,1.18fr)] 2xl:grid-cols-[380px,minmax(0,1fr)]"
      >
        <div className="xl:sticky xl:top-4 2xl:top-5 xl:self-start">
          <AssetUploadForm onCreated={handleAssetCreated} />
        </div>

        <Card className="surface-highlight p-6 md:p-7">
          <SectionHeading
            eyebrow="Assets"
            title="Visual inventory"
            copy="Search, filter, inspect, and manage the asset catalog with relationship context built into the workflow."
          />

          <div className="mt-8 space-y-6">
            <AssetInventoryToolbar
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              imageFilter={imageFilter}
              onImageFilterChange={setImageFilter}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              filteredCount={filteredAssets.length}
              totalCount={assets.length}
            />

            {loading ? (
              <AssetLoadingState />
            ) : assets.length === 0 ? (
              <DashboardEmptyState
                icon={FolderOpen}
                eyebrow="Inventory empty"
                title="Your asset catalog is ready for its first upload"
                copy="Once an image is added, CauFlow turns it into a searchable inventory record with relationship cues and management actions."
                hint="Use the asset intake panel to seed the catalog"
              />
            ) : filteredAssets.length > 0 ? (
              <AssetsGrid
                assets={filteredAssets}
                licenses={licenses}
                purchases={purchases}
                viewMode={viewMode}
                selectedAssetId={selectedAssetId}
                onSelectAsset={(asset) => setSelectedAssetId(asset.id)}
                onDeleteAsset={(asset) => setAssetPendingDelete(asset)}
              />
            ) : (
              <DashboardEmptyState
                icon={SearchX}
                eyebrow="No matches"
                title="No assets match the current search and filter set"
                copy="Adjust the search query, image filter, or sort controls to bring more of the catalog back into view."
                hint={
                  hasSearchFilters
                    ? "Reset filters to restore the full inventory"
                    : "Try another title or description keyword"
                }
              />
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div id="licenses" className="space-y-6">
          <LicenseForm assets={assets} onCreated={handleLicenseCreated} />
          {loading ? (
            <PanelLoadingState title="licenses" />
          ) : licenses.length > 0 ? (
            <LicenseList licenses={licenses} assets={assets} />
          ) : (
            <Card className="p-6">
              <DashboardEmptyState
                icon={ShieldCheck}
                eyebrow="No packages yet"
                title="License packages will appear here once rights are defined"
                copy="Create a package from an uploaded asset to establish usage scope, pricing, and the record buyers will transact against."
                hint="Create the first rights package from the form above"
              />
            </Card>
          )}
        </div>

        <div id="purchases" className="space-y-6">
          <PurchaseForm licenses={licenses} onCreated={handlePurchaseCreated} />
          {loading ? (
            <PanelLoadingState title="purchases" />
          ) : purchases.length > 0 ? (
            <PurchaseList purchases={purchases} licenses={licenses} />
          ) : (
            <Card className="p-6">
              <DashboardEmptyState
                icon={ShoppingCart}
                eyebrow="No transactions yet"
                title="Recorded purchases will build the commercial trail here"
                copy="After a license exists, each purchase entry adds buyer identity, linked package data, and a cleaner revenue signal across the workspace."
                hint="Use the transaction form to log the first purchase"
              />
            </Card>
          )}
        </div>
      </section>

      <AssetDetailDrawer
        assetId={selectedAssetId}
        licenses={licenses}
        purchases={purchases}
        isDeleting={isDeletingAsset}
        onClose={() => setSelectedAssetId(null)}
        onDeleteRequest={(asset) => setAssetPendingDelete(asset)}
        onAssetUpdated={handleAssetUpdated}
      />

      <ConfirmDialog
        open={Boolean(assetPendingDelete)}
        title={assetPendingDelete ? `Delete ${assetPendingDelete.title}?` : "Delete asset?"}
        description="This will remove the asset and cascade through any linked licenses and purchases. The action cannot be undone."
        confirmLabel="Delete asset"
        isConfirming={isDeletingAsset}
        onClose={() => {
          if (!isDeletingAsset) {
            setAssetPendingDelete(null);
          }
        }}
        onConfirm={() => void handleDeleteAsset()}
      />
    </DashboardShell>
  );
}
