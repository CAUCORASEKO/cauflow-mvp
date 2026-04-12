import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Box,
  Boxes,
  CreditCard,
  FolderOpen,
  RefreshCcw,
  SearchX,
  ShieldCheck
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
import {
  CatalogStatusFilter,
  type CatalogFilterValue
} from "@/components/dashboard/catalog-status-filter";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { LicenseForm } from "@/components/dashboard/license-form";
import { LicenseDetailDrawer } from "@/components/dashboard/license-detail-drawer";
import { LicenseList } from "@/components/dashboard/license-list";
import { PackDetailDrawer } from "@/components/dashboard/pack-detail-drawer";
import { PackForm } from "@/components/dashboard/pack-form";
import { PackList } from "@/components/dashboard/pack-list";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PanelLoadingState } from "@/components/dashboard/panel-loading-state";
import { WorkflowRail } from "@/components/dashboard/workflow-rail";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  deleteAsset,
  deleteLicense,
  deletePack,
  fetchAssets,
  fetchLicenses,
  fetchPurchases,
  getPacks,
  updateAsset,
  updateLicense
} from "@/services/api";
import { formatCatalogStatus } from "@/lib/catalog-lifecycle";
import { getAssetPreviewUrl } from "@/lib/asset-delivery";
import { formatCurrency } from "@/lib/utils";
import type { Asset, CatalogStatus, License, Pack, Purchase } from "@/types/api";

type WorkspaceSection = "assets" | "packs" | "licenses";

const workspaceSectionMeta: Record<
  WorkspaceSection,
  {
    label: string;
    eyebrow: string;
    copy: string;
  }
> = {
  assets: {
    label: "Assets",
    eyebrow: "Creator workspace / Assets",
    copy: "Upload, filter, inspect, and refine the source inventory that powers the rest of the pipeline."
  },
  packs: {
    label: "Packs",
    eyebrow: "Creator workspace / Packs",
    copy: "Assemble premium creative products from multiple assets without leaving the shared operating surface."
  },
  licenses: {
    label: "Licenses",
    eyebrow: "Creator workspace / Licenses",
    copy: "Define rights, pricing, and commercial terms after the asset and pack layers are in place."
  }
};

const resolveWorkspaceSection = (hash: string): WorkspaceSection => {
  const normalizedHash = hash.replace("#", "");

  if (normalizedHash === "packs" || normalizedHash === "licenses" || normalizedHash === "assets") {
    return normalizedHash;
  }

  return "assets";
};

const formatDependencySummary = (segments: string[]) => {
  if (segments.length === 0) {
    return "";
  }

  if (segments.length === 1) {
    return segments[0];
  }

  if (segments.length === 2) {
    return `${segments[0]} and ${segments[1]}`;
  }

  return `${segments.slice(0, -1).join(", ")}, and ${segments[segments.length - 1]}`;
};

export function DashboardPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
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
  const [assetStatusActionId, setAssetStatusActionId] = useState<number | null>(null);
  const [assetPendingDelete, setAssetPendingDelete] = useState<Asset | null>(null);
  const [isDeletingAsset, setIsDeletingAsset] = useState(false);
  const [selectedLicenseId, setSelectedLicenseId] = useState<number | null>(null);
  const [licenseStatusActionId, setLicenseStatusActionId] = useState<number | null>(null);
  const [licensePendingDelete, setLicensePendingDelete] = useState<License | null>(null);
  const [isDeletingLicense, setIsDeletingLicense] = useState(false);
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);
  const [packPendingDelete, setPackPendingDelete] = useState<Pack | null>(null);
  const [isDeletingPack, setIsDeletingPack] = useState(false);
  const [assetStatusFilter, setAssetStatusFilter] = useState<CatalogFilterValue>("all");
  const [packStatusFilter, setPackStatusFilter] = useState<CatalogFilterValue>("all");
  const [licenseStatusFilter, setLicenseStatusFilter] = useState<CatalogFilterValue>("all");
  const [activeSection, setActiveSection] = useState<WorkspaceSection>(() =>
    typeof window === "undefined" ? "assets" : resolveWorkspaceSection(window.location.hash)
  );
  const [workspaceNotice, setWorkspaceNotice] = useState<{
    tone: "success" | "error";
    message: string;
    detail?: string;
  } | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [nextAssets, nextPacks, nextLicenses, nextPurchases] = await Promise.all([
        fetchAssets(),
        getPacks(),
        fetchLicenses(),
        fetchPurchases()
      ]);
      setAssets(nextAssets);
      setPacks(nextPacks);
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

  useEffect(() => {
    const syncFromHash = () => {
      setActiveSection(resolveWorkspaceSection(window.location.hash));
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);

    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  useEffect(() => {
    if (!window.location.hash) {
      return;
    }

    const sectionId = resolveWorkspaceSection(window.location.hash);
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const sectionElements = (["assets", "packs", "licenses"] as WorkspaceSection[])
      .map((section) => document.getElementById(section))
      .filter(Boolean) as HTMLElement[];

    if (sectionElements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (!visibleEntry) {
          return;
        }

        const nextSection = resolveWorkspaceSection(`#${visibleEntry.target.id}`);
        setActiveSection((currentSection) => {
          if (currentSection === nextSection) {
            return currentSection;
          }

          window.history.replaceState(null, "", `#${nextSection}`);
          window.dispatchEvent(new HashChangeEvent("hashchange"));
          return nextSection;
        });
      },
      {
        rootMargin: "-18% 0px -52% 0px",
        threshold: [0.2, 0.35, 0.55]
      }
    );

    sectionElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

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
        const matchesStatus =
          assetStatusFilter === "all" || asset.status === assetStatusFilter;
        const matchesSearch =
          !normalizedQuery ||
          asset.title.toLowerCase().includes(normalizedQuery) ||
          asset.description?.toLowerCase().includes(normalizedQuery);

        const matchesImageFilter =
          imageFilter === "all" ||
          (imageFilter === "with-image" && Boolean(getAssetPreviewUrl(asset))) ||
          (imageFilter === "without-image" && !getAssetPreviewUrl(asset));

        return matchesStatus && matchesSearch && matchesImageFilter;
      })
      .sort((left, right) => {
        const leftTimestamp = new Date(left.createdAt).getTime();
        const rightTimestamp = new Date(right.createdAt).getTime();

        return sortOrder === "newest"
          ? rightTimestamp - leftTimestamp
          : leftTimestamp - rightTimestamp;
      });
  }, [assetStatusFilter, assets, imageFilter, searchQuery, sortOrder]);

  const filteredPacks = useMemo(
    () =>
      packs.filter((pack) => packStatusFilter === "all" || pack.status === packStatusFilter),
    [packStatusFilter, packs]
  );

  const filteredLicenses = useMemo(
    () =>
      licenses.filter(
        (license) =>
          licenseStatusFilter === "all" || license.status === licenseStatusFilter
      ),
    [licenseStatusFilter, licenses]
  );

  const getStatusCounts = useCallback(
    <T extends { status: CatalogStatus }>(items: T[]) =>
      items.reduce(
        (counts, item) => {
          counts[item.status] += 1;
          return counts;
        },
        { draft: 0, published: 0, archived: 0 } as Record<CatalogStatus, number>
      ),
    []
  );

  const assetStatusCounts = useMemo(() => getStatusCounts(assets), [assets, getStatusCounts]);
  const packStatusCounts = useMemo(() => getStatusCounts(packs), [getStatusCounts, packs]);
  const licenseStatusCounts = useMemo(
    () => getStatusCounts(licenses),
    [getStatusCounts, licenses]
  );

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
    setPacks((currentPacks) =>
      currentPacks.map((pack) => ({
        ...pack,
        coverAsset:
          pack.coverAsset?.id === updatedAsset.id ? updatedAsset : pack.coverAsset,
        assets: pack.assets?.map((item) =>
          item.asset.id === updatedAsset.id ? { ...item, asset: updatedAsset } : item
        )
      }))
    );
    setSelectedAssetId(updatedAsset.id);
    setLastSyncedAt(new Date());
    setWorkspaceNotice({
      tone: "success",
      message: "Asset updated",
      detail: "The latest metadata is now reflected across the workspace."
    });
  }, []);

  const handleLicenseCreated = useCallback((license: License) => {
    setLicenses((currentLicenses) => [license, ...currentLicenses]);
    setSelectedAssetId(license.assetId);
    setSelectedLicenseId(license.id);
    setLastSyncedAt(new Date());
    setWorkspaceNotice({
      tone: "success",
      message: "License package created",
      detail: "The linked asset detail now reflects the new rights package."
    });
  }, []);

  const handlePackCreated = useCallback((pack: Pack) => {
    setPacks((currentPacks) => [pack, ...currentPacks]);
    setSelectedPackId(pack.id);
    setLastSyncedAt(new Date());
    setWorkspaceNotice({
      tone: "success",
      message: "Creative pack created",
      detail: "The new product bundle is now part of the live commercial catalog."
    });
  }, []);

  const handlePackUpdated = useCallback((updatedPack: Pack) => {
    setPacks((currentPacks) =>
      currentPacks.map((pack) => (pack.id === updatedPack.id ? updatedPack : pack))
    );
    setSelectedPackId(updatedPack.id);
    setLastSyncedAt(new Date());
    setWorkspaceNotice({
      tone: "success",
      message: "Pack updated",
      detail: "Commercial bundle changes are now live in the workspace."
    });
  }, []);

  const handleDeleteAsset = useCallback(async () => {
    if (!assetPendingDelete) {
      return;
    }

    try {
      setIsDeletingAsset(true);
      const deletedAsset = await deleteAsset(assetPendingDelete.id);
      await loadDashboard();
      setSelectedAssetId((currentSelectedAssetId) =>
        currentSelectedAssetId === deletedAsset.id ? null : currentSelectedAssetId
      );
      setSelectedLicenseId(null);
      setAssetPendingDelete(null);
      setLastSyncedAt(new Date());
      setWorkspaceNotice({
        tone: "success",
        message: "Asset deleted",
        detail: "The asset has been removed from the creator catalog."
      });
    } catch (deleteError) {
      setWorkspaceNotice({
        tone: "error",
        message:
          deleteError instanceof Error ? deleteError.message : "Unable to delete asset",
        detail:
          "If this asset is already used in packs, licenses, or commercial history, remove the dependency before deleting."
      });
    } finally {
      setIsDeletingAsset(false);
    }
  }, [assetPendingDelete, loadDashboard]);

  const handleAssetStatusAction = useCallback(async (asset: Asset) => {
    if (asset.status === "draft" && !asset.canPublish) {
      setSelectedAssetId(asset.id);
      setWorkspaceNotice({
        tone: "error",
        message:
          asset.publishBlockedReasons?.[0] ||
          "This asset must pass review and delivery checks before it can go live.",
        detail: "Open the asset detail drawer to review the submission and approval controls."
      });
      return;
    }

    const nextStatus: Asset["status"] =
      asset.status === "published"
        ? "draft"
        : asset.status === "archived"
          ? "draft"
          : "published";

    try {
      setAssetStatusActionId(asset.id);
      const updatedAsset = await updateAsset(asset.id, {
        title: asset.title,
        description: asset.description || "",
        visualType: asset.visualType,
        status: nextStatus
      });
      handleAssetUpdated(updatedAsset);
      setWorkspaceNotice({
        tone: "success",
        message: `${asset.title} moved to ${formatCatalogStatus(nextStatus)}`,
        detail:
          nextStatus === "published"
            ? "The asset is now visible in active marketplace flows."
            : "The asset is now hidden from buyer-facing marketplace availability."
      });
    } catch (statusError) {
      setWorkspaceNotice({
        tone: "error",
        message:
          statusError instanceof Error ? statusError.message : "Unable to update asset status",
        detail: "Open the asset drawer if you need to review delivery and approval blockers."
      });
    } finally {
      setAssetStatusActionId(null);
    }
  }, [handleAssetUpdated]);

  const handleLicenseUpdated = useCallback((updatedLicense: License) => {
    setLicenses((currentLicenses) =>
      currentLicenses.map((license) =>
        license.id === updatedLicense.id ? updatedLicense : license
      )
    );
    setPacks((currentPacks) =>
      currentPacks.map((pack) =>
        pack.license?.id === updatedLicense.id ? { ...pack, license: updatedLicense } : pack
      )
    );
    setSelectedLicenseId(updatedLicense.id);
    setLastSyncedAt(new Date());
    setWorkspaceNotice({
      tone: "success",
      message: "License updated",
      detail: "The rights package now reflects the latest pricing and policy settings."
    });
  }, []);

  const handleDeleteLicense = useCallback(async () => {
    if (!licensePendingDelete) {
      return;
    }

    try {
      setIsDeletingLicense(true);
      const deletedLicense = await deleteLicense(licensePendingDelete.id);
      await loadDashboard();
      setSelectedLicenseId((currentSelectedLicenseId) =>
        currentSelectedLicenseId === deletedLicense.id ? null : currentSelectedLicenseId
      );
      setLicensePendingDelete(null);
      setLastSyncedAt(new Date());
      setWorkspaceNotice({
        tone: "success",
        message: "License deleted",
        detail: "The rights package has been removed from the creator catalog."
      });
    } catch (deleteError) {
      setWorkspaceNotice({
        tone: "error",
        message:
          deleteError instanceof Error ? deleteError.message : "Unable to delete license",
        detail:
          "Purchased or granted licenses stay protected. Remove non-commercial dependencies before deleting."
      });
    } finally {
      setIsDeletingLicense(false);
    }
  }, [licensePendingDelete, loadDashboard]);

  const handleLicenseStatusAction = useCallback(async (license: License) => {
    const nextStatus: License["status"] =
      license.status === "published"
        ? "draft"
        : license.status === "archived"
          ? "draft"
          : "published";

    try {
      setLicenseStatusActionId(license.id);
      const updatedLicense = await updateLicense(license.id, {
        type: license.type,
        price: Number(license.price),
        usage: license.usage,
        status: nextStatus,
        policy: license.policy || undefined
      });
      handleLicenseUpdated(updatedLicense);
      setWorkspaceNotice({
        tone: "success",
        message: `License moved to ${formatCatalogStatus(nextStatus)}`,
        detail:
          nextStatus === "published"
            ? "The rights package is available for new buyer activity."
            : "Existing grants remain intact while new buyer activity stays paused."
      });
    } catch (statusError) {
      setWorkspaceNotice({
        tone: "error",
        message:
          statusError instanceof Error ? statusError.message : "Unable to update license status",
        detail: "Open the license drawer if you need to review the full lifecycle controls."
      });
    } finally {
      setLicenseStatusActionId(null);
    }
  }, [handleLicenseUpdated]);

  const handleDeletePack = useCallback(async () => {
    if (!packPendingDelete) {
      return;
    }

    try {
      setIsDeletingPack(true);
      const deletedPack = await deletePack(packPendingDelete.id);
      await loadDashboard();
      setSelectedPackId((currentSelectedPackId) =>
        currentSelectedPackId === deletedPack.id ? null : currentSelectedPackId
      );
      setPackPendingDelete(null);
      setLastSyncedAt(new Date());
      setWorkspaceNotice({
        tone: "success",
        message: "Pack deleted",
        detail: "The bundled product has been removed from the creator catalog."
      });
    } catch (deleteError) {
      setWorkspaceNotice({
        tone: "error",
        message:
          deleteError instanceof Error ? deleteError.message : "Unable to delete pack",
        detail:
          "Packs with purchase or grant history stay protected so commercial records remain intact."
      });
    } finally {
      setIsDeletingPack(false);
    }
  }, [loadDashboard, packPendingDelete]);

  const assetDeleteDescription = useMemo(() => {
    if (!assetPendingDelete) {
      return "Delete this asset from the catalog. This action cannot be undone.";
    }

    const linkedLicenseCount = licenses.filter(
      (license) => license.assetId === assetPendingDelete.id
    ).length;
    const packCoverCount = packs.filter(
      (pack) => pack.coverAssetId === assetPendingDelete.id
    ).length;
    const packInclusionCount = packs.filter((pack) =>
      pack.assets?.some((item) => item.assetId === assetPendingDelete.id)
    ).length;
    const purchaseCount = purchases.filter(
      (purchase) =>
        purchase.assetId === assetPendingDelete.id ||
        purchase.asset?.id === assetPendingDelete.id
    ).length;

    const segments = [];
    if (linkedLicenseCount > 0) segments.push(`${linkedLicenseCount} linked licenses`);
    if (packCoverCount > 0) segments.push(`${packCoverCount} pack covers`);
    if (packInclusionCount > 0) segments.push(`${packInclusionCount} pack inclusions`);
    if (purchaseCount > 0) segments.push(`${purchaseCount} commercial records`);

    return segments.length > 0
      ? `This asset is currently connected to ${formatDependencySummary(
          segments
        )}. CauFlow will block deletion while those dependencies exist.`
      : "This action permanently removes the asset from the creator catalog. This action cannot be undone.";
  }, [assetPendingDelete, licenses, packs, purchases]);

  const licenseDeleteDescription = useMemo(() => {
    if (!licensePendingDelete) {
      return "Delete this rights package from the catalog. This action cannot be undone.";
    }

    const packCount = packs.filter((pack) => pack.licenseId === licensePendingDelete.id).length;
    const purchaseCount = purchases.filter(
      (purchase) => purchase.licenseId === licensePendingDelete.id
    ).length;

    const segments = [];
    if (packCount > 0) segments.push(`${packCount} packs`);
    if (purchaseCount > 0) segments.push(`${purchaseCount} purchase records`);

    return segments.length > 0
      ? `This license is currently referenced by ${formatDependencySummary(
          segments
        )}. Purchased or bundled rights packages cannot be removed.`
      : "This action permanently removes the rights package from the creator catalog. This action cannot be undone.";
  }, [licensePendingDelete, packs, purchases]);

  const packDeleteDescription = useMemo(() => {
    if (!packPendingDelete) {
      return "Delete this pack from the catalog. Existing assets and licenses will stay intact.";
    }

    const purchaseCount = purchases.filter(
      (purchase) => purchase.packId === packPendingDelete.id || purchase.pack?.id === packPendingDelete.id
    ).length;

    return purchaseCount > 0
      ? `This pack is already tied to ${purchaseCount} commercial records. CauFlow will block deletion so purchase and grant history stays intact.`
      : "This action removes the pack and its bundle structure from the catalog. Existing assets and licenses will stay intact.";
  }, [packPendingDelete, purchases]);

  const hasAssetFilters =
    searchQuery.trim().length > 0 ||
    imageFilter !== "all" ||
    sortOrder !== "newest" ||
    assetStatusFilter !== "all";

  const activeWorkflowStep =
    purchases.length > 0 ? 3 : licenses.length > 0 ? 2 : packs.length > 0 ? 1 : 0;

  return (
    <DashboardShell
      assetsCount={assets.length}
      packsCount={packs.length}
      licensesCount={licenses.length}
      totalRevenue={totalRevenue}
      hasError={Boolean(error)}
      activeSection={activeSection}
    >
      <section
        id="overview"
        className="glass-panel surface-highlight rounded-[30px] border border-white/10 p-5 md:p-6 xl:p-7"
      >
        <div className="grid gap-4 lg:gap-5 xl:gap-6 lg:grid-cols-[minmax(0,1.2fr),minmax(320px,0.84fr)] 2xl:grid-cols-[minmax(0,1.28fr),390px]">
          <div className="max-w-3xl self-start">
            <p className="text-xs uppercase tracking-[0.28em] text-sky-200">
              {workspaceSectionMeta[activeSection].eyebrow}
            </p>
            <h1 className="mt-3 font-display text-[2.45rem] font-semibold tracking-tight text-white sm:text-[2.8rem] lg:text-[2.95rem] xl:text-[3.25rem] xl:leading-[1.02]">
              One operating surface for the asset-to-pack-to-license pipeline.
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-200 md:text-base xl:text-lg">
              {workspaceSectionMeta[activeSection].copy} Sales stays in its own dedicated view, so
              this workspace can stay focused on the core creator operation.
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              {(["assets", "packs", "licenses"] as WorkspaceSection[]).map((section) => (
                <a
                  key={section}
                  href={`#${section}`}
                  className={`focus-ring inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs uppercase tracking-[0.18em] transition ${
                    activeSection === section
                      ? "border-sky-300/20 bg-sky-300/[0.1] text-white"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/14 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  {workspaceSectionMeta[section].label}
                </a>
              ))}
            </div>
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
                <span>Packs</span>
                <span>Licenses</span>
                <span>Sales in dedicated view</span>
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
                {workspaceSectionMeta[activeSection].label}
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

        <div className="mt-6">
          <WorkflowRail activeStep={activeWorkflowStep} />
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

      <section className="grid gap-4 lg:grid-cols-4">
        <MetricCard
          label="Assets"
          value={String(assets.length)}
          detail="Curated inventory uploaded into the platform."
          icon={Boxes}
        />
        <MetricCard
          label="Packs"
          value={String(packs.length)}
          detail="Licensable bundled products assembled from multiple assets."
          icon={Box}
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
        className="scroll-mt-6 grid gap-5 2xl:grid-cols-[minmax(520px,0.92fr),minmax(0,1.08fr)]"
      >
        <div className="2xl:sticky 2xl:top-5 2xl:self-start">
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
              statusFilter={assetStatusFilter}
              onStatusFilterChange={setAssetStatusFilter}
              statusCounts={assetStatusCounts}
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
                statusActionAssetId={assetStatusActionId}
                onSelectAsset={(asset) => setSelectedAssetId(asset.id)}
                onStatusAction={(asset) => void handleAssetStatusAction(asset)}
                onDeleteAsset={(asset) => setAssetPendingDelete(asset)}
              />
            ) : (
              <DashboardEmptyState
                icon={SearchX}
                eyebrow={
                  assetStatusFilter === "all" ? "No matches" : `${formatCatalogStatus(assetStatusFilter)} filter`
                }
                title={
                  assetStatusFilter === "all"
                    ? "No assets match the current search and filter set"
                    : `No ${formatCatalogStatus(assetStatusFilter).toLowerCase()} assets yet`
                }
                copy={
                  assetStatusFilter === "all"
                    ? "Adjust the search query, image filter, or sort controls to bring more of the catalog back into view."
                    : `This view only shows ${formatCatalogStatus(assetStatusFilter).toLowerCase()} assets. Change the filter or update item status from the asset drawer to repopulate it.`
                }
                hint={
                  hasAssetFilters
                    ? "Reset filters to restore the full inventory"
                    : "Try another title or description keyword"
                }
              />
            )}
          </div>
        </Card>
      </section>

      <section
        id="packs"
        className="scroll-mt-6 grid gap-5 xl:grid-cols-[minmax(320px,0.84fr),minmax(0,1.16fr)] 2xl:grid-cols-[410px,minmax(0,1fr)]"
      >
        <div className="xl:sticky xl:top-4 2xl:top-5 xl:self-start">
          <PackForm assets={assets} licenses={licenses} onCreated={handlePackCreated} />
        </div>

        <Card className="surface-highlight p-6 md:p-7">
          <SectionHeading
            eyebrow="Packs"
            title="Creative asset packs"
            copy="Group assets into premium commercial bundles with a defined cover, pricing, category, and optional base license."
          />

          <div className="mt-8 space-y-6">
            <CatalogStatusFilter
              value={packStatusFilter}
              onChange={setPackStatusFilter}
              counts={packStatusCounts}
            />

            {loading ? (
              <PanelLoadingState title="packs" />
            ) : assets.length === 0 ? (
              <DashboardEmptyState
                icon={Box}
                eyebrow="Catalog prerequisite"
                title="Upload assets before assembling the first creative pack"
                copy="Packs turn existing inventory into a polished commercial product, so the asset catalog needs at least one record before bundling can begin."
                hint="Seed the asset inventory first, then return here to package it"
              />
            ) : filteredPacks.length > 0 ? (
              <PackList
                packs={filteredPacks}
                selectedPackId={selectedPackId}
                onSelectPack={(pack) => setSelectedPackId(pack.id)}
                onDeletePack={(pack) => setPackPendingDelete(pack)}
              />
            ) : packs.length > 0 ? (
              <DashboardEmptyState
                icon={Box}
                eyebrow={`${formatCatalogStatus(packStatusFilter).toLowerCase()} packs`}
                title={
                  packStatusFilter === "published"
                    ? "No published packs available"
                    : packStatusFilter === "draft"
                      ? "No draft packs yet"
                      : "No archived packs"
                }
                copy="Change the lifecycle filter or update pack status from the detail drawer to manage what stays live, paused, or retained for history."
                hint="Use the pack detail drawer to publish, unpublish, archive, or restore"
              />
            ) : (
              <DashboardEmptyState
                icon={Box}
                eyebrow="No creative packs yet"
                title="Productized bundles will appear here once the first pack is assembled"
                copy="Use the pack builder to group assets, choose a cover, attach optional licensing context, and publish a more valuable commercial product."
                hint="Start by selecting multiple assets and setting a cover"
              />
            )}
          </div>
        </Card>
      </section>

      <section id="licenses" className="scroll-mt-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.82fr),minmax(0,1.18fr)] 2xl:grid-cols-[390px,minmax(0,1fr)]">
          <div className="xl:sticky xl:top-4 xl:self-start">
            <LicenseForm assets={assets} onCreated={handleLicenseCreated} />
          </div>

          <div className="space-y-6">
            {loading ? (
              <PanelLoadingState title="licenses" />
            ) : licenses.length > 0 ? (
              <Card className="surface-highlight p-6">
                <div className="space-y-6">
                  <SectionHeading
                    eyebrow="Licenses"
                    title="Rights catalog"
                    copy="Filter commercial terms by lifecycle state so you can see what buyers can purchase now, what still needs review, and what you have retained for history."
                  />

                  <CatalogStatusFilter
                    value={licenseStatusFilter}
                    onChange={setLicenseStatusFilter}
                    counts={licenseStatusCounts}
                  />

                  {filteredLicenses.length > 0 ? (
                    <LicenseList
                      licenses={filteredLicenses}
                      assets={assets}
                      purchases={purchases}
                      selectedLicenseId={selectedLicenseId}
                      statusActionLicenseId={licenseStatusActionId}
                      onSelectLicense={(license) => setSelectedLicenseId(license.id)}
                      onStatusAction={(license) => void handleLicenseStatusAction(license)}
                      onDeleteLicense={(license) => setLicensePendingDelete(license)}
                    />
                  ) : (
                    <DashboardEmptyState
                      icon={ShieldCheck}
                      eyebrow={`${formatCatalogStatus(licenseStatusFilter).toLowerCase()} licenses`}
                      title={
                        licenseStatusFilter === "published"
                          ? "No published licenses available"
                          : licenseStatusFilter === "draft"
                            ? "No draft licenses yet"
                            : "No archived licenses"
                      }
                      copy="Adjust the lifecycle filter or update a rights package status to bring the relevant commercial records back into view."
                      hint="Use quick actions or open a license detail drawer for full lifecycle control"
                    />
                  )}
                </div>
              </Card>
            ) : (
              <Card className="p-6">
                <DashboardEmptyState
                  icon={ShieldCheck}
                  eyebrow="No license packages yet"
                  title="Rights packages will appear here once commercial terms are defined"
                  copy="Create a license from an uploaded asset to establish usage scope, pricing, and the record buyers will transact against."
                  hint="Start by defining the first rights package from the form beside this panel"
                />
              </Card>
            )}

            <Card className="surface-highlight p-6">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Commercial trail
              </p>
              <h3 className="mt-3 font-display text-2xl text-white">Sales now live in their own view</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Purchases and revenue reporting are kept in the dedicated Sales area so this workspace
                can stay tightly focused on creating inventory, packaging bundles, and defining rights.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-300">
                Open Sales from the creator navigation
                <ArrowUpRight className="h-3.5 w-3.5 text-sky-200" />
              </div>
            </Card>
          </div>
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

      <LicenseDetailDrawer
        licenseId={selectedLicenseId}
        assets={assets}
        purchases={purchases}
        isDeleting={isDeletingLicense}
        onClose={() => setSelectedLicenseId(null)}
        onDeleteRequest={(license) => setLicensePendingDelete(license)}
        onLicenseUpdated={handleLicenseUpdated}
      />

      <PackDetailDrawer
        packId={selectedPackId}
        assets={assets}
        licenses={licenses}
        isDeleting={isDeletingPack}
        onClose={() => setSelectedPackId(null)}
        onDeleteRequest={(pack) => setPackPendingDelete(pack)}
        onPackUpdated={handlePackUpdated}
      />

      <ConfirmDialog
        open={Boolean(assetPendingDelete)}
        title={assetPendingDelete ? `Delete ${assetPendingDelete.title}?` : "Delete asset?"}
        description={assetDeleteDescription}
        confirmLabel="Delete asset"
        isConfirming={isDeletingAsset}
        onClose={() => {
          if (!isDeletingAsset) {
            setAssetPendingDelete(null);
          }
        }}
        onConfirm={() => void handleDeleteAsset()}
      />

      <ConfirmDialog
        open={Boolean(licensePendingDelete)}
        title={
          licensePendingDelete
            ? `Delete ${licensePendingDelete.type} license?`
            : "Delete license?"
        }
        description={licenseDeleteDescription}
        confirmLabel="Delete license"
        isConfirming={isDeletingLicense}
        onClose={() => {
          if (!isDeletingLicense) {
            setLicensePendingDelete(null);
          }
        }}
        onConfirm={() => void handleDeleteLicense()}
      />

      <ConfirmDialog
        open={Boolean(packPendingDelete)}
        title={packPendingDelete ? `Delete ${packPendingDelete.title}?` : "Delete pack?"}
        description={packDeleteDescription}
        confirmLabel="Delete pack"
        isConfirming={isDeletingPack}
        onClose={() => {
          if (!isDeletingPack) {
            setPackPendingDelete(null);
          }
        }}
        onConfirm={() => void handleDeletePack()}
      />

    </DashboardShell>
  );
}
